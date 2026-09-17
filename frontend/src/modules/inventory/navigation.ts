import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 4. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const inventorySection: NavSection = {
  label: 'Inventory',
  icon: 'inventory',
  owner: 'Module 4 – Inventory & Expiry',
  items: [
    { label: 'Stock', path: '/inventory', permission: 'inventory.manage' },
    { label: 'Movements', path: '/inventory/movements', permission: 'inventory.manage' },
    { label: 'Adjustments', path: '/inventory/adjustments', permission: 'inventory.manage' },
    { label: 'Expiry Alerts', path: '/inventory/expiry-alerts', permission: 'inventory.manage' },
  ],
}
