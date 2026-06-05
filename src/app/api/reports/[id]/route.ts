import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface SubItemRef {
  points_per_unit?: number | string | null
}

interface ReportSubItemRef {
  quantity: number | string
  sub_items?: SubItemRef | SubItemRef[] | null
}

function calcTotal(reportSubItems: ReportSubItemRef[]) {
  return (reportSubItems || []).reduce((sum, ri) => {
    const ppus = ri.sub_items
    const ppu = Array.isArray(ppus) ? ppus[0]?.points_per_unit : ppus?.points_per_unit
    return sum + Number(ri.quantity) * Number(ppu ?? 0)
  }, 0)
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { data, error } = await supabase
    .from('daily_reports')
    .select('*, report_sub_items(*, sub_items(name, unit, points_per_unit))')
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json({ ...data, total_points: calcTotal(data.report_sub_items) })
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const { error } = await supabase.from('daily_reports').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}