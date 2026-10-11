import { apiRequest } from './api.ts'

// Same shapes as backend/app/schemas/day_close.py. Money arrives as decimal strings, e.g. "189.00".

export type DayTotals = {
  transactions: number
  gross_sales: string
  discount_amount: string
  tax_amount: string
  paid_amount: string
  due_amount: string
  returns_total: string
  net_sales: string
  dues_collected: string
}

export type MethodTotals = {
  method: string
  sales_received: string
  dues_received: string
  refunded: string
  net: string
}

export type CashierTotals = {
  cashier_id: number
  cashier_name: string | null
  transactions: number
  total_amount: string
  cash_received: string
  other_received: string
  due_amount: string
}

export type DayClosing = {
  business_date: string
  opening_cash: string
  expected_cash: string
  counted_cash: string
  difference: string // counted - expected; negative = cash is missing
  note: string | null
  closed_by_name: string | null
  updated_at: string
}

export type DayClose = {
  business_date: string // "2026-10-09"
  totals: DayTotals
  methods: MethodTotals[]
  cashiers: CashierTotals[]
  cash_net: string // cash on sales + cash due payments - cash refunds
  suggested_opening_cash: string
  closing: DayClosing | null
}

export type DayCloseSave = {
  business_date: string
  opening_cash: string
  counted_cash: string
  note?: string
}

/** The figures for a store day. Leave the date out for today. */
export function getDayClose(date?: string): Promise<DayClose> {
  const query = date ? `?date=${encodeURIComponent(date)}` : ''
  return apiRequest<DayClose>(`/api/day-close${query}`)
}

/** Saves the cash count. Saving the same day again replaces the earlier count. */
export function saveDayClose(body: DayCloseSave): Promise<DayClose> {
  return apiRequest<DayClose>('/api/day-close', { method: 'POST', body })
}
