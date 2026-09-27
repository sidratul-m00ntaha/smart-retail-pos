import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ApiError } from '../../services/api.ts'
import type { Sale } from '../../services/pos.service.ts'
import { createReturn, getSale } from '../../services/sales.service.ts'
import type { ReturnLineIn, SaleReturn } from '../../services/sales.service.ts'
import { formatMoney, toHundredths } from '../pos/posMath.ts'
import styles from './ReturnDialog.module.css'

type ReturnDialogProps = {
  saleId: number
  onClose: () => void
  /** Called once the return is saved, so the list can refresh (the sale's status and totals changed). */
  onDone: () => void
}

type Selection = { checked: boolean; quantity: string; restock: boolean }
type State = { status: 'loading' } | { status: 'ready'; sale: Sale } | { status: 'error'; message: string }

const METHODS: { value: 'cash' | 'card' | 'digital'; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'digital', label: 'Digital' },
]

/**
 * Cancelling some or all of an item after the invoice. The exact quantity still returnable isn't shown here
 * (the server knows the full return history); trying to return more than is left shows the server's message,
 * e.g. "Only 1 of 'Milk 1L' can still be returned."
 */
export default function ReturnDialog({ saleId, onClose, onDone }: ReturnDialogProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [selected, setSelected] = useState<Record<number, Selection>>({})
  const [reason, setReason] = useState('')
  const [refundMethod, setRefundMethod] = useState<'' | 'cash' | 'card' | 'digital'>('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<SaleReturn | null>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    getSale(saleId)
      .then((sale) => {
        if (cancelled) return
        setState({ status: 'ready', sale })
        setSelected(Object.fromEntries(sale.items.map((item) => [item.sale_item_id, { checked: false, quantity: item.quantity, restock: true }])))
      })
      .catch((err) => {
        if (!cancelled) setState({ status: 'error', message: err instanceof ApiError ? err.message : 'Could not load the sale.' })
      })
    return () => {
      cancelled = true
    }
  }, [saleId])

  useEffect(() => {
    closeRef.current?.focus()
  }, [result, state.status])

  function toggle(id: number) {
    setSelected((rows) => ({ ...rows, [id]: { ...rows[id], checked: !rows[id].checked } }))
  }

  function setQuantity(id: number, quantity: string) {
    setSelected((rows) => ({ ...rows, [id]: { ...rows[id], quantity } }))
  }

  function setRestock(id: number, restock: boolean) {
    setSelected((rows) => ({ ...rows, [id]: { ...rows[id], restock } }))
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (state.status !== 'ready') return
    const items: ReturnLineIn[] = Object.entries(selected)
      .filter(([, row]) => row.checked)
      .map(([id, row]) => ({ sale_item_id: Number(id), quantity: Number(row.quantity), restock: row.restock }))
    if (items.length === 0) {
      setError('Select at least one item to return.')
      return
    }
    if (items.some((item) => !(item.quantity > 0))) {
      setError('Enter a quantity greater than zero for each selected item.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const saved = await createReturn(saleId, { reason, items, refund_method: refundMethod || undefined })
      setResult(saved)
      onDone()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the return.')
    } finally {
      setSaving(false)
    }
  }

  const money = (value: string) => formatMoney(toHundredths(value))

  return (
    <div className={styles.overlay}>
      <section className={styles.card} role="dialog" aria-modal="true" aria-label={result ? `Return ${result.return_number}` : 'Return items'}>
        {state.status === 'loading' && <p className={styles.message}>Loading sale…</p>}
        {state.status === 'error' && (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        )}

        {state.status === 'ready' && !result && (
          <form onSubmit={submit}>
            <h2 className={styles.title}>Return items — {state.sale.invoice_number}</h2>
            <ul className={styles.items}>
              {state.sale.items.map((item) => {
                const row = selected[item.sale_item_id]
                return (
                  <li key={item.sale_item_id} className={styles.item}>
                    <label className={styles.itemLabel}>
                      <input type="checkbox" checked={row?.checked ?? false} onChange={() => toggle(item.sale_item_id)} />
                      {item.product_name}
                      <span className={styles.sub}>bought {Number(item.quantity)} at {money(item.unit_price)} each</span>
                    </label>
                    {row?.checked && (
                      <div className={styles.itemFields}>
                        <label className={styles.field}>
                          Quantity
                          <input
                            type="number"
                            min="0"
                            step="any"
                            max={item.quantity}
                            value={row.quantity}
                            onChange={(event) => setQuantity(item.sale_item_id, event.target.value)}
                          />
                        </label>
                        <label className={styles.checkboxField}>
                          <input type="checkbox" checked={row.restock} onChange={(event) => setRestock(item.sale_item_id, event.target.checked)} />
                          Put back in stock
                        </label>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>

            <label className={styles.field}>
              Reason
              <textarea value={reason} onChange={(event) => setReason(event.target.value)} required rows={2} />
            </label>
            <label className={styles.field}>
              Refund method (if any money is handed back, after reducing the customer's due)
              <select value={refundMethod} onChange={(event) => setRefundMethod(event.target.value as typeof refundMethod)}>
                <option value="">Not needed / reduces due only</option>
                {METHODS.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>

            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}

            <div className={styles.actions}>
              <button type="button" className={styles.secondary} onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className={styles.primary} disabled={saving}>
                {saving ? 'Saving…' : 'Confirm return'}
              </button>
            </div>
          </form>
        )}

        {result && (
          <>
            <h2 className={styles.title}>Return saved — {result.return_number}</h2>
            <dl className={styles.summary}>
              <div className={styles.row}>
                <dt>Refund value</dt>
                <dd>{money(result.refund_amount)}</dd>
              </div>
              {toHundredths(result.due_reduced) > 0 && (
                <div className={styles.row}>
                  <dt>Taken off the due</dt>
                  <dd>{money(result.due_reduced)}</dd>
                </div>
              )}
              {result.refund_method && (
                <div className={styles.row}>
                  <dt>Refunded by</dt>
                  <dd>{result.refund_method}</dd>
                </div>
              )}
            </dl>
            <div className={styles.actions}>
              <button type="button" className={styles.primary} ref={closeRef} onClick={onClose}>
                Close
              </button>
            </div>
          </>
        )}
      </section>
    </div>
  )
}
