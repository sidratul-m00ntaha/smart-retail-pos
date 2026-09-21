import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getAdjustments, createAdjustment } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { StockAdjustment } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import AdjustmentForm from './AdjustmentForm.tsx'
import styles from './StockPage.module.css'
import formStyles from './AdjustmentsPage.module.css'

export default function AdjustmentsPage() {
  const { hasPermission } = useAuth()
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [lastSaved, setLastSaved] = useState<StockAdjustment | null>(null)
  const [isUndoing, setIsUndoing] = useState(false)

  function loadAdjustments() {
    getAdjustments()
      .then(setAdjustments)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load adjustments.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(loadAdjustments, [])
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

  async function handleUndo() {
    if (!lastSaved) return
    setIsUndoing(true)
    try {
      await createAdjustment({
        product_id: lastSaved.product_id,
        quantity_change: -lastSaved.quantity_change,
        reason: `Undo of adjustment #${lastSaved.stock_adjustment_id}`,
      })
      setLastSaved(null)
      loadAdjustments()
    } catch {
      // If undo fails (e.g. would go negative), just leave the banner as-is.
    } finally {
      setIsUndoing(false)
    }
  }

  if (isLoading) return <MessagePanel title="Loading adjustments…" />
  if (error) return <MessagePanel title="Could not load adjustments">{error}</MessagePanel>

  const reasonCounts = new Map<string, number>()
  for (const row of adjustments) {
    const key = `${row.product_id}::${row.reason.toLowerCase().trim()}`
    reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1)
  }

  const globalReasonCounts = new Map<string, number>()
  for (const row of adjustments) {
    const key = row.reason.trim()
    globalReasonCounts.set(key, (globalReasonCounts.get(key) ?? 0) + 1)
  }
  const topReasons = [...globalReasonCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
  const maxCount = topReasons[0]?.[1] ?? 1

  return (
    <>
      {lastSaved && (
        <div className={formStyles.undoBanner}>
          <span>
            Adjusted {nameFor(lastSaved.product_id)} by {lastSaved.quantity_change > 0 ? '+' : ''}
            {lastSaved.quantity_change}.
          </span>
          <button className={formStyles.undoLink} onClick={handleUndo} disabled={isUndoing}>
            {isUndoing ? 'Undoing…' : 'Undo'}
          </button>
        </div>
      )}

      <div className={formStyles.toolbarRow}>
        <p className={formStyles.toolbarText}>Manual corrections for damaged, lost, or miscounted stock.</p>
        {hasPermission('inventory.manage') && (
          <button onClick={() => setIsDrawerOpen(true)} className={formStyles.addButton}>
            + New adjustment
          </button>
        )}
      </div>

      {topReasons.length > 0 && (
        <div className={formStyles.reasonSummary}>
          {topReasons.map(([reason, count]) => (
            <div key={reason} className={formStyles.reasonBar}>
              <span className={formStyles.reasonLabel}>{reason}</span>
              <div className={formStyles.barTrack}>
                <div className={formStyles.barFill} style={{ width: `${(count / maxCount) * 100}%` }} />
              </div>
              <span className={formStyles.reasonCount}>{count}</span>
            </div>
          ))}
        </div>
      )}

      {adjustments.length === 0 ? (
        <MessagePanel title="No adjustments yet">Manual stock corrections will appear here.</MessagePanel>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product</th>
              <th>Change</th>
              <th>Balance after</th>
              <th>Reason</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((row) => (
              <tr key={row.stock_adjustment_id}>
                <td>{nameFor(row.product_id)}</td>
                <td className={row.quantity_change > 0 ? styles.qtyIn : styles.qtyOut}>
                  {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
                </td>
                <td>{row.balance_after}</td>
                <td>
                  {row.reason}
                  {(reasonCounts.get(`${row.product_id}::${row.reason.toLowerCase().trim()}`) ?? 0) >= 3 && (
                    <span className={formStyles.recurringBadge}>
                      ⚠ happened {reasonCounts.get(`${row.product_id}::${row.reason.toLowerCase().trim()}`)}×
                    </span>
                  )}
                </td>
                <td>{formatDateTime(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isDrawerOpen && (
        <AdjustmentForm
          onClose={() => setIsDrawerOpen(false)}
          onSaved={(created) => {
            setIsDrawerOpen(false)
            setLastSaved(created)
            loadAdjustments()
          }}
        />
      )}
    </>
  )
}