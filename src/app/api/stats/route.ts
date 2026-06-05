import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface SubItemRef {
  points_per_unit?: number | string | null
}

interface ReportSubItemRef {
  quantity: number | string
  sub_items?: SubItemRef | SubItemRef[] | null
}

export async function GET() {
  // Daily stats: last 30 days
  const { data: daily } = await supabase
    .from('daily_reports')
    .select('id, report_date, report_sub_items(quantity, sub_items(points_per_unit))')
    .order('report_date', { ascending: false })
    .limit(500)

  const dailyStats: Record<string, { report_count: number; total_points: number }> = {}
  for (const r of (daily || [])) {
    const key = r.report_date
    if (!dailyStats[key]) dailyStats[key] = { report_count: 0, total_points: 0 }
    dailyStats[key].report_count += 1
    for (const ri of (r.report_sub_items || [])) {
      const item = ri as ReportSubItemRef
      const ppus = item.sub_items
      const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
      dailyStats[key].total_points += Number(item.quantity) * Number(ppu ?? 0)
    }
  }

  const dailyArr = Object.entries(dailyStats)
    .map(([date, v]) => ({ report_date: date, ...v }))
    .sort((a, b) => b.report_date.localeCompare(a.report_date))
    .slice(0, 30)

  // ConstructionArea stats
  const { data: construction_areaData } = await supabase
    .from('daily_reports')
    .select('id, construction_area, report_sub_items(quantity, sub_items(points_per_unit))')

  const construction_areaStats: Record<string, { report_count: number; total_points: number }> = {}
  for (const r of (construction_areaData || [])) {
    const construction_area = r.construction_area || '未填写区域'
    if (!construction_areaStats[construction_area]) construction_areaStats[construction_area] = { report_count: 0, total_points: 0 }
    construction_areaStats[construction_area].report_count += 1
    for (const ri of (r.report_sub_items || [])) {
      const item = ri as ReportSubItemRef
      const ppus = item.sub_items
      const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
      construction_areaStats[construction_area].total_points += Number(item.quantity) * Number(ppu ?? 0)
    }
  }

  const byConstructionArea = Object.entries(construction_areaStats)
    .map(([construction_area, v]) => ({ construction_area, ...v }))
    .sort((a, b) => b.total_points - a.total_points)

  return NextResponse.json({ daily: dailyArr, by_construction_area: byConstructionArea })
}
