import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface PhoneEntry {
  name: string
  phone: string
}

export async function GET() {
  const { data: configs, error: configError } = await supabase
    .from('wechat_config')
    .select('id, webhook_url')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (configError) {
    return NextResponse.json({ error: configError.message }, { status: 500 })
  }

  const { data: phones, error: phonesError } = await supabase
    .from('person_phone_map')
    .select('name, phone')

  if (phonesError) {
    return NextResponse.json({ error: phonesError.message }, { status: 500 })
  }

  return NextResponse.json({
    webhook_url: configs?.webhook_url || '',
    phone_map: Object.fromEntries(((phones || []) as PhoneEntry[]).map((p) => [p.name, p.phone])),
  })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { webhook_url, phone_map } = body

  if (!webhook_url || typeof webhook_url !== 'string') {
    return NextResponse.json({ error: 'Webhook 地址不能为空' }, { status: 400 })
  }

  const { error: deleteConfigError } = await supabase.from('wechat_config').delete().neq('id', 0)
  if (deleteConfigError) {
    return NextResponse.json({ error: deleteConfigError.message }, { status: 500 })
  }

  const { error: insertConfigError } = await supabase
    .from('wechat_config')
    .insert({ webhook_url: webhook_url.trim(), updated_at: new Date().toISOString() })

  if (insertConfigError) {
    return NextResponse.json({ error: insertConfigError.message }, { status: 500 })
  }

  const { error: deletePhonesError } = await supabase.from('person_phone_map').delete().neq('id', 0)
  if (deletePhonesError) {
    return NextResponse.json({ error: deletePhonesError.message }, { status: 500 })
  }

  if (phone_map && Object.keys(phone_map).length) {
    const rows = Object.entries(phone_map).map(([name, phone]) => ({ name, phone: phone as string }))
    const { error: insertPhonesError } = await supabase.from('person_phone_map').insert(rows)
    if (insertPhonesError) {
      return NextResponse.json({ error: insertPhonesError.message }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
