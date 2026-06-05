'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, Trash2, MapPin, Calendar, Send } from 'lucide-react'
import { toast } from 'sonner'

interface Report {
  id: number
  report_date: string
  area: string
  total_points: number
}

interface Stats {
  daily: { report_date: string; report_count: number; total_points: number }[]
  by_area: { area: string; report_count: number; total_points: number }[]
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '未知错误'
}

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export default function HomePage() {
  const [reports, setReports] = useState<Report[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [sendingToday, setSendingToday] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const [rRes, sRes] = await Promise.all([fetch('/api/reports'), fetch('/api/stats')])
      setReports(await rRes.json())
      setStats(await sRes.json())
    } catch (err: unknown) {
      toast.error('加载失败: ' + getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => { void loadData() })
  }, [loadData])

  async function deleteReport(id: number) {
    if (!confirm('确认删除这条日报？')) return
    try {
      await fetch(`/api/reports/${id}`, { method: 'DELETE' })
      toast.success('已删除')
      loadData()
    } catch { toast.error('删除失败') }
  }

  async function sendTodayWechat() {
    setSendingToday(true)
    try {
      const res = await fetch('/api/wechat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '发送失败')
      toast.success('今日工作量已发送')
    } catch (err: unknown) {
      toast.error(getErrorMessage(err))
    } finally {
      setSendingToday(false)
    }
  }

  const today = todayStr()
  const todayStat = stats?.daily.find((d) => d.report_date === today)
  const totalCount = stats?.daily.reduce((s, d) => s + d.report_count, 0) ?? 0
  const totalPoints = stats?.daily.reduce((s, d) => s + d.total_points, 0) ?? 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold">📋 今日日报</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={sendTodayWechat} disabled={sendingToday || !reports.length}>
            <Send className="h-4 w-4 mr-1" />{sendingToday ? '发送中…' : '发送今日'}
          </Button>
          <Link href="/report">
            <Button size="sm"><Plus className="h-4 w-4 mr-1" />填写</Button>
          </Link>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{todayStat?.report_count ?? 0}</div>
            <div className="text-xs text-muted-foreground">今日报工</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{todayStat?.total_points.toFixed(1) ?? '0'}</div>
            <div className="text-xs text-muted-foreground">今日工分</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalCount}</div>
            <div className="text-xs text-muted-foreground">累计报工</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3 text-center">
            <div className="text-2xl font-bold text-primary">{totalPoints.toFixed(1)}</div>
            <div className="text-xs text-muted-foreground">累计工分</div>
          </CardContent>
        </Card>
      </div>

      {/* Report list */}
      {loading ? (
        <div className="text-center text-muted-foreground py-12">加载中…</div>
      ) : reports.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">今日暂无日报记录，点击「填写」开始</div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <Card key={r.id}>
              <CardContent className="p-4">
                <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-2">
                  <span className="flex items-center gap-1"><Calendar className="h-3.5 w-3.5" />{r.report_date}</span>
                  <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{r.area || '未填写区域'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary" className="text-base font-bold px-3 py-1">
                    {r.total_points.toFixed(1)} 点
                  </Badge>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => deleteReport(r.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
