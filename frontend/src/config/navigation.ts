import { matchPath } from 'react-router'
import { activityLogsSection } from '../modules/activity-logs/navigation.ts'
import { aiAssistantSection } from '../modules/ai-assistant/navigation.ts'
import { customersSection } from '../modules/customers/navigation.ts'
import { dashboardSection } from '../modules/dashboard/navigation.ts'
import { inventorySection } from '../modules/inventory/navigation.ts'
import { posSection } from '../modules/pos/navigation.ts'
import { productsSection } from '../modules/products/navigation.ts'
import { purchasingSection } from '../modules/purchases/navigation.ts'
import { salesSection } from '../modules/sales/navigation.ts'
import { settingsSection } from '../modules/settings/navigation.ts'
import { usersSection } from '../modules/users/navigation.ts'
import type { PermissionCode } from '../types/auth.ts'
import type { NavItem, NavSection } from '../types/navigation.ts'

// The sidebar, in the order from PRD section 9.
// Don't add pages here - each module edits its own src/modules/<module>/navigation.ts.
export const NAV_SECTIONS: NavSection[] = [
  dashboardSection,
  posSection,
  productsSection,
  purchasingSection,
  inventorySection,
  customersSection,
  salesSection,
  aiAssistantSection,
  activityLogsSection,
  usersSection,
  settingsSection,
]

type PermissionCheck = (code: PermissionCode) => boolean

/** The pages of a section that this user may open and that have a tab */
export function visibleItems(section: NavSection, hasPermission: PermissionCheck): NavItem[] {
  return section.items.filter((item) => !item.hidden && hasPermission(item.permission))
}

/** The section that a page address belongs to */
export function findSection(pathname: string): NavSection | undefined {
  return NAV_SECTIONS.find((section) =>
    section.items.some((item) => matchPath({ path: item.path, end: true }, pathname)),
  )
}

/** The first page this user may open - where they land after signing in */
export function homePathFor(hasPermission: PermissionCheck): string | null {
  for (const section of NAV_SECTIONS) {
    const [firstPage] = visibleItems(section, hasPermission)
    if (firstPage) return firstPage.path
  }
  return null
}
