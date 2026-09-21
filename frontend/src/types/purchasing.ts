// // export type SupplierStatus = "Active" | "Inactive";
// // export type PaymentMethod = "Cash" | "Bank" | "Digital";

// // export interface Supplier {
// //   SupplierID: number;
// //   Name: string;
// //   Phone: string;
// //   Email?: string | null;
// //   Address?: string | null;
// //   Status: SupplierStatus;
// //   TotalPurchases: number;
// //   Due: number;
// //   CreatedAt: string;
// // }

// // export interface SupplierInput {
// //   Name: string;
// //   Phone: string;
// //   Email?: string;
// //   Address?: string;
// //   Status: SupplierStatus;
// // }

// // export interface SupplierPaymentInput {
// //   Amount: number;
// //   Method: PaymentMethod;
// //   PurchaseID?: number;
// // }

// // export interface PurchaseItem {
// //   PurchaseItemID?: number;
// //   ProductID: number;
// //   ProductName?: string;
// //   Quantity: number;
// //   UnitPrice: number;
// //   LineTotal?: number;
// // }

// // export interface Purchase {
// //   PurchaseID: number;
// //   PurchaseNo: string;
// //   SupplierID: number;
// //   SupplierName?: string;
// //   PurchaseDate: string;
// //   Subtotal: number;
// //   Discount: number;
// //   VAT: number;
// //   Total: number;
// //   Paid: number;
// //   Due: number;
// //   Status: string;
// //   Items: PurchaseItem[];
// // }

// // export interface PurchaseInput {
// //   SupplierID: number;
// //   Items: { ProductID: number; Quantity: number; UnitPrice: number }[];
// //   Discount: number;
// //   VATRate: number;
// //   Paid: number;
// // }

// // export interface SupplierPayment {
// //   PaymentID: number;
// //   SupplierID: number;
// //   SupplierName?: string;
// //   PurchaseID?: number | null;
// //   PurchaseNo?: string | null;
// //   Amount: number;
// //   Method: PaymentMethod;
// //   PaymentDate: string;
// // }

// // // Minimal shape Module 2's product lookup will eventually return.
// // export interface ProductLite {
// //   ProductID: number;
// //   Name: string;
// //   PurchasePrice: number;
// // }

// //----------------------------------------------------------------------

// // Same shapes as backend/app/schemas/supplier.py, purchase.py and supplier_payment.py.
// // Money is sent as text (e.g. "1102.50"), so it never loses a cent on the way.
 
// export type SupplierStatus = 'active' | 'inactive'
// export type PaymentMethod = 'cash' | 'bank' | 'digital'
// export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'DUE'
 
// export type Supplier = {
//   supplier_id: number
//   name: string
//   phone: string
//   email: string | null
//   address: string | null
//   status: SupplierStatus
//   /** Worked out from the supplier's purchases */
//   purchase_count: number
//   total_purchases: string
//   total_paid: string
//   outstanding_due: string
//   created_at: string
//   updated_at: string | null
// }
 
// /** What the add/edit supplier form sends. Empty optional fields may be sent as "" - they are saved as empty. */
// export type SupplierInput = {
//   name: string
//   phone: string
//   email: string
//   address: string
//   status: SupplierStatus
// }
 
// export type PurchaseItem = {
//   purchase_item_id: number
//   product_id: number
//   product_name: string
//   quantity: string
//   unit_price: string
//   line_discount_percent: string
//   line_total: string
//   batch_number: string | null
//   expiry_date: string | null
// }
 
// /** A purchase without its lines, as shown in the list */
// export type PurchaseSummary = {
//   purchase_id: number
//   purchase_number: string
//   supplier_id: number
//   supplier_name: string
//   subtotal: string
//   discount_amount: string
//   tax_rate_id: number | null
//   tax_percent: string
//   tax_amount: string
//   shipping_charge: string
//   total_amount: string
//   paid_amount: string
//   due_amount: string
//   payment_status: PaymentStatus
//   status: string
//   note: string | null
//   created_by: number | null
//   created_by_name: string | null
//   created_at: string
//   item_count: number
// }
 
// export type Purchase = PurchaseSummary & { items: PurchaseItem[] }
 
// export type NewPurchaseLine = {
//   product_id: number
//   quantity: number
//   unit_price: string
//   line_discount_percent: string
//   /** Only for products with expiry tracking */
//   batch_number: string | null
//   expiry_date: string | null
// }
 
// /** What the new purchase page sends. Totals, VAT and the due are worked out by the server. */
// export type NewPurchase = {
//   supplier_id: number
//   items: NewPurchaseLine[]
//   discount_amount: string
//   tax_rate_id: number | null
//   shipping_charge: string
//   paid_amount: string
//   /** Required when paid_amount is more than 0 */
//   payment_method: PaymentMethod | null
//   note: string | null
// }
 
// export type SupplierPayment = {
//   supplier_payment_id: number
//   supplier_id: number
//   supplier_name: string
//   purchase_id: number | null
//   purchase_number: string | null
//   amount: string
//   method: PaymentMethod
//   note: string | null
//   created_by: number | null
//   created_by_name: string | null
//   created_at: string
// }
 
// export type NewSupplierPayment = {
//   supplier_id: number
//   amount: string
//   method: PaymentMethod
//   /** Leave null to spread the payment over the supplier's oldest open purchases */
//   purchase_id: number | null
//   note: string | null
// }
 









// Same shapes as backend/app/schemas/supplier.py, purchase.py and supplier_payment.py.
// Money and percentages arrive as decimal strings ("1327.00"), like everywhere else in the app.

export type SupplierStatus = 'active' | 'inactive'
export type PaymentMethod = 'cash' | 'bank' | 'digital'
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'DUE'

export type Supplier = {
  supplier_id: number
  name: string
  phone: string
  email: string | null
  address: string | null
  status: SupplierStatus
  /** Worked out from the supplier's purchases (PRD 5.7) */
  purchase_count: number
  total_purchases: string
  total_paid: string
  outstanding_due: string
  created_at: string
  updated_at: string | null
}

/** What the add/edit supplier form sends. Empty email/address are saved as empty. */
export type SupplierInput = {
  name: string
  phone: string
  email: string
  address: string
  status: SupplierStatus
}

export type PurchaseItem = {
  purchase_item_id: number
  product_id: number
  product_name: string
  quantity: string
  unit_price: string
  line_discount_percent: string
  line_total: string
  batch_number: string | null
  expiry_date: string | null
}

/** A purchase without its lines, as the list shows it */
export type PurchaseSummary = {
  purchase_id: number
  purchase_number: string
  supplier_id: number
  supplier_name: string
  subtotal: string
  discount_amount: string
  tax_rate_id: number | null
  tax_percent: string
  tax_amount: string
  shipping_charge: string
  total_amount: string
  paid_amount: string
  due_amount: string
  payment_status: PaymentStatus
  status: string
  note: string | null
  created_by: number | null
  created_by_name: string | null
  created_at: string
  item_count: number
}

export type Purchase = PurchaseSummary & { items: PurchaseItem[] }

/** One line of a new purchase. Totals, VAT and the due are worked out by the server. */
export type NewPurchaseLine = {
  product_id: number
  quantity: number
  unit_price: string
  line_discount_percent: string
  /** Only for products with expiry tracking */
  batch_number: string | null
  expiry_date: string | null
}

export type PurchaseInput = {
  supplier_id: number
  items: NewPurchaseLine[]
  discount_amount: string
  tax_rate_id: number | null
  shipping_charge: string
  paid_amount: string
  /** Required when paid_amount is more than 0 */
  payment_method: PaymentMethod | null
  note: string | null
}

export type SupplierPayment = {
  supplier_payment_id: number
  supplier_id: number
  supplier_name: string
  purchase_id: number | null
  purchase_number: string | null
  amount: string
  method: PaymentMethod
  note: string | null
  created_by: number | null
  created_by_name: string | null
  created_at: string
}

export type SupplierPaymentInput = {
  supplier_id: number
  amount: string
  method: PaymentMethod
  /** Leave null to pay the supplier's oldest open purchases first */
  purchase_id: number | null
  note: string | null
}
