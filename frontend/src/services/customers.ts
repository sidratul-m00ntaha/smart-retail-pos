import { apiRequest } from "./api";

export interface Customer {
  customer_id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  credit_limit: string;
  outstanding_due: string;
  loyalty_points: number;
  status: string;
  available_credit: string;
}

export function listCustomers(): Promise<Customer[]> {
  return apiRequest<Customer[]>("/api/customers/");
}

export function createCustomer(data: Partial<Customer>): Promise<Customer> {
  return apiRequest<Customer>("/api/customers/", { 
    method: "POST", 
    body: data 
  });
}

export function updateCustomer(customer_id: number, data: Partial<Customer>): Promise<Customer> {
  return apiRequest<Customer>(`/api/customers/${customer_id}`, { 
    method: "PUT", 
    body: data 
  });
}
export function recordPayment(data: { customer_id: number; amount: number | string; method: string }): Promise<any> {
  return apiRequest<any>("/api/customers/payments", { 
    method: "POST", 
    body: data 
  });
}
export interface LoyaltyTier {
  loyalty_tier_id: number;
  name: string;
  required_points: number;
  discount_percent: number | string; // <-- CHANGE THIS LINE to allow both
}

export function listLoyaltyTiers(): Promise<LoyaltyTier[]> {
  return apiRequest<LoyaltyTier[]>("/api/customers/loyalty-tiers/");
}

export function createLoyaltyTier(data: Partial<LoyaltyTier>): Promise<LoyaltyTier> {
  return apiRequest<LoyaltyTier>("/api/customers/loyalty-tiers/", { 
    method: "POST", 
    body: data 
  });
}

export function updateLoyaltyTier(tier_id: number, data: Partial<LoyaltyTier>): Promise<LoyaltyTier> {
  return apiRequest<LoyaltyTier>(`/api/customers/loyalty-tiers/${tier_id}`, { 
    method: "PUT", 
    body: data 
  });
}