import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getExpiryAlerts, addBatch, createAdjustment } from '../../services/stock.service.ts'
import type { StockBatch } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './ExpiryAlertsPage.module.css'

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / 86400000)
}

type Filter = 'all' | 'expired' | 'within7' | 'within30'

export default function ExpiryAlertsPage() {
  const { hasPermission } = useAuth()
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [writeOffBatch, setWriteOffBatch] = useState<StockBatch | null>(null)

  function loadBatches() {
    getExpiryAlerts(30)
      .then(setBatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load expiry alerts.'))
      .finally(() => setIsLoading(false))
  }

  useEffect(loadBatches, [])

  if (isLoading) return <MessagePanel title="Loading expiry alerts…" />
  if (error) return <MessagePanel title="Could not load expiry alerts">{error}</MessagePanel>

  const filtered = batches.filter((batch) => {
    const days = daysUntil(batch.expiry_date)
    if (filter === 'expired') return batch.is_expired
    if (filter === 'within7') return !batch.is_expired && days <= 7
    if (filter === 'within30') return !batch.is_expired && days <= 30
    return true
  })

  return (
    <>
      <div className={styles.toolbar}>
        <div className={styles.filterChips}>
          {(['all', 'expired', 'within7', 'within30'] as Filter[]).map((f) => (
            <button
              key={f}
              className={`${styles.chip} ${filter === f ? styles.active : ''}`}
              onClick={() => setFilter(f)}
            >
              {f === 'all' ? 'All' : f === 'expired' ? 'Expired' : f === 'within7' ? 'Within 7 days' : 'Within 30 days'}
            </button>
          ))}
        </div>
        {hasPermission('inventory.manage') && (
          <button onClick={() => setIsDrawerOpen(true)} className={styles.addButton}>
            + New batch
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <MessagePanel title="No batches in this range">Try a different filter, or add a new batch.</MessagePanel>
      ) : (
        <div className={styles.grid}>
          {filtered.map((batch) => {
            const days = daysUntil(batch.expiry_date)
            const level = batch.is_expired ? 'expired' : 'soon'
            const daysLabel = days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`
            const tagLabel = batch.is_expired ? 'Expired' : 'Expiring soon'

            return (
              <div key={batch.stock_batch_id} className={`${styles.card} ${styles[level]}`}>
                <div className={styles.top}>
                  <div>
                    <p className={styles.name}>Product #{batch.product_id}</p>
                    <p className={styles.batch}>Batch {batch.batch_number}</p>
                  </div>
                  <span className={`${styles.tag} ${styles[level]}`}>{tagLabel}</span>
                </div>
                <div className={styles.meta}><span>Quantity</span><span>{batch.quantity}</span></div>
                <div className={styles.meta}><span>Expiry date</span><span>{batch.expiry_date}</span></div>
                <div className={styles.meta}><span>Time left</span><span>{daysLabel}</span></div>
                {batch.is_expired && hasPermission('inventory.manage') && (
                  <button className={styles.writeOffBtn} onClick={() => setWriteOffBatch(batch)}>
                    Write off as waste
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {isDrawerOpen && (
        <NewBatchForm
          onClose={() => setIsDrawerOpen(false)}
          onSaved={() => {
            setIsDrawerOpen(false)
            loadBatches()
          }}
        />
      )}

      {writeOffBatch && (
        <WriteOffForm
          batch={writeOffBatch}
          onClose={() => setWriteOffBatch(null)}
          onSaved={() => {
            setWriteOffBatch(null)
            loadBatches()
          }}
        />
      )}
    </>
  )
}

function WriteOffForm({ batch, onClose, onSaved }: { batch: StockBatch; onClose: () => void; onSaved: () => void }) {
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleConfirm() {
    setFormError(null)
    setIsSaving(true)
    try {
      await createAdjustment({
        product_id: batch.product_id,
        quantity_change: -batch.quantity,
        reason: `Expired batch ${batch.batch_number} (auto)`,
      })
      onSaved()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not write off this batch.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title="Write off expired batch"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleConfirm} disabled={isSaving} className={styles.confirmButton}>
            {isSaving ? 'Writing off…' : 'Confirm write-off'}
          </button>
        </>
      }
    >
      {formError && <p className={styles.formError}>{formError}</p>}
      <p style={{ fontSize: 13, color: 'var(--ink-soft)' }}>
        This will remove the expired quantity from stock and log it as a waste adjustment.
      </p>
      <label className={styles.formLabel}>Product ID</label>
      <input value={batch.product_id} disabled className={styles.confirmField} />
      <label className={styles.formLabel}>Quantity to remove</label>
      <input value={batch.quantity} disabled className={styles.confirmField} />
      <label className={styles.formLabel}>Reason</label>
      <input value={`Expired batch ${batch.batch_number} (auto)`} disabled className={styles.confirmField} />
    </Drawer>
  )
}

function NewBatchForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [productId, setProductId] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSave() {
    if (!productId || !batchNumber.trim() || !quantity || !expiryDate) {
      setFormError('Fill in every field before saving.')
      return
    }
    setFormError(null)
    setIsSaving(true)
    try {
      await addBatch({
        product_id: Number(productId),
        batch_number: batchNumber.trim(),
        quantity: Number(quantity),
        expiry_date: expiryDate,
      })
      onSaved()
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : 'Could not save the batch.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title="New batch"
      onClose={onClose}
      footer={
        <>
          <button onClick={onClose} className={styles.cancelButton}>Cancel</button>
          <button onClick={handleSave} disabled={isSaving} className={styles.saveButton}>
            {isSaving ? 'Saving…' : 'Save batch'}
          </button>
        </>
      }
    >
      {formError && <p className={styles.formError}>{formError}</p>}
      <label className={styles.formLabel}>Product ID</label>
      <input type="number" value={productId} onChange={(e) => setProductId(e.target.value)} placeholder="14" className={styles.formInput} />
      <label className={styles.formLabel}>Batch number</label>
      <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="B-003" className={styles.formInput} />
      <label className={styles.formLabel}>Quantity</label>
      <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="30" className={styles.formInput} />
      <label className={styles.formLabel}>Expiry date</label>
      <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={styles.formInput} />
    </Drawer>
  )
}