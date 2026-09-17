import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 2. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const dashboardSection: NavSection = {
  label: 'Dashboard',
  icon: 'dashboard',
  owner: 'Module 2 – Product Catalog, Dashboard & Reports',
  items: [{ label: 'Dashboard', path: '/dashboard', permission: 'reports.view' }],
}
