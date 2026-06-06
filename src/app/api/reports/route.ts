import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface WorkItemRef {
  points_per_unit?: number | string | null
}

interface ReportWorkItemRef {
  quantity: number | string
  sub_items?: WorkItemRef | WorkItemRef[] | null
}

function calcTotal(reportWorkItems: ReportWorkItemRef[]) {
  return (reportWorkItems || []).reduce((sum, ri) => {
    const ppus = ri.sub_items
    const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
    return sum + Number(ri.quantity) * Number(ppu ?? 0)
  }, 0)
}

function todayStr() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const value = (type: string) => parts.find((part) => part.type === type)?.value || ''
  return `${value('year')}-${value('month')}-${value('day')}`
}

export async function GET() {
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*, report_sub_items(*, sub_items(name, unit, points_per_unit))')
    .eq('report_date', todayStr())
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reports = (data || []).map((r) => {
    const reportWorkItems = (r.report_sub_items || []) as ReportWorkItemRef[]
    return {
      ...r,
      total_points: calcTotal(reportWorkItems),
    }
  })

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { report_date, sub_item, construction_area, work_items, sub_items } = body

  const { data: report, error: rErr } = await supabase
    .from('daily_reports')
    .insert({ report_date, sub_item, construction_area })
    .select()
    .single()

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const rid = report.id
  const submittedItems = (work_items || sub_items || []) as { work_item_id?: number; sub_item_id?: number; quantity: number }[]
  const rows = submittedItems.map((w) => ({
    report_id: rid,
    sub_item_id: w.work_item_id ?? w.sub_item_id,
    quantity: w.quantity,
  }))

  const { error: wiErr } = await supabase.from('report_sub_items').insert(rows)
  if (wiErr) return NextResponse.json({ error: wiErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: rid }, { status: 201 })
}
