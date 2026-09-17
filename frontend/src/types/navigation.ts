import type { ComponentType } from 'react'
import type { IconName } from '../components/layout/icons.tsx'
import type { PermissionCode } from './auth.ts'

/** One page of the app. */
export type NavItem = {
  /** Tab text, e.g. 'Categories' */
  label: string
  /** Page address, e.g. '/products/categories' */
  path: string
  /** Who may open this page */
  permission: PermissionCode
  /** Your page component. Leave it out until the page is built - "Coming soon" is shown instead. */
  page?: ComponentType
  /** true = a page without a tab, e.g. a detail page with path '/products/:productId' */
  hidden?: boolean
  /** Who builds this page, if not the section's owner */
  owner?: string
}

/** One sidebar entry. With 1 visible page it's a plain link; with 2 or more, the pages appear as tabs. */
export type NavSection = {
  label: string
  icon: IconName
  /** Who builds these pages, e.g. 'Module 2 – Product Catalog' */
  owner: string
  items: NavItem[]
}
