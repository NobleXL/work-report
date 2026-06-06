import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface WorkItemRef {
  name?: string | null
  unit?: string | null
  points_per_unit?: number | string | null
}

interface DailyReportRef {
  report_date?: string | null
  sub_item?: string | null
  construction_area?: string | null
}

interface SummaryWorkItemRef {
  quantity: number | string
  sub_item_id: number
  sub_items?: WorkItemRef | WorkItemRef[] | null
  daily_reports?: DailyReportRef | DailyReportRef[] | null
}

export async function GET(req: NextRequest) {
  const from = req.nextUrl.searchParams.get('from')
  const to = req.nextUrl.searchParams.get('to')

  let reportIds: number[] | null = null

  if (from || to) {
    let idQuery = supabase.from('daily_reports').select('id')
    if (from) idQuery = idQuery.gte('report_date', from)
    if (to) idQuery = idQuery.lte('report_date', to)
    const { data: idData } = await idQuery
    reportIds = (idData || []).map((r) => r.id)
    if (!reportIds.length) return NextResponse.json([])
  }

  let query = supabase
    .from('report_sub_items')
    .select('report_id, quantity, sub_item_id, sub_items(name, unit, points_per_unit), daily_reports!inner(report_date, sub_item, construction_area)')

  if (reportIds) {
    query = query.in('report_id', reportIds)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((data || []) as SummaryWorkItemRef[]).map((ri) => {
    const ppus = ri.sub_items
    const wi = Array.isArray(ppus) ? ppus[0] : ppus
    const dr = Array.isArray(ri.daily_reports) ? ri.daily_reports[0] : ri.daily_reports
    return {
      report_date: dr?.report_date || '',
      sub_item: dr?.sub_item || '',
      construction_area: dr?.construction_area || '',
      sub_item_id: ri.sub_item_id,
      item_name: wi?.name || '',
      unit: wi?.unit || '',
      total_qty: Number(ri.quantity),
      points_per_unit: Number(wi?.points_per_unit ?? 0),
    }
  })

  return NextResponse.json(rows)
}
