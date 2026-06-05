export interface WorkItem {
  id: number
  name: string
  unit: string
  points_per_unit: number
  sort_order: number
  is_active: boolean
}

export interface DailyReport {
  id: number
  report_date: string
  area: string
  created_at: string
  total_points?: number
  work_items?: ReportWorkItem[]
}

export interface ReportWorkItem {
  id: number
  report_id: number
  work_item_id: number
  quantity: number
  item_name?: string
  unit?: string
  points_per_unit?: number
}

export interface SummaryRow {
  report_date: string
  area: string
  work_item_id: number
  item_name: string
  unit: string
  total_qty: number
  points_per_unit: number
}

export interface DailyStat {
  report_date: string
  report_count: number
  total_points: number
}

export interface AreaStat {
  area: string
  report_count: number
  total_points: number
}

export interface WeChatConfig {
  webhook_url: string
  phone_map: Record<string, string>
}
