import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getStock } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { ProductStock } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import AdjustmentForm from './AdjustmentForm.tsx'
import styles from './StockPage.module.css'

type StatusFilter = 'all' | 'low' | 'out'

export default function StockPage() {
  const { hasPermission } = useAuth()
  const [stock, setStock] = useState<ProductStock[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [quickAdjustProductId, setQuickAdjustProductId] = useState<number | null>(null)

  function loadStock() {
    getStock()
      .then(setStock)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load stock.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(loadStock, [])
  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  const productById = new Map<number, Product>()
  for (const p of products) {
    productById.set(p.product_id, p)
  }
  function nameFor(productId: number): string {
    const p = productById.get(productId)
    if (!p) return `Product #${productId}`
    return p.brand?.name ? `${p.name} (${p.brand.name})` : p.name
  }

  if (isLoading) return <MessagePanel title="Loading stock…" />
  if (error) return <MessagePanel title="Could not load stock">{error}</MessagePanel>
  if (stock.length === 0) {
    return <MessagePanel title="No stock yet">Stock levels appear here once products exist and purchases are recorded.</MessagePanel>
  }

  const lowCount = stock.filter((row) => row.is_low_stock && row.current_stock > 0).length
  const outCount = stock.filter((row) => row.current_stock === 0).length

  const filtered = stock.filter((row) => {
    if (statusFilter === 'low' && !(row.is_low_stock && row.current_stock > 0)) return false
    if (statusFilter === 'out' && row.current_stock !== 0) return false
    if (search) {
      const term = search.trim().toLowerCase()
      const matchesId = String(row.product_id).includes(term)
      const matchesName = nameFor(row.product_id).toLowerCase().includes(term)
      if (!matchesId && !matchesName) return false
    }
    return true
  })

  function suggestedReorder(row: ProductStock): number {
    const target = row.reorder_level * 2
    return Math.max(target - row.current_stock, 0)
  }

  return (
    <>
      <div className={styles.statStrip}>
        <div className={styles.statChip}>
          <span className={styles.n}>{stock.length}</span> products tracked
        </div>
        {lowCount > 0 && (
          <div className={`${styles.statChip} ${styles.warn}`}>
            <span className={styles.n}>{lowCount}</span> low stock
          </div>
        )}
        {outCount > 0 && (
          <div className={`${styles.statChip} ${styles.bad}`}>
            <span className={styles.n}>{outCount}</span> out of stock
          </div>
        )}
      </div>

      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchField}
          placeholder="Search by product name or ID"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.selectField}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
        >
          <option value="all">All products</option>
          <option value="low">Running low only</option>
          <option value="out">Out of stock only</option>
        </select>
        <div className={styles.spacer} />
        {hasPermission('inventory.manage') && (
          <button className={styles.addButton} onClick={() => setQuickAdjustProductId(0)}>
            + New adjustment
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <MessagePanel title="No matching products">Try a different search or filter.</MessagePanel>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Current stock</th>
              <th>Reorder level</th>
              <th>Status</th>
              <th>Suggested reorder</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => {
              const suggestion = suggestedReorder(row)
              return (
                <tr key={row.product_stock_id}>
                  <td>{nameFor(row.product_id)}</td>
                  <td>{row.current_stock}</td>
                  <td>{row.reorder_level}</td>
                  <td>
                    {row.current_stock === 0 ? (
                      <span className={`${styles.statusPill} ${styles.bad}`}>Out of stock</span>
                    ) : row.is_low_stock ? (
                      <span className={`${styles.statusPill} ${styles.low}`}>Running low</span>
                    ) : (
                      <span className={`${styles.statusPill} ${styles.normal}`}>Normal</span>
                    )}
                  </td>
                  <td>{row.is_low_stock && suggestion > 0 ? `Order ${suggestion}` : '—'}</td>
                  <td>{formatDateTime(row.updated_at)}</td>
                  <td>
                    {hasPermission('inventory.manage') && (
                      <button
                        className={styles.iconBtnSm}
                        title="Quick adjust"
                        onClick={() => setQuickAdjustProductId(row.product_id)}
                      >
                        +
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}

      {quickAdjustProductId !== null && (
        <AdjustmentForm
          initialProductId={quickAdjustProductId || undefined}
          onClose={() => setQuickAdjustProductId(null)}
          onSaved={() => {
            setQuickAdjustProductId(null)
            loadStock()
          }}
        />
      )}
    </>
  )
}