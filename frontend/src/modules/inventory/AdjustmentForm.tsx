import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { createAdjustment, getStock } from '../../services/stock.service.ts'
import { getProducts } from '../../services/product.service.ts'
import type { StockAdjustment } from '../../types/stock.ts'
import type { Product } from '../../types/product.ts'
import Drawer from '../../components/ui/Drawer.tsx'
import formStyles from './AdjustmentsPage.module.css'

function labelFor(p: Product): string {
  return p.brand?.name ? `${p.name} (${p.brand.name})` : p.name
}

function ProductPicker({
  products,
  value,
  onChange,
  disabled,
}: {
  products: Product[]
  value: string
  onChange: (productId: string) => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const selected = products.find((p) => String(p.product_id) === value)

  const results = query.trim()
    ? products.filter((p) => labelFor(p).toLowerCase().includes(query.trim().toLowerCase())).slice(0, 50)
    : products.slice(0, 50)

  if (disabled && selected) {
    return <div className={formStyles.selectField} style={{ background: 'var(--bg)' }}>{labelFor(selected)}</div>
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        className={formStyles.selectField}
        placeholder={selected ? labelFor(selected) : 'Search for a product…'}
        value={isOpen ? query : ''}
        onFocus={() => setIsOpen(true)}
        onChange={(e) => setQuery(e.target.value)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
      />
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            maxHeight: 240,
            overflowY: 'auto',
            background: 'var(--paper)',
            border: '1px solid var(--border)',
            borderRadius: 9,
            marginTop: 4,
            zIndex: 20,
          }}
        >
          {results.length === 0 ? (
            <div style={{ padding: '10px 12px', fontSize: 13, color: 'var(--ink-soft)' }}>No matches.</div>
          ) : (
            results.map((p) => (
              <div
                key={p.product_id}
                onMouseDown={() => {
                  onChange(String(p.product_id))
                  setQuery('')
                  setIsOpen(false)
                }}
                style={{ padding: '9px 12px', fontSize: 13.5, cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {labelFor(p)}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}

export default function AdjustmentForm({
  initialProductId,
  onClose,
  onSaved,
}: {
  initialProductId?: number
  onClose: () => void
  onSaved: (created: StockAdjustment) => void
}) {
  const [products, setProducts] = useState<Product[]>([])
  const [stockList, setStockList] = useState<{ product_id: number; current_stock: number }[]>([])
  const [productId, setProductId] = useState(initialProductId ? String(initialProductId) : '')
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
      <ProductPicker
        products={products}
        value={productId}
        onChange={setProductId}
        disabled={!!initialProductId}
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
      <select
        value={reasonChoice}
        onChange={(e) => setReasonChoice(e.target.value)}
        className={formStyles.selectField}
      >
        <option value="">Select a reason…</option>
        <option value="Restocking / new delivery">Restocking / new delivery</option>
        <option value="Stock recount">Stock recount</option>
        <option value="Damaged in storage">Damaged in storage</option>
        <option value="Damaged in transit">Damaged in transit</option>
        <option value="Expired">Expired</option>
        <option value="Stolen / missing">Stolen / missing</option>
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