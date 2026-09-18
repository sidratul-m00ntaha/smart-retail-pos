import type { NavSection } from '../../types/navigation.ts'
import CustomersPage from './CustomersPage'
import DuePaymentsPage from './DuePaymentsPage'
import LoyaltyPage from './LoyaltyPage' // <-- Add this import

export const customersSection: NavSection = {
  label: 'Customers',
  icon: 'customers',
  owner: 'Module 6 – Customers, Dues & Loyalty',
  items: [
    { 
      label: 'Customers', 
      path: '/customers', 
      permission: 'customers.manage',
      page: CustomersPage 
    },
    { 
      label: 'Due Payments', 
      path: '/customers/due-payments', 
      permission: 'customer_dues.receive',
      page: DuePaymentsPage 
    },
    { 
      label: 'Loyalty', 
      path: '/customers/loyalty', 
      permission: 'loyalty.configure',
      page: LoyaltyPage // <-- Add the page component here!
    },
  ],
}