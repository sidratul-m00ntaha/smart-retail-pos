import { apiRequest } from './api'
import type { Category, Brand, Unit, TaxRate, NewCategory, NewBrand, NewUnit, NewTaxRate } from '../types/catalog'

// ---------- Categories ----------
export function getCategories(): Promise<Category[]> {
  return apiRequest<Category[]>('/api/categories')
}
export function createCategory(data: NewCategory): Promise<Category> {
  return apiRequest<Category>('/api/categories', { method: 'POST', body: data })
}
export function updateCategory(id: number, data: Partial<NewCategory>): Promise<Category> {
  return apiRequest<Category>(`/api/categories/${id}`, { method: 'PUT', body: data })
}

// ---------- Brands ----------
export function getBrands(): Promise<Brand[]> {
  return apiRequest<Brand[]>('/api/brands')
}
export function createBrand(data: NewBrand): Promise<Brand> {
  return apiRequest<Brand>('/api/brands', { method: 'POST', body: data })
}
export function updateBrand(id: number, data: Partial<NewBrand>): Promise<Brand> {
  return apiRequest<Brand>(`/api/brands/${id}`, { method: 'PUT', body: data })
}

// ---------- Units ----------
export function getUnits(): Promise<Unit[]> {
  return apiRequest<Unit[]>('/api/units')
}
export function createUnit(data: NewUnit): Promise<Unit> {
  return apiRequest<Unit>('/api/units', { method: 'POST', body: data })
}
export function updateUnit(id: number, data: Partial<NewUnit>): Promise<Unit> {
  return apiRequest<Unit>(`/api/units/${id}`, { method: 'PUT', body: data })
}

// ---------- Tax rates ----------
export function getTaxRates(): Promise<TaxRate[]> {
  return apiRequest<TaxRate[]>('/api/tax-rates')
}
export function createTaxRate(data: NewTaxRate): Promise<TaxRate> {
  return apiRequest<TaxRate>('/api/tax-rates', { method: 'POST', body: data })
}
export function updateTaxRate(id: number, data: Partial<NewTaxRate>): Promise<TaxRate> {
  return apiRequest<TaxRate>(`/api/tax-rates/${id}`, { method: 'PUT', body: data })
}
