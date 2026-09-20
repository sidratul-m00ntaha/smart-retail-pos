/**
 * SAMPLE DATA for building the POS screen before Module 2's real product list is on `main`.
 *
 * The ids, names, prices and VAT rates of products 1-3 match the stand-in products in
 * backend/app/services/sale_dependencies.py, so a sale made from this screen can be paid against the
 * real API later. Prices and VAT are strings, like the API sends them. Stock is made up here.
 *
 * TODO(module 2): replace SAMPLE_PRODUCTS with a call to the products API.
 */
export type PosProduct = {
  productId: number
  sku: string
  barcode: string
  name: string
  category: string
  unitPrice: string
  vatPercent: string
  stock: number
}

export const SAMPLE_PRODUCTS: PosProduct[] = [
  { productId: 1, sku: 'MLK-001', barcode: '8901000000011', name: 'Milk 1L', category: 'Dairy', unitPrice: '90.00', vatPercent: '5.00', stock: 4 },
  { productId: 2, sku: 'RCE-005', barcode: '8901000000028', name: 'Rice 5kg', category: 'Grocery', unitPrice: '450.00', vatPercent: '0.00', stock: 20 },
  { productId: 3, sku: 'SOP-001', barcode: '8901000000035', name: 'Soap', category: 'Household', unitPrice: '35.50', vatPercent: '15.00', stock: 0 },
]
