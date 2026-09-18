import { apiRequest } from './api.ts'

import type { ProductStock, StockMovement, StockAdjustment, NewStockAdjustment } from '../types/stock.ts'

export function getStock(): Promise<ProductStock[]> {
  return apiRequest<ProductStock[]>('/api/stock')
}

export function getLowStock(): Promise<ProductStock[]> {
  return apiRequest<ProductStock[]>('/api/stock/low')
}

export function getMovements(): Promise<StockMovement[]> {
  return apiRequest<StockMovement[]>('/api/stock/movements')
}

export function getAdjustments(): Promise<StockAdjustment[]> {
  return apiRequest<StockAdjustment[]>('/api/stock/adjustments')
}

export function createAdjustment(data: NewStockAdjustment): Promise<StockAdjustment> {
  return apiRequest<StockAdjustment>('/api/stock/adjustments', { method: 'POST', body: data })
}