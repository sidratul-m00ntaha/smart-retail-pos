import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getAdjustments, createAdjustment } from '../../services/stock.service.ts'
import type { StockAdjustment } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { formatDateTime } from '../../utils/date.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './StockPage.module.css'

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
      {hasPermission('inventory.manage') && (
        <button onClick={() => setIsDrawerOpen(true)} style={{ marginBottom: 16 }}>
          New adjustment
        </button>
      )}

      {adjustments.length === 0 ? (
        <MessagePanel title="No adjustments yet">Manual stock corrections will appear here.</MessagePanel>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Change</th>
              <th>Reason</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            {adjustments.map((row) => (
              <tr key={row.stock_adjustment_id}>
                <td>{row.product_id}</td>
                <td className={row.quantity_change > 0 ? styles.ok : styles.lowStock}>
                  {row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}
                </td>
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
  const [productId, setProductId] = useState('')
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
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Save adjustment'}
          </button>
        </>
      }
    >
      {formError && <p style={{ color: 'var(--danger)', marginTop: 0 }}>{formError}</p>}
      <label>Product ID</label>
      <input type="number" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="14" />
      <label>Quantity change</label>
      <input
        type="number"
        value={quantityChange}
        onChange={(e) => setQuantityChange(e.target.value)}
        placeholder="-3 or 20"
      />
      <label>Reason</label>
      <input type="text" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Damaged in storage" />
    </Drawer>
  )
}