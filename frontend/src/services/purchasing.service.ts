// import type {
//   NewPurchase,
//   NewSupplierPayment,
//   Purchase,
//   PurchaseSummary,
//   Supplier,
//   SupplierInput,
//   SupplierPayment,
//   SupplierStatus,
// } from '../types/purchasing.ts'
// import { apiRequest } from './api.ts'

// // ---- Suppliers: /api/suppliers (Module 3) ----

// /** Every supplier with its total purchases, total paid and outstanding due. Pass a status to see only those. */
// export function getSuppliers(status?: SupplierStatus): Promise<Supplier[]> {
//   return apiRequest<Supplier[]>(status ? `/api/suppliers?status_filter=${status}` : '/api/suppliers')
// }

// export function createSupplier(data: SupplierInput): Promise<Supplier> {
//   return apiRequest<Supplier>('/api/suppliers', { method: 'POST', body: data })
// }

// /** Edits a supplier. Send status 'inactive' to deactivate it (its history is kept). */
// export function updateSupplier(supplierId: number, data: SupplierInput): Promise<Supplier> {
//   return apiRequest<Supplier>(`/api/suppliers/${supplierId}`, { method: 'PUT', body: data })
// }

// // ---- Purchases: /api/purchases (Module 3) ----

// /** Purchase history, newest first */
// export function getPurchases(): Promise<PurchaseSummary[]> {
//   return apiRequest<PurchaseSummary[]>('/api/purchases')
// }

// /** One purchase with all its lines */
// export function getPurchase(purchaseId: number): Promise<Purchase> {
//   return apiRequest<Purchase>(`/api/purchases/${purchaseId}`)
// }

// /** Confirms a purchase: saves it, adds the stock and logs it in one all-or-nothing step. Throws ApiError when refused. */
// export function createPurchase(data: NewPurchase): Promise<Purchase> {
//   return apiRequest<Purchase>('/api/purchases', { method: 'POST', body: data })
// }

// // ---- Supplier payments: /api/supplier-payments (Module 3) ----

// /** Payment history, newest first */
// export function getSupplierPayments(): Promise<SupplierPayment[]> {
//   return apiRequest<SupplierPayment[]>('/api/supplier-payments')
// }

// /** Pays a supplier. The supplier's outstanding due goes down by exactly the amount. */
// export function createSupplierPayment(data: NewSupplierPayment): Promise<SupplierPayment> {
//   return apiRequest<SupplierPayment>('/api/supplier-payments', { method: 'POST', body: data })
// }







import type {
  Purchase,
  PurchaseInput,
  PurchaseSummary,
  Supplier,
  SupplierInput,
  SupplierPayment,
  SupplierPaymentInput,
  SupplierStatus,
} from '../types/purchasing.ts'
import { apiRequest } from './api.ts'

// ---- Suppliers: /api/suppliers (PRD 5.5) ----

/** Every supplier with total purchases, total paid and outstanding due. Pass 'active' for the ones a new purchase can use. */
export function getSuppliers(status?: SupplierStatus): Promise<Supplier[]> {
  return apiRequest<Supplier[]>(status ? `/api/suppliers?status_filter=${status}` : '/api/suppliers')
}

export function createSupplier(data: SupplierInput): Promise<Supplier> {
  return apiRequest<Supplier>('/api/suppliers', { method: 'POST', body: data })
}

export function updateSupplier(supplierId: number, data: SupplierInput): Promise<Supplier> {
  return apiRequest<Supplier>(`/api/suppliers/${supplierId}`, { method: 'PUT', body: data })
}

// ---- Purchases: /api/purchases (PRD 5.6) ----

export function getPurchases(): Promise<PurchaseSummary[]> {
  return apiRequest<PurchaseSummary[]>('/api/purchases')
}

export function getPurchase(purchaseId: number): Promise<Purchase> {
  return apiRequest<Purchase>(`/api/purchases/${purchaseId}`)
}

/** Confirms a purchase: the server saves it, increases the stock and writes the activity log in one step. */
export function createPurchase(data: PurchaseInput): Promise<Purchase> {
  return apiRequest<Purchase>('/api/purchases', { method: 'POST', body: data })
}

// ---- Supplier payments: /api/supplier-payments (PRD 5.7) ----

export function getSupplierPayments(): Promise<SupplierPayment[]> {
  return apiRequest<SupplierPayment[]>('/api/supplier-payments')
}

export function createSupplierPayment(data: SupplierPaymentInput): Promise<SupplierPayment> {
  return apiRequest<SupplierPayment>('/api/supplier-payments', { method: 'POST', body: data })
}
