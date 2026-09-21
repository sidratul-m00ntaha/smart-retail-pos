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
  /** Set when the bill was resumed from a held bill: the server marks it completed together with the sale. */
  held_cart_id?: number
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
  /** Header details (PRD 5.17). The store's are read from the store settings each time, so a reprint shows the current ones. */
  store_name: string
  store_address: string | null
  store_phone: string | null
  cashier_name: string | null
  /** null = guest */
  customer_name: string | null
  customer_phone: string | null
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

// ---- Hold and resume: /api/held-carts (Module 5) ----

/** What is saved when a bill is put on hold. Only product and quantity: prices and stock are checked again on resume. */
export type HeldCartSave = {
  customer_id: number | null
  /** e.g. "red jacket, lane 2" (max 100 characters) */
  note: string | null
  items: { product_id: number; quantity: number }[]
}

/** Same shape as HeldCartOut in backend/app/schemas/held_cart.py. */
export type HeldCart = {
  held_cart_id: number
  cashier_id: number
  cashier_name: string | null
  customer_id: number | null
  note: string | null
  status: string
  item_count: number
  created_at: string
  updated_at: string
  items: { product_id: number; quantity: string }[]
}

/** One held line, re-checked against today's product data and stock. */
export type HeldCartResumeItem = {
  product_id: number
  quantity: string
  product_name: string | null
  unit_price: string | null
  vat_percent: string | null
  available_quantity: number
  /** e.g. "Only 2 in stock." or "Product 9 was not found."; null when the line is fine */
  problem: string | null
}

/** Same shape as HeldCartResumeOut in backend/app/schemas/held_cart.py. */
export type HeldCartResume = {
  held_cart_id: number
  customer_id: number | null
  note: string | null
  created_at: string
  has_problems: boolean
  items: HeldCartResumeItem[]
}

/** Pauses the current bill so the cashier can serve the next customer. */
export function holdCart(data: HeldCartSave): Promise<HeldCart> {
  return apiRequest<HeldCart>('/api/held-carts', { method: 'POST', body: data })
}

/** Holds a resumed bill again with its new items, instead of creating a duplicate. */
export function updateHeldCart(heldCartId: number, data: HeldCartSave): Promise<HeldCart> {
  return apiRequest<HeldCart>(`/api/held-carts/${heldCartId}`, { method: 'PUT', body: data })
}

/** Every bill on hold, newest first. Any cashier can resume any of them. */
export function listHeldCarts(): Promise<HeldCart[]> {
  return apiRequest<HeldCart[]>('/api/held-carts')
}

/** Loads a held bill with today's prices and stock. It stays on hold until the sale is completed. */
export function resumeHeldCart(heldCartId: number): Promise<HeldCartResume> {
  return apiRequest<HeldCartResume>(`/api/held-carts/${heldCartId}`)
}

/** Throws a held bill away (the server keeps the row with status "discarded"). */
export async function discardHeldCart(heldCartId: number): Promise<void> {
  await apiRequest<null>(`/api/held-carts/${heldCartId}`, { method: 'DELETE' })
}
