import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 3. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const purchasingSection: NavSection = {
  label: 'Purchasing',
  icon: 'purchasing',
  owner: 'Module 3 – Suppliers & Purchasing',
  items: [
    { label: 'Purchases', path: '/purchases', permission: 'purchases.manage' },
    { label: 'Suppliers', path: '/suppliers', permission: 'suppliers.manage' },
    { label: 'Supplier Payments', path: '/purchases/payments', permission: 'purchases.manage' },
  ],
}
