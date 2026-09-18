// frontend/src/services/customers.ts
import { API_BASE_URL } from "./api"; // Ensure this matches your frontend/.env variable name

export interface Customer {
  customer_id: number;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  credit_limit: string; // Kept as string to safely represent Decimal from backend
  outstanding_due: string;
  loyalty_points: number;
  status: string;
  available_credit: string;
}

const getToken = () => localStorage.getItem("smart-retail-pos.token");  // Module 1 saves the JWT here

export async function listCustomers(): Promise<Customer[]> {
  const res = await fetch(`${API_BASE_URL}/api/customers/`, {
    headers: {
      "Authorization": `Bearer ${getToken()}`,
      "Accept": "application/json"
    }
  });
  if (!res.ok) throw new Error("Failed to fetch customers");
  return res.json();
}

export async function createCustomer(data: Partial<Customer>): Promise<Customer> {
  const res = await fetch(`${API_BASE_URL}/api/customers/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${getToken()}`
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create customer");
  return res.json();
}