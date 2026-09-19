// // Assumes `src/services/api.ts` already exports a configured axios instance
// // (baseURL + auth header interceptor — Module 1). Adjust the import path if
// // yours lives somewhere else.
// // import api from "../../services/api";
// import { apiRequest } from "../../services/api";

// import type {
//   Purchase,
//   PurchaseInput,
//   Supplier,
//   SupplierInput,
//   SupplierPayment,
//   SupplierPaymentInput,
// } from "../../types/purchasing";

// export const purchasingApi = {
//   listSuppliers: (search = "", status = "All") =>
//     apiRequest<Supplier[]>("/api/suppliers", { params: { search: search || undefined, status } })
//       .then((r) => r.data),

//   createSupplier: (data: SupplierInput) =>
//     apiRequest.post<Supplier>("/api/suppliers", data).then((r) => r.data),

//   updateSupplier: (id: number, data: SupplierInput) =>
//     apiRequest.put<Supplier>(`/api/suppliers/${id}`, data).then((r) => r.data),

//   paySupplier: (id: number, data: SupplierPaymentInput) =>
//     apiRequest.post<Supplier>(`/api/suppliers/${id}/pay`, data).then((r) => r.data),

//   listPurchases: (search = "") =>
//     apiRequest  .get<Purchase[]>("/api/purchases", { params: { search: search || undefined } }).then((r) => r.data),

//   createPurchase: (data: PurchaseInput) =>
//     apiRequest.post<Purchase>("/api/purchases", data).then((r) => r.data),

//   listPayments: (search = "") =>
//     apiRequest
//       .get<SupplierPayment[]>("/api/suppliers/payments", { params: { search: search || undefined } })
//       .then((r) => r.data),
// };
import { apiRequest } from "../../services/api";

import type {
  Purchase,
  PurchaseInput,
  Supplier,
  SupplierInput,
  SupplierPayment,
  SupplierPaymentInput,
} from "../../types/purchasing";

export const purchasingApi = {
  listSuppliers: (search = "", status = "All") =>
    apiRequest<Supplier[]>(
      `/api/suppliers?search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`
    ),

  createSupplier: (data: SupplierInput) =>
    apiRequest<Supplier>("/api/suppliers", {
      method: "POST",
      body: data,
    }),

  updateSupplier: (id: number, data: SupplierInput) =>
    apiRequest<Supplier>(`/api/suppliers/${id}`, {
      method: "PUT",
      body: data,
    }),

  paySupplier: (id: number, data: SupplierPaymentInput) =>
    apiRequest<Supplier>(`/api/suppliers/${id}/pay`, {
      method: "POST",
      body: data,
    }),

  listPurchases: (search = "") =>
    apiRequest<Purchase[]>(
      `/api/purchases?search=${encodeURIComponent(search)}`
    ),

  createPurchase: (data: PurchaseInput) =>
    apiRequest<Purchase>("/api/purchases", {
      method: "POST",
      body: data,
    }),

  listPayments: (search = "") =>
    apiRequest<SupplierPayment[]>(
      `/api/suppliers/payments?search=${encodeURIComponent(search)}`
    ),
};