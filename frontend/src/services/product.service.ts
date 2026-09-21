import { apiRequest } from './api'
import type { Product, NewProduct, UpdateProduct, ProductStats } from '../types/product'

export interface ProductFilters {
  search?: string
  category_id?: number
  status_filter?: string
}

function toQuery(filters: ProductFilters = {}): string {
  const params = new URLSearchParams()
  if (filters.search) params.set('search', filters.search)
  if (filters.category_id) params.set('category_id', String(filters.category_id))
  if (filters.status_filter && filters.status_filter !== 'All') params.set('status_filter', filters.status_filter.toLowerCase())
  const qs = params.toString()
  return qs ? `?${qs}` : ''
}

export function getProducts(filters?: ProductFilters): Promise<Product[]> {
  return apiRequest<Product[]>(`/api/products${toQuery(filters)}`)
}

export function getProductStats(): Promise<ProductStats> {
  return apiRequest<ProductStats>('/api/products/stats')
}

export function getProduct(id: number): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}`)
}

export function createProduct(data: NewProduct): Promise<Product> {
  return apiRequest<Product>('/api/products', { method: 'POST', body: data })
}

export function updateProduct(id: number, data: UpdateProduct): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}`, { method: 'PUT', body: data })
}
export function deleteProduct(id: number): Promise<void> {
  return apiRequest<void>(`/api/products/${id}`, { method: 'DELETE' })
}
export function setProductStatus(id: number, active: boolean): Promise<Product> {
  return apiRequest<Product>(`/api/products/${id}/status?active=${active}`, { method: 'PATCH' })
}

// ---- For Module 5 (POS): real products, shaped for the POS cart ----
// Call this from PosPage.tsx's own data-fetching code instead of a hardcoded
// sample list. This lives here (not in modules/pos/) because it's Module 2's
// data and mapping, not Module 5's - Module 5 owns how/when it's fetched.
export interface PosProduct {
  productId: number
  sku: string
  barcode: string
  name: string
  category: string
  unitPrice: string
  vatPercent: string
  stock: number
}

export function getPosProducts(): Promise<PosProduct[]> {
  return getProducts({ status_filter: 'active' }).then((rows) =>
    rows.map((p) => ({
      productId: p.product_id,
      sku: p.product_code,
      barcode: p.barcode ?? '',
      name: p.name,
      category: p.category?.name ?? 'Uncategorized',
      unitPrice: p.sale_price.toFixed(2),
      vatPercent: p.tax_percent.toFixed(2),
      stock: p.current_quantity,
    })),
  )
}
