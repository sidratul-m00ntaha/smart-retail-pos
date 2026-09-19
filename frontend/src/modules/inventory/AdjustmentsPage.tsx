import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getAdjustments, createAdjustment, getStock } from '../../services/stock.service.ts'
import type { StockAdjustment } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './StockPage.module.css'
import formStyles from './AdjustmentsPage.module.css'

export default function AdjustmentsPage() {
  const { hasPermission } = useAuth()
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  function loadAdjustments() {
    getAdjustments()
      .then(setAdjustments)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load adjustments.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(loadAdjustments, [])

  if (isLoading) return <MessagePanel title="Loading adjustments…" />
  if (error) return <MessagePanel title="Could not load adjustments">{error}</MessagePanel>

  return (
    <>
      <div className={formStyles.toolbarRow}>
        <p className={formStyles.toolbarText}>Manual corrections for damaged, lost, or miscounted stock.</p>
        {hasPermission('inventory.manage') && (
          <button onClick={() => setIsDrawerOpen(true)} className={formStyles.addButton}>
            + New adjustment
          </button>
        )}
      </div>

      {adjustments.length === 0 ? (
        <MessagePanel title="No adjustments yet">Manual stock corrections will appear here.</MessagePanel>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Change</th>
              <th>Balance after</th>
              <th>Reason</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((row) => (
              <tr key={row.stock_adjustment_id}>
                <td>{row.product_id}</td>
                <td className={row.quantity_change > 0 ? styles.qtyIn : styles.qtyOut}>
                  {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
                </td>
                <td>{row.balance_after}</td>
                <td>{row.reason}</td>
                <td>{formatDateTime(row.created_at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {isDrawerOpen && (
        <NewAdjustmentForm
          onClose={() => setIsDrawerOpen(false)}
          onSaved={() => {
            setIsDrawerOpen(false)
            loadAdjustments()
          }}
        />
      )}
    </>
  )
}

function NewAdjustmentForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [stockList, setStockList] = useState<{ product_id: number; current_stock: number }[]>([])
  const [productId, setProductId] = useState('')
  const [direction, setDirection] = useState<'dec' | 'inc'>('dec')
  const [quantity, setQuantity] = useState('')
  const [reason, setReason] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getStock().then(setStockList).catch(() => {})
  }, [])

  const currentStock = stockList.find((s) => s.product_id === Number(productId))?.current_stock
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
      await createAdjustment({
        product_id: Number(productId),
        quantity_change: direction === 'dec' ? -qtyNum : qtyNum,
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
          <button onClick={onClose} className={formStyles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className={formStyles.saveButton}>
            {isSaving ? 'Saving…' : 'Save adjustment'}
          </button>
        </>
      }
    >
      {formError && <p className={formStyles.formError}>{formError}</p>}

      <label className={formStyles.formLabel}>Product ID</label>
      <input
        type="number"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        placeholder="14"
        className={formStyles.formInput}
      />

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
      <input
        type="text"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Damaged in storage"
        className={formStyles.formInput}
      />

      <div className={`${formStyles.previewBox} ${wouldGoNegative ? formStyles.err : ''}`}>
        {currentStock === undefined
          ? 'Enter a valid product ID to preview the new balance.'
          : qtyNum <= 0
          ? 'Enter a quantity to preview the new balance.'
          : wouldGoNegative
          ? `Stock cannot go below zero. Maximum decrease is ${currentStock}.`
          : `New balance after this adjustment: ${newBalance} (currently ${currentStock}).`}
      </div>
    </Drawer>
  )
}