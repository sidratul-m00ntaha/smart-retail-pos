import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getStock, createAdjustment } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { ProductStock } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './StockPage.module.css'

export default function StockPage() {
  const { hasPermission } = useAuth()
  const [stock, setStock] = useState<ProductStock[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [lowOnly, setLowOnly] = useState(false)
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

  // Lookup map: product_id -> product name, for display instead of raw IDs.
  const productNames = new Map<number, string>()
  for (const p of products) {
    productNames.set(p.product_id, p.name)
  }
  function nameFor(productId: number): string {
    return productNames.get(productId) ?? `Product #${productId}`
  }

  if (isLoading) return <MessagePanel title="Loading stock…" />
  if (error) return <MessagePanel title="Could not load stock">{error}</MessagePanel>
  if (stock.length === 0) {
    return <MessagePanel title="No stock yet">Stock levels appear here once products exist and purchases are recorded.</MessagePanel>
  }

  const lowCount = stock.filter((row) => row.is_low_stock).length
  const outCount = stock.filter((row) => row.current_stock === 0).length

  const filtered = stock.filter((row) => {
    if (lowOnly && !row.is_low_stock) return false
    if (search) {
      const term = search.trim().toLowerCase()
      const matchesId = String(row.product_id).includes(term)
      const matchesName = nameFor(row.product_id).toLowerCase().includes(term)
      if (!matchesId && !matchesName) return false
    }
    return true
  })

  function suggestedReorder(row: ProductStock): number {
    // Simple heuristic: bring stock up to double the reorder level.
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
        <label className={styles.checkField}>
          <input type="checkbox" checked={lowOnly} onChange={(e) => setLowOnly(e.target.checked)} />
          Low stock only
        </label>
        <div className={styles.spacer} />
        {hasPermission('inventory.manage') && (
          <button className={styles.addButton} onClick={() => setQuickAdjustProductId(0)}>
            + New adjustment
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <MessagePanel title="No matching products">Try a different search or turn off the low-stock filter.</MessagePanel>
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
                    {row.is_low_stock ? (
                      <span className={`${styles.statusPill} ${styles.low}`}>Low</span>
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
        <QuickAdjustForm
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

function QuickAdjustForm({
  initialProductId,
  onClose,
  onSaved,
}: {
  initialProductId?: number
  onClose: () => void
  onSaved: () => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '')
  const [quantityChange, setQuantityChange] = useState('')
  const [reasonChoice, setReasonChoice] = useState('')
  const [customReason, setCustomReason] = useState('')
  const reason = reasonChoice === 'Other' ? customReason : reasonChoice
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  async function handleSave() {
    if (!productId || !quantityChange || !reason.trim()) {
      setFormError('Fill in every field before saving.')
      return
    }
    setFormError(null)
    setIsSaving(true)
    try {
      await createAdjustment({
        product_id: Number(productId),
        quantity_change: Number(quantityChange),
        reason: reason.trim(),
      })
      onSaved()
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
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className={styles.saveButton}>
            {isSaving ? 'Saving…' : 'Save adjustment'}
          </button>
        </>
      }
    >
      {formError && <p className={styles.formError}>{formError}</p>}
      <label className={styles.formLabel}>Product</label>
      <select
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className={styles.formInput}
        disabled={!!initialProductId}
      >
        <option value="">Select a product…</option>
        {products.map((p) => (
          <option key={p.product_id} value={p.product_id}>
            {p.name}
          </option>
        ))}
      </select>
      <label className={styles.formLabel}>Quantity change</label>
      <input
        type="number"
        value={quantityChange}
        onChange={(e) => setQuantityChange(e.target.value)}
        placeholder="-3 or 20"
        className={styles.formInput}
      />
      <label className={styles.formLabel}>Reason</label>
      <select
        value={reasonChoice}
        onChange={(e) => setReasonChoice(e.target.value)}
        className={styles.formInput}
      >
        <option value="">Select a reason…</option>
        <option value="Restocking / new delivery">Restocking / new delivery</option>
        <option value="Stock recount">Stock recount</option>
        <option value="Out of stock correction">Out of stock correction</option>
        <option value="Damaged / spoiled">Damaged / spoiled</option>
        <option value="Other">Other (type your own)</option>
      </select>
      {reasonChoice === 'Other' && (
        <input
          type="text"
          value={customReason}
          onChange={(e) => setCustomReason(e.target.value)}
          placeholder="Type the reason"
          className={styles.formInput}
          style={{ marginTop: 8 }}
        />
      )}
    </Drawer>
  )
}