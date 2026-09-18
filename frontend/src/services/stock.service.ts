import { apiRequest } from './api.ts'
import type { ProductStock } from '../types/stock.ts'

export function getStock(): Promise<ProductStock[]> {
  return apiRequest<ProductStock[]>('/api/stock')
}

export function getLowStock(): Promise<ProductStock[]> {
  return apiRequest<ProductStock[]>('/api/stock/low')
}