export type ProductStock = {
  product_stock_id: number
  product_id: number
  current_stock: number
  reserved_stock: number
  reorder_level: number
  maximum_level: number | null
  is_low_stock: boolean
  updated_at: string
}
export type StockMovement = {
  stock_movement_id: number
  product_id: number
  movement_type: string
  quantity: number
  running_balance: number
  source: string
  reference_id: number | null
  created_by: number | null
  created_at: string
}