'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter,
} from '@/components/ui/table'
import { ArrowLeft, Download, Search } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
import * as XLSX from 'xlsx'

interface SummaryRow {
  report_date: string
  area: string
  group_leader: string
  work_item_id: number
  item_name: string
  unit: string
  total_qty: number
  points_per_unit: number
}

export default function SummaryPage() {
  const [rows, setRows] = useState<SummaryRow[]>([])
  const [loading, setLoading] = useState(false)
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('from')) setFrom(params.get('from')!)
    if (params.get('to')) setTo(params.get('to')!)
    const f = params.get('from') || ''
    const t = params.get('to') || ''
    if (f || t) loadSummary(f, t)
  }, [])

  async function loadSummary(f?: string, t?: string) {
    const fromVal = f ?? from
    const toVal = t ?? to
    setLoading(true)
    const qs: string[] = []
    if (fromVal) qs.push('from=' + encodeURIComponent(fromVal))
    if (toVal) qs.push('to=' + encodeURIComponent(toVal))
    const url = '/api/summary' + (qs.length ? '?' + qs.join('&') : '')

    // update URL
    const newUrl = window.location.pathname + (qs.length ? '?' + qs.join('&') : '')
    window.history.replaceState(null, '', newUrl)

    try {
      const res = await fetch(url)
      setRows(await res.json())
    } catch (err: any) {
      toast.error('加载失败: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const grandTotal = rows.reduce((s, r) => s + r.total_qty * r.points_per_unit, 0)

  function exportExcel() {
    if (!rows.length) { toast.error('暂无数据'); return }

    const data = rows.map((r) => ({
      日期: r.report_date,
      区域: r.area,
      组长: r.group_leader,
      工项: r.item_name,
      数量: r.total_qty,
      单位: r.unit,
      单价: r.points_per_unit,
      小计: +(r.total_qty * r.points_per_unit).toFixed(1),
    }))

    // Add total row
    data.push({
      日期: '',
      区域: '',
      组长: '',
      工项: '合计',
      数量: 0,
      单位: '',
      单价: 0,
      小计: +grandTotal.toFixed(1),
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '工作量汇总')

    // Auto column width
    const colWidths = Object.keys(data[0]).map((key) => ({
      wch: Math.max(key.length * 2, ...data.map((d) => String((d as any)[key]).length + 2)),
    }))
    ws['!cols'] = colWidths

    const dateRange = from && to ? `${from}_${to}` : new Date().toISOString().slice(0, 10)
    XLSX.writeFile(wb, `工作量汇总_${dateRange}.xlsx`)
    toast.success('导出成功')
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">📊 统计汇总</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex gap-3 items-end flex-wrap">
            <div>
              <Label className="text-xs">开始日期</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <Label className="text-xs">结束日期</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-40" />
            </div>
            <Button onClick={() => loadSummary()}><Search className="h-4 w-4 mr-1" />查询</Button>
            <Button variant="outline" onClick={exportExcel} disabled={!rows.length}>
              <Download className="h-4 w-4 mr-1" />导出 Excel
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Totals bar */}
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

      {/* Table */}
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
                    <TableHead>区域</TableHead>
                    <TableHead>组长</TableHead>
                    <TableHead>工项</TableHead>
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
                      <TableRow key={idx}>
                        <TableCell>{r.report_date}</TableCell>
                        <TableCell>{r.area}</TableCell>
                        <TableCell>{r.group_leader}</TableCell>
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
