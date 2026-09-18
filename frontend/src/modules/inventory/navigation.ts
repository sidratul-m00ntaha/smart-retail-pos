import type { NavSection } from '../../types/navigation.ts'
import StockPage from './StockPage.tsx'
import MovementsPage from './MovementsPage.tsx'
import AdjustmentsPage from './AdjustmentsPage.tsx'

export const inventorySection: NavSection = {
  label: 'Inventory',
  icon: 'inventory',
  owner: 'Module 4 – Inventory & Expiry',
  items: [
    { label: 'Stock', path: '/inventory', permission: 'inventory.manage', page: StockPage },
    { label: 'Movements', path: '/inventory/movements', permission: 'inventory.manage', page: MovementsPage },
    { label: 'Adjustments', path: '/inventory/adjustments', permission: 'inventory.manage', page: AdjustmentsPage },
    { label: 'Expiry Alerts', path: '/inventory/expiry-alerts', permission: 'inventory.manage' },
  ],
}