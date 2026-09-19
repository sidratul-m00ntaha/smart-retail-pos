import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getStock, createAdjustment } from '../../services/stock.service.ts'
import type { ProductStock } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './StockPage.module.css'

export default function StockPage() {
  const { hasPermission } = useAuth()
  const [stock, setStock] = useState<ProductStock[]>([])
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

  if (isLoading) return <MessagePanel title="Loading stock…" />
  if (error) return <MessagePanel title="Could not load stock">{error}</MessagePanel>
  if (stock.length === 0) {
    return <MessagePanel title="No stock yet">Stock levels appear here once products exist and purchases are recorded.</MessagePanel>
  }

  const lowCount = stock.filter((row) => row.is_low_stock).length
  const outCount = stock.filter((row) => row.current_stock === 0).length

  const filtered = stock.filter((row) => {
    if (lowOnly && !row.is_low_stock) return false
    if (search && !String(row.product_id).includes(search.trim())) return false
    return true
  })

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
          placeholder="Search by product ID"
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
              <th>Product ID</th>
              <th>Current stock</th>
              <th>Reorder level</th>
              <th>Status</th>
              <th>Last updated</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row) => (
              <tr key={row.product_stock_id}>
                <td>{row.product_id}</td>
                <td>{row.current_stock}</td>
                <td>{row.reorder_level}</td>
                <td>
                  {row.is_low_stock ? (
                    <span className={`${styles.statusPill} ${styles.low}`}>Low</span>
                  ) : (
                    <span className={`${styles.statusPill} ${styles.normal}`}>Normal</span>
                  )}
                </td>
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
            ))}
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
  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '')
  const [quantityChange, setQuantityChange] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

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
      <label className={styles.formLabel}>Product ID</label>
      <input
        type="number"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        placeholder="14"
        className={styles.formInput}
        readOnly={!!initialProductId}
      />
      <label className={styles.formLabel}>Quantity change</label>
      <input
        type="number"
        value={quantityChange}
        onChange={(e) => setQuantityChange(e.target.value)}
        placeholder="-3 or 20"
        className={styles.formInput}
      />
      <label className={styles.formLabel}>Reason</label>
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Damaged in storage"
        className={styles.formInput}
      />
    </Drawer>
  )
}