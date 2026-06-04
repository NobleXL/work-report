import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { report_id } = await req.json()

  // Get report + work items
  const { data: report, error: rErr } = await supabase
    .from('daily_reports')
    .select('*, report_work_items(quantity, work_items(name, unit, points_per_unit))')
    .eq('id', report_id)
    .single()

  if (rErr || !report) return NextResponse.json({ error: '日报不存在' }, { status: 404 })

  // Get webhook + phone map
  const { data: config } = await supabase
    .from('wechat_config')
    .select('webhook_url')
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!config?.webhook_url) return NextResponse.json({ error: '请先配置企业微信 Webhook' }, { status: 400 })

  const { data: phones } = await supabase
    .from('person_phone_map')
    .select('name, phone')

  const phoneMap: Record<string, string> = Object.fromEntries((phones || []).map((p: any) => [p.name, p.phone]))

  // Build mention list from workers
  const workerNames = report.workers.split(/[，,\s]+/).filter(Boolean)
  const mentionedMobiles = workerNames
    .map((n: string) => phoneMap[n.trim()])
    .filter(Boolean)

  // Build content lines
  const lines: string[] = [report.area]
  for (const ri of report.report_work_items || []) {
    const name = ri.work_items?.name || ''
    const unit = ri.work_items?.unit || ''
    const qty = Number(ri.quantity)
    const rate = Number(ri.work_items?.points_per_unit ?? 0)
    const subtotal = qty * rate
    lines.push(`${name}${qty.toFixed(1)}${unit} 单个点数${rate.toFixed(1)} 总点数${subtotal.toFixed(1)}点`)
  }

  const content = lines.join('\n')

  // Build wecom message
  const mentionedList = mentionedMobiles.length > 0 ? mentionedMobiles : undefined
  const body: any = {
    msgtype: 'text',
    text: {
      content,
      mentioned_mobile_list: mentionedList,
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
