import type { Category, Brand, Unit, TaxRate, CatalogStatus } from './catalog'

export interface Product {
  product_id: number
  product_code: string
  barcode: string | null
  name: string
  category_id: number
  brand_id: number | null
  unit_id: number
  tax_rate_id: number | null
  purchase_price: number
  sale_price: number
  tax_percent: number
  reorder_level: number
  current_quantity: number
  expiry_tracking: boolean
  image_path: string | null
  description: string | null
  status: CatalogStatus
  created_at: string
  updated_at: string
  category: Category | null
  brand: Brand | null
  unit: Unit | null
  tax_rate: TaxRate | null
}

export interface NewProduct {
  product_code: string
  barcode?: string
  name: string
  category_id: number
  brand_id?: number
  unit_id: number
  tax_rate_id?: number
  purchase_price: number
  sale_price: number
  tax_percent: number
  reorder_level: number
  expiry_tracking: boolean
  status: CatalogStatus
}

export type UpdateProduct = Partial<NewProduct>

export interface ProductStats {
  total: number
  active: number
  inactive: number
  low_stock: number
  out_of_stock: number
}
