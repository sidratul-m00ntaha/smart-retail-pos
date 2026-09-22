import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getExpiryAlerts, addBatch, createAdjustment } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { StockBatch } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import Drawer from '../../components/ui/Drawer.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import styles from './ExpiryAlertsPage.module.css'

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / 86400000)
}

function agingColor(days: number, isExpired: boolean): string {
  if (isExpired) return 'var(--danger)'
  if (days <= 3) return 'var(--danger)'
  if (days <= 7) return 'var(--amber)'
  if (days <= 14) return '#d8c341'
  return 'var(--success)'
}

function labelFor(p: Product): string {
  return p.brand?.name ? `${p.name} (${p.brand.name})` : p.name
}

function printWriteOffSlip(batch: StockBatch, productName: string) {
  const win = window.open('', '_blank', 'width=400,height=500')
  if (!win) return
  win.document.write(`
    <html>
      <head><title>Write-off slip</title></head>
      <body style="font-family: monospace; padding: 24px;">
        <h2>Stock Write-off Slip</h2>
        <p>Product: ${productName}</p>
        <p>Batch: ${batch.batch_number}</p>
        <p>Quantity removed: ${batch.quantity}</p>
        <p>Reason: Expired batch ${batch.batch_number} (auto)</p>
        <p>Date: ${new Date().toLocaleString()}</p>
      </body>
    </html>
  `)
  win.document.close()
  win.print()
}

type Filter = 'all' | 'expired' | 'within7' | 'within30'

export default function ExpiryAlertsPage() {
  const { hasPermission } = useAuth()
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [products, setProducts] = useState<Product[]>([])
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
  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

  const productById = new Map<number, Product>()
  for (const p of products) {
    productById.set(p.product_id, p)
  }
  function nameFor(productId: number): string {
    const p = productById.get(productId)
    return p ? labelFor(p) : `Product #${productId}`
  }

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
            const borderColor = agingColor(days, batch.is_expired)

            return (
              <div
                key={batch.stock_batch_id}
                className={`${styles.card} ${styles[level]}`}
                style={{ borderLeftColor: borderColor }}
              >
                <div className={styles.top}>
                  <div>
                    <p className={styles.name}>{nameFor(batch.product_id)}</p>
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
          productName={nameFor(writeOffBatch.product_id)}
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

function WriteOffForm({
  batch,
  productName,
  onClose,
  onSaved,
}: {
  batch: StockBatch
  productName: string
  onClose: () => void
  onSaved: () => void
}) {
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
      <label className={styles.formLabel}>Product</label>
      <input value={productName} disabled className={styles.confirmField} />
      <label className={styles.formLabel}>Quantity to remove</label>
      <input value={batch.quantity} disabled className={styles.confirmField} />
      <label className={styles.formLabel}>Reason</label>
      <input value={`Expired batch ${batch.batch_number} (auto)`} disabled className={styles.confirmField} />
      <button type="button" className={styles.printBtn} onClick={() => printWriteOffSlip(batch, productName)}>
        🖨 Print slip
      </button>
    </Drawer>
  )
}

function NewBatchForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [products, setProducts] = useState<Product[]>([])
  const [productId, setProductId] = useState('')
  const [batchNumber, setBatchNumber] = useState('')
  const [quantity, setQuantity] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [formError, setFormError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    getProducts().then(setProducts).catch(() => {})
  }, [])

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
      <label className={styles.formLabel}>Product</label>
      <select value={productId} onChange={(e) => setProductId(e.target.value)} className={styles.formInput}>
        <option value="">Select a product…</option>
        {products.map((p) => (
          <option key={p.product_id} value={p.product_id}>
            {labelFor(p)}
          </option>
        ))}
      </select>
      <label className={styles.formLabel}>Batch number</label>
      <input type="text" value={batchNumber} onChange={(e) => setBatchNumber(e.target.value)} placeholder="B-003" className={styles.formInput} />
      <label className={styles.formLabel}>Quantity</label>
      <input type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="30" className={styles.formInput} />
      <label className={styles.formLabel}>Expiry date</label>
      <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className={styles.formInput} />
    </Drawer>
  )
}