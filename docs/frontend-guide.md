# Frontend guide

How the React app is organised, and how to add your module's pages. Read this before building a page.

## Where things are

```text
frontend/src/
├── App.tsx                  page routes – built automatically from the navigation files (don't edit)
├── main.tsx                 starts the app
├── index.css                colours and fonts for the whole app (from the prototype)
├── config/navigation.ts     sidebar order (don't edit)
├── components/
│   ├── layout/              sidebar, top bar, page tabs, permission check (Module 1)
│   └── common/              shared pieces, e.g. MessagePanel
├── hooks/useAuth.ts         who is logged in
├── services/
│   ├── api.ts               apiRequest() – use it for every backend call
│   └── auth.service.ts      login calls (Module 1)
├── types/                   TypeScript types
└── modules/<your-module>/   YOUR pages, components and navigation.ts
```

## Adding a page

Every sidebar entry already exists and shows **"Coming soon"** with its owner. Each module owns its own `navigation.ts`, so nobody has to edit shared files to add a page:

| Module | Your navigation file(s) in `frontend/src/modules/` |
|---|---|
| 1 | `ai-assistant/`, `activity-logs/`, `users/`, `settings/` (Store) |
| 2 | `dashboard/`, `products/`, `reports/`, and the **VAT Rates** entry in `settings/` |
| 3 | `purchases/` (Purchases, Suppliers, Supplier Payments) |
| 4 | `inventory/` |
| 5 | `pos/`, `sales/` |
| 6 | `customers/` |

**1. Create your page component**, e.g. `frontend/src/modules/products/ProductsPage.tsx`:

```tsx
export default function ProductsPage() {
  return <p>Products list goes here</p>
}
```

**2. Connect it** in your `navigation.ts` – import it and add `page:` to the matching entry:

```ts
import type { NavSection } from '../../types/navigation.ts'
import ProductsPage from './ProductsPage.tsx'

export const productsSection: NavSection = {
  // ...
  items: [
    { label: 'Products', path: '/products', permission: 'products.manage', page: ProductsPage },
    // ...
  ],
}
```

**3. Open the page** – the sidebar, top bar, tabs and permission check work automatically.

- **Page without a tab** (e.g. a product's detail page): add an entry with `hidden: true` and a path such as `'/products/:productId'`. Read the id with `useParams()` from `react-router`.
- **Link to another page:** `import { Link } from 'react-router'` then `<Link to="/products/categories">Categories</Link>`.
- `permission` hides the page from roles that can't use it. Use the codes from [docs/database/module-1-auth-admin.md](database/module-1-auth-admin.md#roles-and-permissions).

## Calling the backend

Put your calls in `frontend/src/services/<module>.service.ts` and use `apiRequest` – it adds the login token and turns error answers into readable messages:

```ts
import type { Product, NewProduct } from '../types/product.ts'
import { apiRequest } from './api.ts'

export function getProducts(): Promise<Product[]> {
  return apiRequest<Product[]>('/api/products')
}

export function createProduct(data: NewProduct): Promise<Product> {
  return apiRequest<Product>('/api/products', { method: 'POST', body: data })
}
```

In your page, show a **loading state** and a **clear error message** (PRD section 9):

```tsx
import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getProducts } from '../../services/product.service.ts'
import type { Product } from '../../types/product.ts'

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load products.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>{error}</p>
  return <ul>{products.map((product) => <li key={product.product_id}>{product.name}</li>)}</ul>
}
```

If the user's login has expired, `apiRequest` logs them out and shows the sign-in page – you don't need to handle that.

## Who is logged in

```tsx
import { useAuth } from '../../hooks/useAuth.ts'

const { user, hasPermission } = useAuth()

{hasPermission('products.manage') && <button>Add product</button>}
```

Hiding a button is only for a tidy screen – the real protection is `require_permission` on the backend endpoint.

## Ready-made pieces

| Use | For |
|---|---|
| `components/ui/Drawer.tsx` | A side panel for add/edit forms (closes with Escape or ✕) |
| `components/common/MessagePanel.tsx` | Loading, error, empty and "not allowed" messages |
| `utils/date.ts` → `formatDateTime(value)` | Showing API dates in local time, e.g. "17 Sep 2026, 16:05" |
| `utils/text.ts` → `initials(name)` | Avatar letters, e.g. "Maria Akter" → "MA" |

**Complete example to copy:** the Users page in `frontend/src/modules/users/` – a list with search and filters, an add/edit form in a `Drawer`, validation, loading and error states, and a refresh after saving.

## Styling

- Use the colour variables from `src/index.css`: `var(--teal)`, `var(--amber)`, `var(--border)`, `var(--danger)`, `var(--ink-soft)` …
- Put styles in a **CSS Module** next to your component, e.g. `ProductsPage.module.css`, and use them with `import styles from './ProductsPage.module.css'` and `className={styles.table}`. Class names in CSS Modules can't clash with other modules' styles.
- Copy the look from the matching page in `docs/prototype/`.

## Before you push

In the `frontend` folder, both must succeed:

```bat
npm run lint
npm run build
```
