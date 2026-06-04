import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  // Daily stats: last 30 days
  const { data: daily } = await supabase
    .from('daily_reports')
    .select('id, report_date, report_work_items(quantity, work_items(points_per_unit))')
    .order('report_date', { ascending: false })
    .limit(500)

  const dailyStats: Record<string, { report_count: number; total_points: number }> = {}
  for (const r of (daily || [])) {
    const key = r.report_date
    if (!dailyStats[key]) dailyStats[key] = { report_count: 0, total_points: 0 }
    dailyStats[key].report_count += 1
    for (const ri of (r.report_work_items || [])) {
      const ppus = ri.work_items as any
      const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
      dailyStats[key].total_points += Number(ri.quantity) * Number(ppu ?? 0)
    }
  }

  const dailyArr = Object.entries(dailyStats)
    .map(([date, v]) => ({ report_date: date, ...v }))
    .sort((a, b) => b.report_date.localeCompare(a.report_date))
    .slice(0, 30)

  // Area stats
  const { data: areaData } = await supabase
    .from('daily_reports')
    .select('id, area, report_work_items(quantity, work_items(points_per_unit))')

  const areaStats: Record<string, { report_count: number; total_points: number }> = {}
  for (const r of (areaData || [])) {
    if (!areaStats[r.area]) areaStats[r.area] = { report_count: 0, total_points: 0 }
    areaStats[r.area].report_count += 1
    for (const ri of (r.report_work_items || [])) {
      const ppus = ri.work_items as any
      const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
      areaStats[r.area].total_points += Number(ri.quantity) * Number(ppu ?? 0)
    }
  }

  const byArea = Object.entries(areaStats)
    .map(([area, v]) => ({ area, ...v }))
    .sort((a, b) => b.total_points - a.total_points)

  return NextResponse.json({ daily: dailyArr, by_area: byArea })
}
