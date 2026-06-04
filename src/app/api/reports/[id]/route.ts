import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function calcTotal(reportWorkItems: any[]) {
  return (reportWorkItems || []).reduce((sum: number, ri: any) => {
    const ppus = ri.work_items as any
    const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
    return sum + Number(ri.quantity) * Number(ppu ?? 0)
  }, 0)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*, report_work_items(*, work_items(name, unit, points_per_unit))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ ...data, total_points: calcTotal(data.report_work_items) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('daily_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}