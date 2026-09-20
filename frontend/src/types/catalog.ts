export type CatalogStatus = 'active' | 'inactive'

export interface Category {
  category_id: number
  name: string
  status: CatalogStatus
  created_at: string
}

export interface Brand {
  brand_id: number
  name: string
  status: CatalogStatus
  created_at: string
}

export interface Unit {
  unit_id: number
  name: string
  status: CatalogStatus
  created_at: string
}

export interface TaxRate {
  tax_rate_id: number
  name: string
  rate_percent: number
  status: CatalogStatus
  created_at: string
}

export interface NewCategory { name: string; status?: CatalogStatus }
export interface NewBrand { name: string; status?: CatalogStatus }
export interface NewUnit { name: string; status?: CatalogStatus }
export interface NewTaxRate { name: string; rate_percent: number; status?: CatalogStatus }
