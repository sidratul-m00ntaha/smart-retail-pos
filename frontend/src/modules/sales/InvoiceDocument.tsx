import type { Sale } from '../../services/pos.service.ts'
import { formatDateTime } from '../../utils/date.ts'
import { formatMoney, toHundredths } from '../pos/posMath.ts'
import type { Paisa } from '../pos/posMath.ts'
import styles from './InvoiceDocument.module.css'

type InvoiceDocumentProps = {
  sale: Sale
  /** Cash handed back to the customer. Only the POS knows it, so a reprint from the Invoices page leaves it out. */
  change?: Paisa
}

const STATUS_TEXT: Record<string, string> = { PAID: 'Paid in full', PARTIALLY_PAID: 'Partly paid', DUE: 'On due' }
const METHOD_TEXT: Record<string, string> = { cash: 'Cash', card: 'Card', digital: 'Digital' }

/**
 * The invoice (PRD 5.17): store, invoice number, date, cashier, customer, lines, totals, payments and due.
 * The POS receipt and the Invoices / Sales pages all show it with this one component.
 */
export default function InvoiceDocument({ sale, change = 0 }: InvoiceDocumentProps) {
  const money = (value: string) => formatMoney(toHundredths(value))
  const discount = toHundredths(sale.discount_amount)
  const due = toHundredths(sale.due_amount)

  return (
    <>
      <h2 className={styles.store}>{sale.store_name}</h2>
      {sale.store_address && <p className={styles.sub}>{sale.store_address}</p>}
      {sale.store_phone && <p className={styles.sub}>Phone: {sale.store_phone}</p>}
      <p className={`${styles.sub} ${styles.invoiceNo}`}>{sale.invoice_number}</p>
      <p className={styles.sub}>{formatDateTime(sale.created_at)}</p>
      {sale.cashier_name && <p className={styles.sub}>Cashier: {sale.cashier_name}</p>}
      <p className={styles.sub}>Customer: {sale.customer_name ?? 'Guest'}</p>

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
    </>
  )
}
