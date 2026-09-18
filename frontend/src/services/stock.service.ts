import { apiRequest } from './api.ts'

import type { ProductStock, StockMovement } from '../types/stock.ts'

export function getStock(): Promise<ProductStock[]> {
  return apiRequest<ProductStock[]>('/api/stock')
}

export function getLowStock(): Promise<ProductStock[]> {
  return apiRequest<ProductStock[]>('/api/stock/low')
}

export function getMovements(): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>('/api/stock/movements')
}