import type { Product } from '../../types/product.ts'

/** A product as the POS screen needs it. Money and percentages stay decimal strings, like the API sends them. */
export type PosProduct = {
  productId: number
  sku: string
  /** Empty when the product has no barcode */
  barcode: string
  name: string
  category: string
  unitPrice: string
  vatPercent: string
  stock: number
  /** Stock at or below this shows the "Low" badge */
  reorderLevel: number
}

/**
 * The API sends money as decimal strings ("90.00"), although Module 2's Product type says `number`.
 * This accepts both, so the screen keeps working if that type is ever made to match the API.
 */
export function decimalText(value: number | string): string {
  return typeof value === 'number' ? value.toFixed(2) : value
}

/**
 * Turns a Module 2 product into a POS product. VAT comes from the product's tax rate when it has one,
 * the same rule the server uses when it prices the sale (backend sale_dependencies.py); the product's own
 * tax_percent is only the fallback.
 */
export function toPosProduct(product: Product): PosProduct {
  const vat = product.tax_rate !== null ? product.tax_rate.rate_percent : product.tax_percent
  return {
    productId: product.product_id,
    sku: product.product_code,
    barcode: product.barcode ?? '',
    name: product.name,
    category: product.category?.name ?? 'Other',
    unitPrice: decimalText(product.sale_price),
    vatPercent: decimalText(vat),
    stock: product.current_quantity,
    reorderLevel: product.reorder_level,
  }
}
