import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 1. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const usersSection: NavSection = {
  label: 'Users',
  icon: 'users',
  owner: 'Module 1 – Auth & Administration',
  items: [{ label: 'Users', path: '/users', permission: 'users.manage' }],
}
