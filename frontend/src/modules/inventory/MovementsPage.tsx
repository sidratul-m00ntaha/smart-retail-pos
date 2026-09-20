import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getMovements } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { StockMovement } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { formatDateTime } from '../../utils/date.ts'
import styles from './StockPage.module.css'

type TypeFilter = 'all' | 'purchase' | 'sale' | 'adjustment' | 'batch'

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all')

  useEffect(() => {
    getMovements()
      .then(setMovements)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load movements.'))
      .finally(() => setIsLoading(false))
  }, [])
  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  const productNames = new Map<number, string>()
  for (const p of products) {
    productNames.set(p.product_id, p.name)
  }
  function nameFor(productId: number): string {
    return productNames.get(productId) ?? `Product #${productId}`
  }

  if (isLoading) return <MessagePanel title="Loading movements…" />
  if (error) return <MessagePanel title="Could not load movements">{error}</MessagePanel>
  if (movements.length === 0) {
    return <MessagePanel title="No movements yet">Stock in/out history appears here once purchases or sales are recorded.</MessagePanel>
  }

  const filtered = movements.filter((row) => {
    if (typeFilter !== 'all' && row.source !== typeFilter) return false
    if (search) {
      const term = search.trim().toLowerCase()
      const matchesProduct = String(row.product_id).includes(term) || nameFor(row.product_id).toLowerCase().includes(term)
      const matchesRef = row.reference_id !== null && String(row.reference_id).includes(term)
      if (!matchesProduct && !matchesRef) return false
    }
    return true
  })

  return (
    <>
      <div className={styles.toolbar}>
        <input
          type="text"
          className={styles.searchField}
          placeholder="Search product name or reference"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.selectField}
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
        >
          <option value="all">All types</option>
          <option value="purchase">Purchase</option>
          <option value="sale">Sale</option>
          <option value="adjustment">Adjustment</option>
          <option value="batch">Batch</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <MessagePanel title="No matching movements">Try a different search or type filter.</MessagePanel>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>When</th>
              <th>Product</th>
              <th>Type</th>
              <th>Qty in</th>
              <th>Qty out</th>
              <th>Balance after</th>
              <th>Reference</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.stock_movement_id}>
                <td>{formatDateTime(row.created_at)}</td>
                <td>{nameFor(row.product_id)}</td>
                <td>
                  <span className={`${styles.typePill} ${styles[row.source] ?? ''}`}>
                    {row.source.charAt(0).toUpperCase() + row.source.slice(1)}
                  </span>
                </td>
                <td className={styles.qtyIn}>{row.movement_type === 'in' ? `+${row.quantity}` : '—'}</td>
                <td className={styles.qtyOut}>{row.movement_type === 'out' ? `-${row.quantity}` : '—'}</td>
                <td>{row.running_balance}</td>
                <td>{row.reference_id ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  )
}