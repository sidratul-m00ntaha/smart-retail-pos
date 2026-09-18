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