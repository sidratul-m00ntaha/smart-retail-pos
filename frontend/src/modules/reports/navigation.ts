import type { NavSection } from '../../types/navigation.ts'
import ReportsPage from './ReportsPage.tsx'

// Owned by Module 2. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const reportsSection: NavSection = {
  label: 'Reports',
  icon: 'reports',
  owner: 'Module 2 – Product Catalog, Dashboard & Reports',
  items: [{ label: 'Reports', path: '/reports', permission: 'reports.view', page: ReportsPage }],
}
