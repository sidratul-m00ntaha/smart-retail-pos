import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 6. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const customersSection: NavSection = {
  label: 'Customers',
  icon: 'customers',
  owner: 'Module 6 – Customers, Dues & Loyalty',
  items: [
    { label: 'Customers', path: '/customers', permission: 'customers.manage' },
    { label: 'Due Payments', path: '/customers/due-payments', permission: 'customer_dues.receive' },
    { label: 'Loyalty', path: '/customers/loyalty', permission: 'loyalty.configure' },
  ],
}
