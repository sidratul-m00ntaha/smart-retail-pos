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