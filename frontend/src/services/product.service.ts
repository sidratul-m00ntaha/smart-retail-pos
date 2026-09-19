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
