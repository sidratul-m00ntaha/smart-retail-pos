import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Sale } from '../../services/pos.service.ts'
import { formatDateTime } from '../../utils/date.ts'
import { formatMoney, toHundredths } from './posMath.ts'
import type { Paisa } from './posMath.ts'
import styles from './Receipt.module.css'

// TODO(module 1): read the store name and address from the store settings.
const STORE_NAME = 'Smart Retail Store'

type ReceiptProps = {
  sale: Sale
  /** Cash to hand back to the customer. The server doesn't return it: it only knows what was applied to the sale. */
  change: Paisa
  customerName: string | null
  onNewSale: () => void
}

const STATUS_TEXT: Record<string, string> = { PAID: 'Paid in full', PARTIALLY_PAID: 'Partly paid', DUE: 'On due' }
const METHOD_TEXT: Record<string, string> = { cash: 'Cash', card: 'Card', digital: 'Digital' }

/** The invoice of a completed sale. Printing shows only this receipt (the app behind it is hidden). */
export default function Receipt({ sale, change, customerName, onNewSale }: ReceiptProps) {
  const newSaleRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    newSaleRef.current?.focus()
  }, [])

  const money = (value: string) => formatMoney(toHundredths(value))
  const discount = toHundredths(sale.discount_amount)
  const due = toHundredths(sale.due_amount)

  return createPortal(
    <div className={styles.overlay}>
      <section className={styles.card} role="dialog" aria-modal="true" aria-labelledby="receipt-title">
        <h2 className={styles.store} id="receipt-title">
          {STORE_NAME}
        </h2>
        <p className={styles.sub}>{sale.invoice_number}</p>
        <p className={styles.sub}>{formatDateTime(sale.created_at)}</p>
        <p className={styles.sub}>Customer: {customerName ?? 'Guest'}</p>

        <hr className={styles.rule} />
        <ul className={styles.items}>
          {sale.items.map((item) => (
            <li key={item.sale_item_id} className={styles.item}>
              <span>
                {item.product_name}
                <span className={styles.detail}>
                  {Number(item.quantity)} × {money(item.unit_price)}
                </span>
              </span>
              <span>{money(item.line_subtotal)}</span>
            </li>
          ))}
        </ul>

        <hr className={styles.rule} />
        <dl className={styles.summary}>
          <div className={styles.row}>
            <dt>Subtotal</dt>
            <dd>{money(sale.subtotal)}</dd>
          </div>
          {discount > 0 && (
            <div className={styles.row}>
              <dt>Loyalty discount ({Number(sale.discount_percent)}%)</dt>
              <dd>− {money(sale.discount_amount)}</dd>
            </div>
          )}
          <div className={styles.row}>
            <dt>VAT</dt>
            <dd>{money(sale.tax_amount)}</dd>
          </div>
          <div className={`${styles.row} ${styles.total}`}>
            <dt>Total</dt>
            <dd>{money(sale.total_amount)}</dd>
          </div>
        </dl>

        <hr className={styles.rule} />
        <dl className={styles.summary}>
          {sale.payments.map((payment) => (
            <div key={payment.payment_id} className={styles.row}>
              <dt>{METHOD_TEXT[payment.method] ?? payment.method}</dt>
              <dd>{money(payment.amount)}</dd>
            </div>
          ))}
          {change > 0 && (
            <div className={styles.row}>
              <dt>Change given</dt>
              <dd>{formatMoney(change)}</dd>
            </div>
          )}
          {due > 0 && (
            <div className={`${styles.row} ${styles.due}`}>
              <dt>Due</dt>
              <dd>{money(sale.due_amount)}</dd>
            </div>
          )}
        </dl>
        <p className={styles.status}>{STATUS_TEXT[sale.payment_status] ?? sale.payment_status}</p>

        <div className={`${styles.actions} ${styles.noPrint}`}>
          <button type="button" className={styles.secondary} onClick={() => window.print()}>
            Print
          </button>
          <button type="button" className={styles.primary} ref={newSaleRef} onClick={onNewSale}>
            New sale
          </button>
        </div>
      </section>
    </div>,
    document.body,
  )
}
