import { apiRequest } from './api'

// Shapes match backend/app/services/dashboard_service.py - every field here
// is computed from real Sales/Purchases/Customers/Products rows at request
// time. There is no sample data. "month" in sales_over_time/purchases_vs_sales
// has 4 or 5 entries depending on how many 7-day slices the current month
// splits into - don't assume a fixed length.

export interface DashboardData {
  alerts: { low_stock: number; out_of_stock: number; expiring_within_30: number }
  metrics: {
    todays_sales: number
    transactions: number
    items_sold: number
    customer_due: number
    supplier_due: number
  }
  sales_over_time: { week: number[]; month: number[]; quarter: number[] }
  sales_by_payment_method: { label: string; value: number }[]
  top_products: { name: string; units_sold: number; percent_of_top: number }[]
  purchases_vs_sales: { labels: string[]; purchases: number[]; sales: number[] }
  loyalty_distribution: { label: string; value: number }[]
}

export function getDashboardData(): Promise<DashboardData> {
  return apiRequest<DashboardData>('/api/dashboard')
}
