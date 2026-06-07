import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface WorkItemRef {
  name?: string | null
  unit?: string | null
  points_per_unit?: number | string | null
}

interface DailyReportRef {
  report_date?: string | null
  sub_item?: string | null
  construction_area?: string | null
}

interface SummaryWorkItemRef {
  quantity: number | string
  sub_item_id: number | string
  sub_items?: WorkItemRef | WorkItemRef[] | null
  daily_reports?: DailyReportRef | DailyReportRef[] | null
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/

type DateRange =
  | { from: string; to: string; error?: never }
  | { from?: never; to?: never; error: string }

function firstValue<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getMonthRange(month: string): DateRange {
  if (!MONTH_PATTERN.test(month)) return { error: '月份格式错误，应为 YYYY-MM' }

  const [yearText, monthText] = month.split('-')
  const year = Number(yearText)
  const monthNumber = Number(monthText)
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate()

  return {
    from: `${month}-01`,
    to: `${month}-${String(lastDay).padStart(2, '0')}`,
  }
}

function getDateRange(req: NextRequest): DateRange {
  const month = req.nextUrl.searchParams.get('month')?.trim()
  if (month) return getMonthRange(month)

  const from = req.nextUrl.searchParams.get('from')?.trim() || ''
  const to = req.nextUrl.searchParams.get('to')?.trim() || ''

  if (from && !DATE_PATTERN.test(from)) return { error: '开始日期格式错误，应为 YYYY-MM-DD' }
  if (to && !DATE_PATTERN.test(to)) return { error: '结束日期格式错误，应为 YYYY-MM-DD' }
  if (from && to && from > to) return { error: '开始日期不能晚于结束日期' }

  return { from, to }
}

export async function GET(req: NextRequest) {
  const range = getDateRange(req)
  if (range.error) return NextResponse.json({ error: range.error }, { status: 400 })

  let reportIds: number[] | null = null

  if (range.from || range.to) {
    let idQuery = supabase.from('daily_reports').select('id')
    if (range.from) idQuery = idQuery.gte('report_date', range.from)
    if (range.to) idQuery = idQuery.lte('report_date', range.to)

    const { data: idData, error: idError } = await idQuery
    if (idError) return NextResponse.json({ error: idError.message }, { status: 500 })

    reportIds = (idData || []).map((r) => Number(r.id))
    if (!reportIds.length) return NextResponse.json([])
  }

  let query = supabase
    .from('report_sub_items')
    .select('report_id, quantity, sub_item_id, sub_items(name, unit, points_per_unit), daily_reports!inner(report_date, sub_item, construction_area)')

  if (reportIds) {
    query = query.in('report_id', reportIds)
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rows = ((data || []) as SummaryWorkItemRef[])
    .map((ri) => {
      const wi = firstValue(ri.sub_items)
      const dr = firstValue(ri.daily_reports)

      return {
        report_date: dr?.report_date || '',
        sub_item: dr?.sub_item || '',
        construction_area: dr?.construction_area || '',
        sub_item_id: Number(ri.sub_item_id),
        item_name: wi?.name || '',
        unit: wi?.unit || '',
        total_qty: Number(ri.quantity),
        points_per_unit: Number(wi?.points_per_unit ?? 0),
      }
    })
    .sort((a, b) => (
      b.report_date.localeCompare(a.report_date)
      || a.sub_item.localeCompare(b.sub_item)
      || a.construction_area.localeCompare(b.construction_area)
      || a.item_name.localeCompare(b.item_name)
    ))

  return NextResponse.json(rows)
}
