import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface PhoneEntry {
  phone?: string | null
}

interface WorkItemRef {
  name?: string | null
  unit?: string | null
  points_per_unit?: number | string | null
}

interface ReportWorkItemRef {
  quantity: number | string
  work_items?: WorkItemRef | WorkItemRef[] | null
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

function normalizeMobile(phone: string) {
  return phone.replace(/[^\d]/g, '')
}

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export async function POST() {
  const today = todayStr()

  const { data: reports, error: rErr } = await supabase
    .from('daily_reports')
    .select('id, report_date, area, report_work_items(quantity, work_items(name, unit, points_per_unit))')
    .eq('report_date', today)
    .order('area', { ascending: true })
    .order('created_at', { ascending: true })

  if (rErr) return NextResponse.json({ error: rErr.message }, { status: 500 })
  if (!reports?.length) return NextResponse.json({ error: '今日暂无日报' }, { status: 404 })

  const { data: config } = await supabase
    .from('wechat_config')
    .select('webhook_url')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config?.webhook_url) return NextResponse.json({ error: '请先配置企业微信 Webhook' }, { status: 400 })

  const { data: phones } = await supabase
    .from('person_phone_map')
    .select('phone')

  const mentionedMobiles = Array.from(
    new Set((phones || []).map((p: PhoneEntry) => normalizeMobile(String(p.phone || ''))).filter(Boolean))
  )

  const areaMap = new Map<string, Map<string, { name: string; unit: string; qty: number; rate: number }>>()

  for (const report of reports) {
    const area = report.area || '未填写区域'
    if (!areaMap.has(area)) areaMap.set(area, new Map())
    const itemMap = areaMap.get(area)!

    for (const ri of ((report.report_work_items || []) as ReportWorkItemRef[])) {
      const workItem = Array.isArray(ri.work_items) ? ri.work_items[0] : ri.work_items
      const name = workItem?.name || ''
      const unit = workItem?.unit || ''
      const rate = Number(workItem?.points_per_unit ?? 0)
      const key = `${name}|${unit}|${rate}`
      const current = itemMap.get(key)
      if (current) {
        current.qty += Number(ri.quantity)
      } else {
        itemMap.set(key, { name, unit, qty: Number(ri.quantity), rate })
      }
    }
  }

  const lines: string[] = [`${today} 今日工作量`]
  for (const [area, itemMap] of areaMap) {
    lines.push('', area)
    for (const item of itemMap.values()) {
      const subtotal = item.qty * item.rate
      lines.push(`${item.name}${formatNumber(item.qty)}${item.unit} 单个点数${formatNumber(item.rate)} 总点数${formatNumber(subtotal)}点`)
    }
  }

  const content = lines.join('\n').trim()

  const body: { msgtype: 'text'; text: { content: string; mentioned_mobile_list?: string[] } } = {
    msgtype: 'text',
    text: {
      content,
      mentioned_mobile_list: mentionedMobiles.length ? mentionedMobiles : undefined,
    },
  }

  const res = await fetch(config.webhook_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const text = await res.text()
    return NextResponse.json({ error: `企业微信请求失败: ${text}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true })
}
