import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function calcTotal(reportWorkItems: any[]) {
  return (reportWorkItems || []).reduce((sum: number, ri: any) => {
    const ppus = ri.work_items as any
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
    .select('*, report_work_items(*, work_items(name, unit, points_per_unit))')
    .eq('report_date', todayStr())
    .order('report_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const reports = (data || []).map((r: any) => ({
    ...r,
    total_points: calcTotal(r.report_work_items),
  }))

  return NextResponse.json(reports)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { report_date, area, group_leader, workers, guardian, description, work_items } = body

  const { data: report, error: rErr } = await supabase
    .from('daily_reports')
    .insert({ report_date, area, group_leader, workers, guardian: guardian || '', description: description || '' })
    .select()
    .single()

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })

  const rid = report.id
  const rows = work_items.map((w: any) => ({
    report_id: rid,
    work_item_id: w.item_id,
    quantity: w.quantity,
  }))

  const { error: wiErr } = await supabase.from('report_work_items').insert(rows)
  if (wiErr) return NextResponse.json({ error: wiErr.message }, { status: 500 })

  return NextResponse.json({ ok: true, id: rid }, { status: 201 })
}
