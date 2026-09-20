import { apiRequest } from './api.ts'

import type { ProductStock, StockMovement, StockAdjustment, NewStockAdjustment, StockBatch } from '../types/stock.ts'

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
export function getExpiryAlerts(days: number = 30): Promise<StockBatch[]> {
  return apiRequest<StockBatch[]>(`/api/expiry/alerts?days=${days}`)
}
export function addBatch(data: { product_id: number; batch_number: string; quantity: number; expiry_date: string }): Promise<StockBatch> {
  return apiRequest<StockBatch>('/api/expiry/batches', { method: 'POST', body: data })
}