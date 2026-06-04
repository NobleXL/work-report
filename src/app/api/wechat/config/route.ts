import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data: configs } = await supabase
    .from('wechat_config')
    .select('webhook_url')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single()

  const { data: phones } = await supabase
    .from('person_phone_map')
    .select('name, phone')

  return NextResponse.json({
    webhook_url: configs?.webhook_url || '',
    phone_map: Object.fromEntries((phones || []).map((p: any) => [p.name, p.phone])),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { webhook_url, phone_map } = body

  // Upsert webhook
  await supabase.from('wechat_config').upsert(
    { id: 1, webhook_url, updated_at: new Date().toISOString() },
    { onConflict: 'id' }
  )

  // Clear and re-insert phone map
  await supabase.from('person_phone_map').delete().neq('id', 0)
  if (phone_map && Object.keys(phone_map).length) {
    const rows = Object.entries(phone_map).map(([name, phone]) => ({ name, phone: phone as string }))
    await supabase.from('person_phone_map').insert(rows)
  }

  return NextResponse.json({ ok: true })
}
