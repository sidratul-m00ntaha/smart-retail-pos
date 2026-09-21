import type { Sale } from './pos.service.ts'
import { apiRequest } from './api.ts'

export type PaymentStatusFilter = '' | 'PAID' | 'PARTIALLY_PAID' | 'DUE'

/** Filters for the sales / invoices list. Dates are ISO moments (see startOfLocalDay in utils/date.ts). */
export type SalesQuery = {
  created_from?: string
  created_before?: string
  payment_status?: PaymentStatusFilter
  /** Text in the invoice number, or the customer's name or phone */
  search?: string
  page?: number
  page_size?: number
}

/** One row of the list. Same shape as SaleListItem in backend/app/schemas/sale.py; amounts are decimal strings. */
export type SaleListItem = {
  sale_id: number
  invoice_number: string
  created_at: string
  customer_id: number | null
  customer_name: string | null
  customer_phone: string | null
  cashier_name: string | null
  /** Units sold on the sale, e.g. "3" */
  item_count: string
  total_amount: string
  paid_amount: string
  due_amount: string
  payment_status: string
  status: string
}

/** Sums over ALL rows that match the filters, not just the page being shown. */
export type SaleListTotals = {
  transactions: number
  total_amount: string
  paid_amount: string
  due_amount: string
}

export type SaleListPage = {
  items: SaleListItem[]
  total: number
  page: number
  page_size: number
  totals: SaleListTotals
}

function withQuery(path: string, query: SalesQuery): string {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(name, String(value))
  }
  return `${path}?${params}`
}

/** Sales, newest first, one page at a time (needs the sales.view permission). */
export function listSales(query: SalesQuery): Promise<SaleListPage> {
  return apiRequest<SaleListPage>(withQuery('/api/sales', query))
}

/** The invoices, newest first. Same rows as the sales list: every sale has exactly one invoice. */
export function listInvoices(query: SalesQuery): Promise<SaleListPage> {
  return apiRequest<SaleListPage>(withQuery('/api/invoices', query))
}

/** One invoice to view or print, e.g. "INV-2026-00125". */
export function getInvoice(invoiceNumber: string): Promise<Sale> {
  return apiRequest<Sale>(`/api/invoices/${encodeURIComponent(invoiceNumber)}`)
}
