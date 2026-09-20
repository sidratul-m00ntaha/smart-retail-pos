import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getAdjustments, createAdjustment, getStock } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { StockAdjustment } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
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

  const productNames = new Map<number, string>()
  for (const p of products) {
    productNames.set(p.product_id, p.name)
  }
  function nameFor(productId: number): string {
    return productNames.get(productId) ?? `Product #${productId}`
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

  // Aggregate reason counts across all products, for the summary bar chart.
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
        <NewAdjustmentForm
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

function NewAdjustmentForm({
  onClose,
  onSaved,
}: {
  onClose: () => void
  onSaved: (created: StockAdjustment) => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [stockList, setStockList] = useState<{ product_id: number; current_stock: number }[]>([])
  const [productId, setProductId] = useState('')
  const [direction, setDirection] = useState<'dec' | 'inc'>('dec')
  const [quantity, setQuantity] = useState('')
  const [reasonChoice, setReasonChoice] = useState('')
  const [customReason, setCustomReason] = useState('')
  const reason = reasonChoice === 'Other' ? customReason : reasonChoice
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getStock().then(setStockList).catch(() => {})
    getProducts().then(setProducts).catch(() => {})
  }, [])

  // Prefer the live ProductStock number; if this product has no ProductStock row
  // yet (e.g. freshly seeded, never adjusted before), fall back to the product's
  // own current_quantity so the preview isn't blank for untouched products.
  const stockRow = stockList.find((s) => s.product_id === Number(productId))
  const productRow = products.find((p) => p.product_id === Number(productId))
  const currentStock = stockRow?.current_stock ?? productRow?.current_quantity

  const qtyNum = Number(quantity) || 0
  const newBalance = currentStock !== undefined ? (direction === 'dec' ? currentStock - qtyNum : currentStock + qtyNum) : null
  const wouldGoNegative = newBalance !== null && newBalance < 0

  async function handleSave() {
    if (!productId || !quantity || Number(quantity) <= 0 || !reason.trim()) {
      setFormError('Fill in every field with a quantity of at least 1.')
      return
    }
    if (wouldGoNegative) {
      setFormError(`Stock cannot go below zero. Maximum decrease is ${currentStock}.`)
      return
    }
    setFormError(null)
    setIsSaving(true)
    try {
      const created = await createAdjustment({
        product_id: Number(productId),
        quantity_change: direction === 'dec' ? -qtyNum : qtyNum,
        reason: reason.trim(),
      })
      onSaved(created)
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save the adjustment.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title="New adjustment"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={formStyles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className={formStyles.saveButton}>
            {isSaving ? 'Saving…' : 'Save adjustment'}
          </button>
        </>
      }
    >
      {formError && <p className={formStyles.formError}>{formError}</p>}

      <label className={formStyles.formLabel}>Product</label>
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className={formStyles.selectField}
      >
        <option value="">Select a product…</option>
        {products.map((p) => (
          <option key={p.product_id} value={p.product_id}>
            {p.name}
          </option>
        ))}
      </select>

      <label className={formStyles.formLabel}>Current stock</label>
      <div className={formStyles.readonlyBox}>
        {currentStock !== undefined ? `${currentStock} in stock` : '—'}
      </div>

      <label className={formStyles.formLabel}>Adjustment direction</label>
      <div className={formStyles.dirTabs}>
        <button
          type="button"
          className={`${formStyles.dirTab} ${direction === 'dec' ? formStyles.decActive : ''}`}
          onClick={() => setDirection('dec')}
        >
          Decrease
        </button>
        <button
          type="button"
          className={`${formStyles.dirTab} ${direction === 'inc' ? formStyles.incActive : ''}`}
          onClick={() => setDirection('inc')}
        >
          Increase
        </button>
      </div>

      <label className={formStyles.formLabel}>Quantity</label>
      <input
        type="number"
        min="1"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        placeholder="0"
        className={formStyles.formInput}
      />

      <label className={formStyles.formLabel}>Reason</label>
      <select
        value={reasonChoice}
        onChange={(e) => setReasonChoice(e.target.value)}
        className={formStyles.selectField}
      >
        <option value="">Select a reason…</option>
        <option value="Damaged in storage">Damaged in storage</option>
        <option value="Damaged in transit">Damaged in transit</option>
        <option value="Expired">Expired</option>
        <option value="Stolen / missing">Stolen / missing</option>
        <option value="Miscounted (stock recount)">Miscounted (stock recount)</option>
        <option value="Found stock (misplaced/mislabeled)">Found stock (misplaced/mislabeled)</option>
        <option value="Initial stock correction">Initial stock correction</option>
        <option value="Other">Other (type your own)</option>
      </select>
      {reasonChoice === 'Other' && (
        <input
          type="text"
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Type the reason"
          className={formStyles.formInput}
          style={{ marginTop: 8 }}
        />
      )}

      <div className={`${formStyles.previewBox} ${wouldGoNegative ? formStyles.err : ''}`}>
        {currentStock === undefined
          ? 'Select a product to preview the new balance.'
          : qtyNum <= 0
          ? 'Enter a quantity to preview the new balance.'
          : wouldGoNegative
          ? `Stock cannot go below zero. Maximum decrease is ${currentStock}.`
          : `New balance after this adjustment: ${newBalance} (currently ${currentStock}).`}
      </div>
    </Drawer>
  )
}