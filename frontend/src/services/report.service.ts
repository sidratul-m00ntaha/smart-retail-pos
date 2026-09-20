import { apiRequest } from './api'

// Shapes match backend/app/schemas/report.py. Fields owned by other
// modules currently come back as sample data from report_service.py —
// see README_MODULE2.md. Nothing here needs to change when that's wired up.

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
  return apiRequest<DashboardData>('/api/reports/dashboard')
}

export interface SalesReport {
  total_sales: number
  transactions: number
  items_sold: number
  avg_transaction_value: number
  chart: { labels: string[]; data: number[] }
  top_products: { name: string; units_sold: number; price: number }[]
  payment_methods: { label: string; value: number }[]
}

export function getSalesReport(dateRange: 'today' | 'yesterday' | 'week' | 'month' | 'custom'): Promise<SalesReport> {
  return apiRequest<SalesReport>(`/api/reports/sales?date_range=${dateRange}`)
}

export interface PurchaseReport {
  total_purchases: number
  purchases_by_supplier: { label: string; value: number }[]
  supplier_outstanding: number
}
export function getPurchaseReport(): Promise<PurchaseReport> {
  return apiRequest<PurchaseReport>('/api/reports/purchases')
}

export interface InventoryReport {
  total_products: number
  low_stock: number
  out_of_stock: number
  total_stock_value: number
  current_stock: { name: string; category: string; stock: number; reorder_level: number; status: string }[]
  recent_movements: { date: string; product: string; type: string; qty_in: number; qty_out: number; balance: number; reference: string }[]
}
export function getInventoryReport(): Promise<InventoryReport> {
  return apiRequest<InventoryReport>('/api/reports/inventory')
}

export interface ExpiryRow {
  level: 'Expired' | 'Within7' | 'Within30'
  product_name: string
  batch: string | null
  quantity: number
  expiry_date: string
}
export function getExpiryReport(): Promise<ExpiryRow[]> {
  return apiRequest<ExpiryRow[]>('/api/reports/expiry')
}

export interface CustomerReport {
  top_customers: { rank: number; name: string; tier: string; total_spent: number }[]
  customer_due_total: number
  loyalty_distribution: { label: string; value: number }[]
  customer_due_rows: { name: string; credit_limit: number; outstanding_due: number }[]
}
export function getCustomerReport(): Promise<CustomerReport> {
  return apiRequest<CustomerReport>('/api/reports/customers')
}
