'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog'
import { ArrowLeft, Plus, Pencil, Power, PowerOff } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'

interface SubItem {
  id: number
  name: string
  unit: string
  points_per_unit: number
  sort_order: number
  is_active: boolean
}

export default function ItemsPage() {
  const [items, setItems] = useState<SubItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<number | null>(null)
  const [editName, setEditName] = useState('')
  const [editUnit, setEditUnit] = useState('')
  const [editPoints, setEditPoints] = useState('')
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState('')
  const [newPoints, setNewPoints] = useState('')

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    setLoading(true)
    try {
      const res = await fetch('/api/items')
      setItems(await res.json())
    } catch { toast.error('加载失败') }
    finally { setLoading(false) }
  }

  async function addItem() {
    const p = parseFloat(newPoints)
    if (!newName || !newUnit || isNaN(p)) { toast.error('请完整填写'); return }
    try {
      await fetch('/api/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName, unit: newUnit, points_per_unit: p }),
      })
      setNewName(''); setNewUnit(''); setNewPoints('')
      toast.success('已添加')
      loadItems()
    } catch { toast.error('添加失败') }
  }

  function openEdit(item: SubItem) {
    setEditId(item.id)
    setEditName(item.name)
    setEditUnit(item.unit)
    setEditPoints(String(item.points_per_unit))
  }

  async function saveEdit() {
    const p = parseFloat(editPoints)
    if (!editName || !editUnit || isNaN(p)) { toast.error('请完整填写'); return }
    try {
      await fetch(`/api/items/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName, unit: editUnit, points_per_unit: p }),
      })
      toast.success('已更新')
      setEditId(null)
      loadItems()
    } catch { toast.error('更新失败') }
  }

  async function toggleItem(id: number) {
    try {
      await fetch(`/api/items/${id}`, { method: 'POST' })
      loadItems()
    } catch { toast.error('操作失败') }
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <Link href="/"><Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button></Link>
        <h1 className="text-xl font-bold">⚙ 子项管理</h1>
      </div>

      <Card>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-4">
            在这里添加、编辑、启用/禁用子项。被禁用的子项在填写日报时不显示。
          </p>

          {loading ? (
            <div className="text-center text-muted-foreground py-8">加载中…</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>名称</TableHead>
                  <TableHead>单位</TableHead>
                  <TableHead className="text-right">工分</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={item.id} className={!item.is_active ? 'opacity-50' : ''}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.unit}</TableCell>
                    <TableCell className="text-right">{item.points_per_unit.toFixed(1)}</TableCell>
                    <TableCell>
                      <Badge variant={item.is_active ? 'default' : 'secondary'}>
                        {item.is_active ? '启用' : '禁用'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEdit(item)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => toggleItem(item.id)}>
                          {item.is_active ? <PowerOff className="h-3.5 w-3.5" /> : <Power className="h-3.5 w-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          <div className="flex gap-2 mt-4 pt-4 border-t flex-wrap">
            <Input placeholder="子项名称" value={newName} onChange={(e) => setNewName(e.target.value)} className="flex-1 min-w-[100px]" />
            <Input placeholder="单位" value={newUnit} onChange={(e) => setNewUnit(e.target.value)} className="w-20" />
            <Input type="number" step="0.1" placeholder="工分" value={newPoints} onChange={(e) => setNewPoints(e.target.value)} className="w-24" />
            <Button onClick={addItem}><Plus className="h-4 w-4 mr-1" />添加</Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editId !== null} onOpenChange={(open) => { if (!open) setEditId(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑子项</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div><Label>名称</Label><Input value={editName} onChange={(e) => setEditName(e.target.value)} /></div>
            <div><Label>单位</Label><Input value={editUnit} onChange={(e) => setEditUnit(e.target.value)} /></div>
            <div><Label>工分/单位</Label><Input type="number" step="0.1" value={editPoints} onChange={(e) => setEditPoints(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditId(null)}>取消</Button>
            <Button onClick={saveEdit}>保存</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
