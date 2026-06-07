'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table'
import { ArrowLeft, BarChart3, Download, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface SummaryRow {
  report_date: string
  sub_item: string
  construction_area: string
  sub_item_id: number
  item_name: string
  unit: string
  total_qty: number
  points_per_unit: number
}

interface SummaryFilters {
  from: string
  to: string
  month: string
}

interface ExportItemRow {
  constructionArea: string
  itemName: string
  quantity: number
  pointsPerUnit: number
  totalPoints: number
}

interface ExportSection {
  subItem: string
  rows: ExportItemRow[]
  totalPoints: number
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误'
}

function getInitialFilters(): SummaryFilters {
  if (typeof window === 'undefined') return { from: '', to: '', month: '' }

  const params = new URLSearchParams(window.location.search)
  const month = params.get('month') || ''
  if (month) return { from: '', to: '', month }

  return {
    from: params.get('from') || '',
    to: params.get('to') || '',
    month: '',
  }
}

function buildSummaryParams(filters: SummaryFilters) {
  const params = new URLSearchParams()

  if (filters.month) {
    params.set('month', filters.month)
    return params
  }

  if (filters.from) params.set('from', filters.from)
  if (filters.to) params.set('to', filters.to)

  return params
}

function buildSummaryUrl(filters: SummaryFilters) {
  const params = buildSummaryParams(filters)
  const query = params.toString()
  return '/api/summary' + (query ? `?${query}` : '')
}

function replaceUrl(filters: SummaryFilters) {
  if (typeof window === 'undefined') return

  const params = buildSummaryParams(filters)
  const query = params.toString()
  const newUrl = window.location.pathname + (query ? `?${query}` : '')
  window.history.replaceState(null, '', newUrl)
}

function getPeriodLabel(filters: SummaryFilters) {
  if (filters.month) return `${Number(filters.month.slice(5, 7))}月份`
  if (filters.from && filters.to) return `${filters.from}至${filters.to}`
  if (filters.from) return `${filters.from}起`
  if (filters.to) return `截至${filters.to}`
  return '全部'
}

function getFilePeriod(filters: SummaryFilters) {
  if (filters.month) return filters.month
  if (filters.from && filters.to) return `${filters.from}_${filters.to}`
  if (filters.from) return `${filters.from}_起`
  if (filters.to) return `截至_${filters.to}`
  return '全部'
}

function roundTo(value: number, digits: number) {
  const factor = 10 ** digits
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function fallbackText(value: string, fallback: string) {
  return value.trim() || fallback
}

function buildExportSections(rows: SummaryRow[]) {
  const sections = new Map<string, {
    subItem: string
    items: Map<string, ExportItemRow>
  }>()

  rows.forEach((row) => {
    const subItem = fallbackText(row.sub_item, '未填写子项')
    const constructionArea = fallbackText(row.construction_area, '未填写施工区域')
    const sectionKey = subItem
    const itemKey = `${constructionArea}\u001f${row.sub_item_id || row.item_name}`
    const quantity = Number(row.total_qty) || 0
    const pointsPerUnit = Number(row.points_per_unit) || 0
    const totalPoints = quantity * pointsPerUnit

    let section = sections.get(sectionKey)
    if (!section) {
      section = { subItem, items: new Map() }
      sections.set(sectionKey, section)
    }

    const existing = section.items.get(itemKey)
    if (existing) {
      existing.quantity += quantity
      existing.totalPoints += totalPoints
      return
    }

    section.items.set(itemKey, {
      constructionArea,
      itemName: fallbackText(row.item_name, '未命名工作项'),
      quantity,
      pointsPerUnit,
      totalPoints,
    })
  })

  return Array.from(sections.values())
    .map<ExportSection>((section) => {
      const itemRows = Array.from(section.items.values())
        .sort((a, b) => (
          a.constructionArea.localeCompare(b.constructionArea, 'zh-CN')
          || a.itemName.localeCompare(b.itemName, 'zh-CN')
        ))

      return {
        subItem: section.subItem,
        rows: itemRows,
        totalPoints: itemRows.reduce((sum, row) => sum + row.totalPoints, 0),
      }
    })
    .sort((a, b) => a.subItem.localeCompare(b.subItem, 'zh-CN'))
}

function buildWorkbook(rows: SummaryRow[], filters: SummaryFilters) {
  const sections = buildExportSections(rows)
  const periodLabel = getPeriodLabel(filters)
  const sheetRows: (string | number)[][] = []
  const merges: XLSX.Range[] = []
  const exportName = 'IED'

  sections.forEach((section, index) => {
    if (index > 0) sheetRows.push([])

    const titleRowIndex = sheetRows.length
    sheetRows.push([`${section.subItem} ${exportName} ${periodLabel}工作量`])
    merges.push({ s: { r: titleRowIndex, c: 0 }, e: { r: titleRowIndex, c: 4 } })

    sheetRows.push(['区域', '工作项', '工作量', '工作项目点数', '工作点数'])
    section.rows.forEach((row) => {
      sheetRows.push([
        row.constructionArea,
        row.itemName,
        roundTo(row.quantity, 1),
        roundTo(row.pointsPerUnit, 1),
        roundTo(row.totalPoints, 1),
      ])
    })

    const totalRowIndex = sheetRows.length
    sheetRows.push([`${periodLabel}总工作点数：${section.totalPoints.toFixed(2)}`])
    merges.push({ s: { r: totalRowIndex, c: 0 }, e: { r: totalRowIndex, c: 4 } })
  })

  const worksheet = XLSX.utils.aoa_to_sheet(sheetRows)
  worksheet['!cols'] = [{ wch: 12 }, { wch: 18 }, { wch: 12 }, { wch: 14 }, { wch: 12 }]
  worksheet['!merges'] = merges

  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, '工程量统计')

  return workbook
}

export default function SummaryPage() {
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [filters, setFilters] = useState<SummaryFilters>(() => getInitialFilters())

  const fetchSummary = useCallback(async (activeFilters: SummaryFilters) => {
    const res = await fetch(buildSummaryUrl(activeFilters))
    const data = await res.json()

    if (!res.ok) {
      throw new Error(data?.error || '加载失败')
    }

    return data as SummaryRow[]
  }, [])

  const loadSummary = useCallback(async (activeFilters: SummaryFilters) => {
    setLoading(true)
    try {
      const data = await fetchSummary(activeFilters)
      setRows(data)
      replaceUrl(activeFilters)
    } catch (err: unknown) {
      toast.error('加载失败: ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [fetchSummary])

  useEffect(() => {
    const initialFilters = getInitialFilters()
    queueMicrotask(() => {
      setFilters(initialFilters)
      void loadSummary(initialFilters)
    })
  }, [loadSummary])

  const grandTotal = useMemo(
    () => rows.reduce((sum, row) => sum + row.total_qty * row.points_per_unit, 0),
    [rows],
  )

  function updateFrom(value: string) {
    setFilters((prev) => ({ ...prev, from: value, month: '' }))
  }

  function updateTo(value: string) {
    setFilters((prev) => ({ ...prev, to: value, month: '' }))
  }

  function updateMonth(value: string) {
    setFilters({ from: '', to: '', month: value })
  }

  function clearFilters() {
    const emptyFilters = { from: '', to: '', month: '' }
    setFilters(emptyFilters)
    void loadSummary(emptyFilters)
  }

  async function exportExcel() {
    setExporting(true)
    try {
      const latestRows = await fetchSummary(filters)
      setRows(latestRows)
      replaceUrl(filters)

      if (!latestRows.length) {
        toast.error('暂无数据可导出')
        return
      }

      const workbook = buildWorkbook(latestRows, filters)
      XLSX.writeFile(workbook, `工程量统计_${getFilePeriod(filters)}.xlsx`)
      toast.success('导出成功')
    } catch (err: unknown) {
      toast.error('导出失败: ' + getErrorMessage(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/"><Button variant="ghost" size="icon" aria-label="返回首页"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          <h1 className="text-xl font-bold">统计汇总</h1>
        </div>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <Label className="text-xs">月份</Label>
              <Input type="month" value={filters.month} onChange={(e) => updateMonth(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">开始日期</Label>
              <Input type="date" value={filters.from} onChange={(e) => updateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">结束日期</Label>
              <Input type="date" value={filters.to} onChange={(e) => updateTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => { void loadSummary(filters) }} disabled={loading}>
              <Search className="h-4 w-4 mr-1" />{loading ? '查询中…' : '查询'}
            </Button>
            <Button variant="outline" onClick={exportExcel} disabled={exporting}>
              <Download className="h-4 w-4 mr-1" />{exporting ? '导出中…' : '导出 Excel'}
            </Button>
            <Button variant="ghost" onClick={clearFilters} disabled={loading || exporting}>
              <X className="h-4 w-4 mr-1" />清空
            </Button>
          </div>
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-3 mb-4">
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold text-green-600">{grandTotal.toFixed(1)}</div>
              <div className="text-xs text-muted-foreground">总工分</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-3 text-center">
              <div className="text-2xl font-bold">{rows.length}</div>
              <div className="text-xs text-muted-foreground">记录条数</div>
            </CardContent>
          </Card>
        </div>
      )}

      {loading ? (
        <div className="text-center text-muted-foreground py-12">加载中…</div>
      ) : rows.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">暂无数据</div>
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>日期</TableHead>
                    <TableHead>子项</TableHead>
                    <TableHead>区域</TableHead>
                    <TableHead>工作项</TableHead>
                    <TableHead className="text-right">数量</TableHead>
                    <TableHead>单位</TableHead>
                    <TableHead className="text-right">单价</TableHead>
                    <TableHead className="text-right">小计</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r, idx) => {
                    const sub = r.total_qty * r.points_per_unit
                    return (
                      <TableRow key={`${r.report_date}-${r.sub_item}-${r.construction_area}-${r.sub_item_id}-${idx}`}>
                        <TableCell>{r.report_date}</TableCell>
                        <TableCell>{r.sub_item}</TableCell>
                        <TableCell>{r.construction_area}</TableCell>
                        <TableCell>{r.item_name}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.total_qty.toFixed(1)}</TableCell>
                        <TableCell>{r.unit}</TableCell>
                        <TableCell className="text-right tabular-nums">{r.points_per_unit.toFixed(1)}</TableCell>
                        <TableCell className="text-right tabular-nums font-semibold text-primary">{sub.toFixed(1)}</TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={7} className="text-right font-bold">总计</TableCell>
                    <TableCell className="text-right tabular-nums font-bold text-primary">{grandTotal.toFixed(1)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
