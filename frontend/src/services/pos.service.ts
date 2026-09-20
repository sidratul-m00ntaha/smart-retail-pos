import { apiRequest } from './api.ts'

/** Same shape as the answer of GET /api/customers/{id}/loyalty-status (Module 6). */
export type LoyaltyStatus = {
  customer_id: number
  loyalty_points: number
  tier_name: string
  /** e.g. 10 for 10%; 0 when the customer has no tier */
  discount_percent: number
}

/** The customer's points, tier name and discount %. Module 5 (POS) uses it to preview the loyalty discount. */
export function getLoyaltyStatus(customerId: number): Promise<LoyaltyStatus> {
  return apiRequest<LoyaltyStatus>(`/api/customers/${customerId}/loyalty-status`)
}

// ---- Completing a sale: POST /api/sales (Module 5) ----

export type SaleRequest = {
  /** null = guest */
  customer_id: number | null
  /** Only the product and the quantity. The server takes prices and VAT from its own database. */
  items: { product_id: number; quantity: number }[]
  /** Money received, e.g. { method: 'cash', amount: '189.00' }. Leave a method out if it is 0. */
  payments: { method: 'cash' | 'card' | 'digital'; amount: string }[]
}

/** Same shape as SaleItemOut in backend/app/schemas/sale.py. Amounts are decimal strings, e.g. "94.50". */
export type SaleLine = {
  sale_item_id: number
  product_id: number
  product_name: string
  quantity: string
  unit_price: string
  line_subtotal: string
  discount_amount: string
  tax_percent: string
  tax_amount: string
  line_total: string
}

export type SalePayment = {
  payment_id: number
  method: string
  amount: string
}

/** Same shape as SaleOut in backend/app/schemas/sale.py. */
export type Sale = {
  sale_id: number
  invoice_number: string
  customer_id: number | null
  cashier_id: number
  subtotal: string
  discount_percent: string
  discount_amount: string
  tax_amount: string
  total_amount: string
  paid_amount: string
  due_amount: string
  payment_status: string
  status: string
  created_at: string
  items: SaleLine[]
  payments: SalePayment[]
}

/** Completes a sale in one all-or-nothing transaction. Throws ApiError with the server's message when it refuses. */
export function createSale(request: SaleRequest): Promise<Sale> {
  return apiRequest<Sale>('/api/sales', { method: 'POST', body: request })
}
