import { formatMoney } from './posMath.ts'
import type { Paisa, PaymentMethod, PaymentTexts, Settlement } from './posMath.ts'
import styles from './PaymentPanel.module.css'

type PaymentPanelProps = {
  /** The sale total, in paisa */
  total: Paisa
  texts: PaymentTexts
  /** A box whose text isn't an amount, e.g. "12x" */
  invalid: Record<PaymentMethod, boolean>
  /** null while an amount box holds text that isn't an amount */
  settlement: Settlement | null
  onChange: (method: PaymentMethod, text: string) => void
  /** Pay the whole total with this method */
  onPayFull: (method: PaymentMethod) => void
}

const METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'cash', label: 'Cash received' },
  { method: 'card', label: 'Card' },
  { method: 'digital', label: 'Digital' },
]

const STATUS_TEXT = { PAID: 'Paid in full', PARTIALLY_PAID: 'Partly paid', DUE: 'On due' }

/** How the customer pays. Anything not paid becomes the customer's due (registered customers only). */
export default function PaymentPanel({ total, texts, invalid, settlement, onChange, onPayFull }: PaymentPanelProps) {
  return (
    <section className={styles.panel} aria-label="Payment">
      <h3 className={styles.title}>Payment</h3>

      {total === 0 ? (
        <p className={styles.hint}>Add items to take payment.</p>
      ) : (
        <>
          {METHODS.map(({ method, label }) => (
            <div key={method} className={styles.row}>
              <label className={styles.label} htmlFor={`pay-${method}`}>
                {label}
              </label>
              <input
                id={`pay-${method}`}
                className={invalid[method] ? `${styles.input} ${styles.inputInvalid}` : styles.input}
                inputMode="decimal"
                value={texts[method]}
                placeholder="0.00"
                onChange={(event) => onChange(method, event.target.value)}
              />
              <button type="button" className={styles.fullButton} aria-label={`Pay the full amount by ${method}`} onClick={() => onPayFull(method)}>
                Full
              </button>
            </div>
          ))}

          {settlement === null ? (
            <p className={styles.error} role="alert">
              Enter amounts like 250 or 250.50.
            </p>
          ) : (
            <>
              <dl className={styles.summary}>
                <div className={styles.summaryRow}>
                  <dt>Paid</dt>
                  <dd>{formatMoney(settlement.paid)}</dd>
                </div>
                {settlement.change > 0 && (
                  <div className={styles.summaryRow}>
                    <dt>Change to give</dt>
                    <dd>{formatMoney(settlement.change)}</dd>
                  </div>
                )}
                <div className={styles.summaryRow}>
                  <dt>Due</dt>
                  <dd>{formatMoney(settlement.due)}</dd>
                </div>
              </dl>
              {settlement.error ? (
                <p className={styles.error} role="alert">
                  {settlement.error}
                </p>
              ) : (
                <p className={styles.ok} role="status">
                  {STATUS_TEXT[settlement.status]}
                  {settlement.due > 0 && ' - the rest is added to the customer’s due'}
                </p>
              )}
            </>
          )}
        </>
      )}
    </section>
  )
}
