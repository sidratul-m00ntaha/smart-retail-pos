import type { NavSection } from '../../types/navigation.ts'
import ProductsPage from './ProductsPage.tsx'
import CategoriesPage from './CategoriesPage.tsx'
import BrandsPage from './BrandsPage.tsx'
import UnitsPage from './UnitsPage.tsx'

// Owned by Module 2. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const productsSection: NavSection = {
  label: 'Products',
  icon: 'products',
  owner: 'Module 2 – Product Catalog, Dashboard & Reports',
  items: [
    { label: 'Products', path: '/products', permission: 'products.view', page: ProductsPage },
{ label: 'Categories', path: '/products/categories', permission: 'products.view', page: CategoriesPage },
{ label: 'Brands', path: '/products/brands', permission: 'products.view', page: BrandsPage },
{ label: 'Units', path: '/products/units', permission: 'products.view', page: UnitsPage },
  ],
}

