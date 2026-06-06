'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { Plus, X, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface WorkItem {
  id: number
  name: string
  unit: string
  points_per_unit: number
  is_active: boolean
}

interface SelectedWorkItem {
  id: number
  name: string
  unit: string
  points_per_unit: number
  quantity: number
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误'
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function ReportPage() {
  const router = useRouter()
  const [items, setItems] = useState<WorkItem[]>([])
  const [selectedItems, setSelectedItems] = useState<SelectedWorkItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [qty, setQty] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dateRef = todayStr()
  const [form, setForm] = useState({
    report_date: dateRef,
    sub_item: '',
    construction_area: '',
  })

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast.error('加载工作项失败'))
  }, [])

  const activeItems = items.filter((i) => i.is_active)

  function addItem() {
    const id = parseInt(selectedId)
    const q = parseFloat(qty)
    if (!id) { toast.error('请选择工作项'); return }
    if (!q || q <= 0) { toast.error('请输入有效数量'); return }

    const item = items.find((i) => i.id === id)
    if (!item) return

    setSelectedItems((prev) => {
      const existing = prev.find((s) => s.id === id)
      if (existing) {
        return prev.map((s) => s.id === id ? { ...s, quantity: s.quantity + q } : s)
      }
      return [...prev, { id: item.id, name: item.name, unit: item.unit, points_per_unit: item.points_per_unit, quantity: q }]
    })
    setQty('')
    setSelectedId('')
    toast.success('已添加')
  }

  function removeItem(index: number) {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index))
  }

  const grandTotal = selectedItems.reduce((s, item) => s + item.quantity * item.points_per_unit, 0)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmedSubItem = form.sub_item.trim()
    const trimmedConstructionArea = form.construction_area.trim()
    if (!trimmedSubItem) { toast.error('请输入子项'); return }
    if (!trimmedConstructionArea) { toast.error('请输入施工区域'); return }
    if (!selectedItems.length) { toast.error('请至少添加一个工作项'); return }

    setSubmitting(true)
    try {
      const body = {
        ...form,
        sub_item: trimmedSubItem,
        construction_area: trimmedConstructionArea,
        work_items: selectedItems.map((s) => ({ work_item_id: s.id, quantity: s.quantity })),
      }
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('提交失败')
      toast.success('提交成功 ✅')
      router.push('/')
    } catch (err: unknown) {
      toast.error('提交失败: ' + getErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">✏️ 填写日报</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr_1.2fr_112px_auto] md:items-end">
              <div>
                <Label>日期</Label>
                <Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
              </div>
              <div>
                <Label>子项</Label>
                <Input placeholder="如 一层东区" value={form.sub_item} onChange={(e) => setForm({ ...form, sub_item: e.target.value })} required />
              </div>
              <div>
                <Label>施工区域</Label>
                <Input placeholder="如 中压配电室" value={form.construction_area} onChange={(e) => setForm({ ...form, construction_area: e.target.value })} required />
              </div>
              <div>
                <Label>工作项</Label>
                <select
                  className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">{activeItems.length ? '— 选择工作项 —' : '暂无启用工作项'}</option>
                  {activeItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit} · {i.points_per_unit.toFixed(1)}分)
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label>数量</Label>
                <Input type="number" step="0.1" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <Button type="button" onClick={addItem} className="h-9">
                <Plus className="h-4 w-4 mr-1" />添加
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">工作项</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {selectedItems.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-md">
                请从上方选择工作项并添加
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((s, idx) => {
                  const sub = s.quantity * s.points_per_unit
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                      <span className="font-medium flex-1">{s.name}</span>
                      <span className="text-muted-foreground">
                        {s.quantity.toFixed(1)} {s.unit} × {s.points_per_unit.toFixed(1)}
                      </span>
                      <Badge variant="secondary" className="font-bold">{sub.toFixed(1)} 分</Badge>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(idx)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
                <Separator />
                <div className="flex justify-between items-center px-2">
                  <span className="text-sm font-medium">合计</span>
                  <span className="text-lg font-bold text-primary">{grandTotal.toFixed(1)} 分</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting} size="lg">
          {submitting ? '提交中…' : '提交日报'}
        </Button>
      </form>
    </div>
  )
}
