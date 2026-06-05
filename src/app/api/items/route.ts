import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data, error } = await supabase
    .from('sub_items')
    .select('*')
    .order('sort_order', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { name, unit, points_per_unit } = body

  const { data: maxRow } = await supabase
    .from('sub_items')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .single()

  const nextSort = (maxRow?.sort_order ?? 0) + 1

  const { data, error } = await supabase
    .from('sub_items')
    .insert({ name, unit, points_per_unit, sort_order: nextSort })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, sub_item_id: data.id }, { status: 201 })
}
