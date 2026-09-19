export type SupplierStatus = "Active" | "Inactive";
export type PaymentMethod = "Cash" | "Bank" | "Digital";

export interface Supplier {
  SupplierID: number;
  Name: string;
  Phone: string;
  Email?: string | null;
  Address?: string | null;
  Status: SupplierStatus;
  TotalPurchases: number;
  Due: number;
  CreatedAt: string;
}

export interface SupplierInput {
  Name: string;
  Phone: string;
  Email?: string;
  Address?: string;
  Status: SupplierStatus;
}

export interface SupplierPaymentInput {
  Amount: number;
  Method: PaymentMethod;
  PurchaseID?: number;
}

export interface PurchaseItem {
  PurchaseItemID?: number;
  ProductID: number;
  ProductName?: string;
  Quantity: number;
  UnitPrice: number;
  LineTotal?: number;
}

export interface Purchase {
  PurchaseID: number;
  PurchaseNo: string;
  SupplierID: number;
  SupplierName?: string;
  PurchaseDate: string;
  Subtotal: number;
  Discount: number;
  VAT: number;
  Total: number;
  Paid: number;
  Due: number;
  Status: string;
  Items: PurchaseItem[];
}

export interface PurchaseInput {
  SupplierID: number;
  Items: { ProductID: number; Quantity: number; UnitPrice: number }[];
  Discount: number;
  VATRate: number;
  Paid: number;
}

export interface SupplierPayment {
  PaymentID: number;
  SupplierID: number;
  SupplierName?: string;
  PurchaseID?: number | null;
  PurchaseNo?: string | null;
  Amount: number;
  Method: PaymentMethod;
  PaymentDate: string;
}

// Minimal shape Module 2's product lookup will eventually return.
export interface ProductLite {
  ProductID: number;
  Name: string;
  PurchasePrice: number;
}
