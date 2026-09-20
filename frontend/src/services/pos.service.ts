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
