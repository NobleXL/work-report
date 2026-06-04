import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const body = await req.json()
  const { name, unit, points_per_unit } = body

  const { error } = await supabase
    .from('work_items')
    .update({ name, unit, points_per_unit })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  // toggle active
  const { data: item } = await supabase
    .from('work_items')
    .select('is_active')
    .eq('id', id)
    .single()

  const newVal = !(item?.is_active ?? true)
  const { error } = await supabase
    .from('work_items')
    .update({ is_active: newVal })
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}