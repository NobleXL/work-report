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

interface SelectedItem {
  id: number
  name: string
  unit: string
  points_per_unit: number
  area: string
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
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [area, setArea] = useState('')
  const [qty, setQty] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const dateRef = todayStr()
  const [form, setForm] = useState({
    report_date: dateRef,
  })

  useEffect(() => {
    fetch('/api/items')
      .then((r) => r.json())
      .then(setItems)
      .catch(() => toast.error('加载工项失败'))
  }, [])

  const activeItems = items.filter((i) => i.is_active)

  function addItem() {
    const id = parseInt(selectedId)
    const q = parseFloat(qty)
    const trimmedArea = area.trim()
    if (!id) { toast.error('请选择工项'); return }
    if (!trimmedArea) { toast.error('请输入施工区域'); return }
    if (!q || q <= 0) { toast.error('请输入有效数量'); return }

    const item = items.find((i) => i.id === id)
    if (!item) return

    setSelectedItems((prev) => {
      const existing = prev.find((s) => s.id === id && s.area === trimmedArea)
      if (existing) {
        return prev.map((s) => s.id === id && s.area === trimmedArea ? { ...s, quantity: s.quantity + q } : s)
      }
      return [...prev, { id: item.id, name: item.name, unit: item.unit, points_per_unit: item.points_per_unit, area: trimmedArea, quantity: q }]
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
    if (!selectedItems.length) { toast.error('请至少添加一个工分项'); return }

    setSubmitting(true)
    try {
      const body = {
        ...form,
        work_items: selectedItems.map((s) => ({ item_id: s.id, area: s.area, quantity: s.quantity })),
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
            <div>
              <Label>日期</Label>
              <Input type="date" value={form.report_date} onChange={(e) => setForm({ ...form, report_date: e.target.value })} required />
            </div>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardHeader className="pb-2 pt-4 px-4">
            <CardTitle className="text-base">工分项</CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-2">
            {/* Add work item row */}
            <div className="flex gap-2 items-end flex-wrap mb-3">
              <div className="flex-1 min-w-[160px]">
                <Label className="text-xs">选择工项</Label>
                <select
                  className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                  value={selectedId}
                  onChange={(e) => setSelectedId(e.target.value)}
                >
                  <option value="">— 选择工项 —</option>
                  {activeItems.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.name} ({i.unit} · {i.points_per_unit.toFixed(1)}分)
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs">施工区域</Label>
                <Input placeholder="如 2BDG2A 1-3" value={area} onChange={(e) => setArea(e.target.value)} />
              </div>
              <div className="w-24">
                <Label className="text-xs">数量</Label>
                <Input type="number" step="0.1" min="0" value={qty} onChange={(e) => setQty(e.target.value)} />
              </div>
              <Button type="button" onClick={addItem} className="h-9">
                <Plus className="h-4 w-4 mr-1" />添加
              </Button>
            </div>

            {/* Selected items list */}
            {selectedItems.length === 0 ? (
              <div className="text-center text-sm text-muted-foreground py-6 border border-dashed rounded-md">
                请从上方选择工项并添加
              </div>
            ) : (
              <div className="space-y-2">
                {selectedItems.map((s, idx) => {
                  const sub = s.quantity * s.points_per_unit
                  return (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-muted rounded-md text-sm">
                      <div className="font-medium flex-1 min-w-0">
                        <div>{s.name}</div>
                        <div className="text-xs text-muted-foreground truncate">{s.area}</div>
                      </div>
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
