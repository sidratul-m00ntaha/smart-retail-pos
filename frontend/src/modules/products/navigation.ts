import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 2. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const productsSection: NavSection = {
  label: 'Products',
  icon: 'products',
  owner: 'Module 2 – Product Catalog, Dashboard & Reports',
  items: [
    { label: 'Products', path: '/products', permission: 'products.manage' },
    { label: 'Categories', path: '/products/categories', permission: 'products.manage' },
    { label: 'Brands', path: '/products/brands', permission: 'products.manage' },
    { label: 'Units', path: '/products/units', permission: 'products.manage' },
  ],
}
