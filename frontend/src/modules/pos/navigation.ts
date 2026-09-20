import type { NavSection } from '../../types/navigation.ts'
import PosPage from './PosPage.tsx'

// Owned by Module 5. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const posSection: NavSection = {
  label: 'POS',
  icon: 'pos',
  owner: 'Module 5 – POS, Sales & Invoices',
  items: [{ label: 'POS', path: '/pos', permission: 'pos.sell', page: PosPage }],
}
