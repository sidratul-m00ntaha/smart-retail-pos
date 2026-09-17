import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 1. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const activityLogsSection: NavSection = {
  label: 'Activity Logs',
  icon: 'activity',
  owner: 'Module 1 – Auth & Administration',
  items: [{ label: 'Activity Logs', path: '/activity-logs', permission: 'activity_logs.view' }],
}
