import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 5. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const salesSection: NavSection = {
  label: 'Sales',
  icon: 'sales',
  owner: 'Module 5 – POS, Sales & Invoices',
  items: [
    { label: 'Sales', path: '/sales', permission: 'sales.view' },
    { label: 'Invoices', path: '/sales/invoices', permission: 'sales.view' },
  ],
}
