import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './ProductsPage.module.css'
import { ApiError } from '../../services/api'
import {
  getProducts,
  createProduct,
  updateProduct,
  setProductStatus,
  deleteProduct,
} from '../../services/product.service'
import {
  getCategories,
  getBrands,
  getUnits,
  getTaxRates,
} from '../../services/catalog.service'
import type { Product } from '../../types/product'
import type { Category, Brand, Unit, TaxRate } from '../../types/catalog'
import ProductDrawer from './ProductDrawer'
import { useToast } from './useToast'

const SWATCH_COLORS: Record<string, string> = {
  Grocery: '#1F5D4E',
  Dairy: '#6E8FBF',
  Snacks: '#C97A3D',
  Beverage: '#B54F45',
  'Personal care': '#8A6BBF',
  Household: '#5B655F',
}

function swatchColor(category: string) {
  return SWATCH_COLORS[category] ?? '#5B655F'
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function ProductsPage() {
  const { hasPermission } = useAuth()

  const canManageProducts = hasPermission('products.manage')

  const { message, showToast } = useToast()

  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [brands, setBrands] = useState<Brand[]>([])
  const [units, setUnits] = useState<Unit[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [statusFilter, setStatusFilter] =
    useState<'All' | 'active' | 'inactive'>('All')

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<Product | null>(null)

  async function loadAll() {
    setIsLoading(true)
    setError(null)

    try {
      const [p, c, b, u, t] = await Promise.all([
        getProducts(),
        getCategories(),
        getBrands(),
        getUnits(),
        getTaxRates(),
      ])

      setProducts(p)
      setCategories(c)
      setBrands(b)
      setUnits(u)
      setTaxRates(t)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load products.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true
    Promise.all([getProducts(), getCategories(), getBrands(), getUnits(), getTaxRates()])
      .then(([p, c, b, u, t]) => {
        if (!isCurrent) return
        setProducts(p)
        setCategories(c)
        setBrands(b)
        setUnits(u)
        setTaxRates(t)
      })
      .catch((err) => {
        if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load products.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()

    return products.filter((p) => {
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.product_code.toLowerCase().includes(q) ||
        (p.barcode ?? '').includes(q)

      const matchCat =
        categoryFilter === 'All' ||
        p.category?.name === categoryFilter

      const matchStatus =
        statusFilter === 'All' ||
        p.status === statusFilter

      return matchSearch && matchCat && matchStatus
    })
  }, [products, search, categoryFilter, statusFilter])

  const stats = useMemo(() => {
    const total = products.length
    const active = products.filter(
      (p) => p.status === 'active'
    ).length

    const low = products.filter(
      (p) =>
        p.status === 'active' &&
        p.current_quantity > 0 &&
        p.current_quantity <= p.reorder_level
    ).length

    const out = products.filter(
      (p) =>
        p.status === 'active' &&
        p.current_quantity === 0
    ).length

    return {
      total,
      active,
      inactive: total - active,
      low,
      out,
    }
  }, [products])

  function openDrawer(product: Product | null) {
    if (!canManageProducts) return

    setEditing(product)
    setDrawerOpen(true)
  }

  async function handleSaveProduct(
    data: Parameters<typeof createProduct>[0]
  ) {
    if (!canManageProducts) return

    try {
      if (editing) {
        await updateProduct(editing.product_id, data)
        showToast('Product updated.')
      } else {
        await createProduct(data)
        showToast('Product added.')
      }

      setDrawerOpen(false)
      setEditing(null)

      await loadAll()
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : 'Could not save product.'
      )
    }
  }

  async function handleToggleStatus(p: Product) {
    if (!canManageProducts) return

    try {
      await setProductStatus(
        p.product_id,
        p.status !== 'active'
      )

      showToast(
        `${p.name} marked ${
          p.status === 'active' ? 'inactive' : 'active'
        }.`
      )

      await loadAll()
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : 'Could not update status.'
      )
    }
  }

  async function handleDeleteProduct(p: Product) {
    if (!canManageProducts) return

    const confirmed = window.confirm(
      `Delete "${p.name}"? This action cannot be undone.`
    )

    if (!confirmed) return

    try {
      await deleteProduct(p.product_id)

      showToast('Product deleted.')

      await loadAll()
    } catch (err) {
      showToast(
        err instanceof ApiError
          ? err.message
          : 'Could not delete product.'
      )
    }
  }

  if (isLoading) {
    return <p>Loading…</p>
  }

  if (error) {
    return <p>{error}</p>
  }

  return (
    <section>
      <div className={styles.statStrip}>
        <div className={styles.statChip}>
          <span className={styles.n}>{stats.total}</span>
          &nbsp;total products
        </div>

        <div className={styles.statChip}>
          <span className={styles.n}>{stats.active}</span>
          &nbsp;active
        </div>

        <div className={styles.statChip}>
          <span className={styles.n}>{stats.inactive}</span>
          &nbsp;inactive
        </div>

        <div
          className={`${styles.statChip} ${styles.warn}`}
        >
          <span className={styles.n}>{stats.low}</span>
          &nbsp;low stock
        </div>

        <div
          className={`${styles.statChip} ${styles.bad}`}
        >
          <span className={styles.n}>{stats.out}</span>
          &nbsp;out of stock
        </div>
      </div>

      <div className={styles.toolbar}>
        <div className={styles.searchField}>
          <span className={styles.fieldIcon}>
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="m20 20-3.5-3.5" />
            </svg>
          </span>

          <input
            placeholder="Search by name, SKU or barcode"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className={styles.selectField}>
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value)
            }
          >
            <option value="All">All categories</option>

            {categories.map((c) => (
              <option
                key={c.category_id}
                value={c.name}
              >
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.statusTabs}>
          {(['All', 'active', 'inactive'] as const).map(
            (s) => (
              <button
                key={s}
                className={`${styles.statusTab} ${
                  statusFilter === s
                    ? styles.active
                    : ''
                }`}
                onClick={() => setStatusFilter(s)}
              >
                {s === 'All'
                  ? 'All'
                  : s[0].toUpperCase() + s.slice(1)}
              </button>
            )
          )}
        </div>

        <div className={styles.spacer} />

        {canManageProducts && (
          <button
            className={styles.btnPrimary}
            onClick={() => openDrawer(null)}
          >
            + Add product
          </button>
        )}
      </div>

      <div className={styles.tableCard}>
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Category</th>
              <th>Price</th>
              <th>Stock</th>
              <th>VAT</th>
              <th>Status</th>

              {canManageProducts && <th></th>}
            </tr>
          </thead>

          <tbody>
            {filtered.length === 0 && (
              <tr className={styles.emptyRow}>
                <td colSpan={canManageProducts ? 7 : 6}>
                  No products match these filters.
                </td>
              </tr>
            )}

            {filtered.map((p) => {
              const stockClass =
                p.current_quantity === 0
                  ? styles.out
                  : p.current_quantity <= p.reorder_level
                    ? styles.low
                    : ''

              const stockLabel =
                p.current_quantity === 0
                  ? 'Out of stock'
                  : `${p.current_quantity} in stock`

              return (
                <tr
                  key={p.product_id}
                  className="row"
                  onClick={() =>
                    canManageProducts &&
                    openDrawer(p)
                  }
                >
                  <td>
                    <div className={styles.pCell}>
                      <div
                        className={styles.pSwatch}
                        style={{
                          background: swatchColor(
                            p.category?.name ?? ''
                          ),
                        }}
                      >
                        {initials(p.name)}
                      </div>

                      <div>
                        <p className={styles.pName}>
                          {p.name}
                        </p>

                        <p className={styles.pSub}>
                          {p.product_code} ·{' '}
                          {p.barcode ?? '—'}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td>
                    {p.category?.name ?? '—'}
                    <br />
                    <span className={styles.pSub}>
                      {p.brand?.name ?? '—'}
                    </span>
                  </td>

                  <td className={styles.mono}>
                    Tk {p.sale_price.toLocaleString()}
                    <br />
                    <span className={styles.pSub}>
                      cost Tk{' '}
                      {p.purchase_price.toLocaleString()}
                    </span>
                  </td>

                  <td
                    className={`${styles.mono} ${
                      styles.stockCell
                    } ${stockClass}`}
                  >
                    {stockLabel}
                  </td>

                  <td className={styles.mono}>
                    {p.tax_percent}%
                  </td>

                  <td>
                    <span
                      className={`${styles.pill} ${
                        styles[p.status]
                      }`}
                    >
                      {p.status}
                    </span>
                  </td>

                  {canManageProducts && (
                    <td
                      onClick={(e) =>
                        e.stopPropagation()
                      }
                    >
                      <div
                        className={styles.rowActions}
                      >
                        <button
                          className={styles.iconBtnSm}
                          onClick={() =>
                            openDrawer(p)
                          }
                          aria-label="Edit"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M12 20h9" />
                            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                          </svg>
                        </button>

                        <button
                          className={styles.iconBtnSm}
                          onClick={() =>
                            handleToggleStatus(p)
                          }
                          aria-label="Toggle status"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                            />
                            <path d="M8 12h8" />
                          </svg>
                        </button>

                        <button
                          className={styles.iconBtnSm}
                          onClick={() =>
                            handleDeleteProduct(p)
                          }
                          aria-label="Delete"
                        >
                          <svg
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <path d="M3 6h18" />
                            <path d="M8 6V4h8v2" />
                            <path d="M19 6l-1 14H6L5 6" />
                            <path d="M10 10v6" />
                            <path d="M14 10v6" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {canManageProducts && (
        <ProductDrawer
          open={drawerOpen}
          product={editing}
          categories={categories}
          brands={brands}
          units={units}
          taxRates={taxRates}
          onClose={() => {
            setDrawerOpen(false)
            setEditing(null)
          }}
          onSave={handleSaveProduct}
        />
      )}

      {message && (
        <div
          className={`${styles.toast} ${styles.show}`}
        >
          {message}
        </div>
      )}
    </section>
  )
}