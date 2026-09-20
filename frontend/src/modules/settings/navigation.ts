import type { NavSection } from '../../types/navigation.ts'
import StoreSettingsPage from './StoreSettingsPage.tsx'
import VatRatesPage from './VatRatesPage.tsx'

// Owned by Module 1 (the VAT Rates entry belongs to Module 2).
// When a page is built, import it and add `page: YourPage` to its entry. See docs/frontend-guide.md
export const settingsSection: NavSection = {
  label: 'Settings',
  icon: 'settings',
  owner: 'Module 1 – Auth & Administration',
  items: [
    { label: 'Store', path: '/settings', permission: 'settings.manage', page: StoreSettingsPage },
    {
      label: 'VAT Rates',
      path: '/settings/vat-rates',
      permission: 'tax_rates.manage',
      owner: 'Module 2 – Product Catalog, Dashboard & Reports',
      page: VatRatesPage,
    },
  ],
}
