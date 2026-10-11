import { formatMoney, parseAmount } from './posMath.ts'
import type { Paisa, PaymentMethod, PaymentTexts, Settlement } from './posMath.ts'
import { methodLabel, WALLET_COLORS, WALLET_METHODS } from '../../utils/paymentMethods.ts'
import type { WalletMethod } from '../../utils/paymentMethods.ts'
import styles from './PaymentPanel.module.css'

type PaymentPanelProps = {
  /** The sale total, in paisa */
  total: Paisa
  texts: PaymentTexts
  /** A box whose text isn't an amount, e.g. "12x" */
  invalid: Record<PaymentMethod, boolean>
  /** The transaction ID typed for each mobile wallet */
  references: Record<WalletMethod, string>
  /** The wallet that is being used without a valid transaction ID, if any */
  missingId: WalletMethod | null
  /** null while an amount box holds text that isn't an amount */
  settlement: Settlement | null
  onChange: (method: PaymentMethod, text: string) => void
  onReferenceChange: (method: WalletMethod, text: string) => void
  /** Pay the whole total with this method */
  onPayFull: (method: PaymentMethod) => void
}

const MAIN_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'cash', label: 'Cash received' },
  { method: 'card', label: 'Card' },
  { method: 'digital', label: 'Digital' },
]

const STATUS_TEXT = { PAID: 'Paid in full', PARTIALLY_PAID: 'Partly paid', DUE: 'On due' }

/** How the customer pays. Anything not paid becomes the customer's due (registered customers only). */
export default function PaymentPanel({
  total,
  texts,
  invalid,
  references,
  missingId,
  settlement,
  onChange,
  onReferenceChange,
  onPayFull,
}: PaymentPanelProps) {
  function amountRow(method: PaymentMethod, label: string, dotColor?: string) {
    return (
      <div key={method} className={styles.row}>
        <label className={styles.label} htmlFor={`pay-${method}`}>
          {dotColor && <span className={styles.dot} style={{ background: dotColor }} aria-hidden="true" />}
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
        <button type="button" className={styles.fullButton} aria-label={`Pay the full amount by ${methodLabel(method)}`} onClick={() => onPayFull(method)}>
          Full
        </button>
      </div>
    )
  }

  return (
    <section className={styles.panel} aria-label="Payment">
      <h3 className={styles.title}>Payment</h3>

      {total === 0 ? (
        <p className={styles.hint}>Add items to take payment.</p>
      ) : (
        <>
          {MAIN_METHODS.map(({ method, label }) => amountRow(method, label))}

          <p className={styles.groupTitle}>Mobile wallets</p>
          {WALLET_METHODS.map((method) => (
            <div key={method}>
              {amountRow(method, methodLabel(method), WALLET_COLORS[method])}
              {(parseAmount(texts[method]) ?? 0) > 0 && (
                <div className={styles.referenceRow}>
                  <label className={styles.label} htmlFor={`ref-${method}`}>
                    Trx ID
                  </label>
                  <input
                    id={`ref-${method}`}
                    className={missingId === method ? `${styles.referenceInput} ${styles.inputInvalid}` : styles.referenceInput}
                    value={references[method]}
                    maxLength={50}
                    autoComplete="off"
                    placeholder={`${methodLabel(method)} transaction ID`}
                    onChange={(event) => onReferenceChange(method, event.target.value)}
                  />
                </div>
              )}
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
              ) : missingId ? (
                <p className={styles.error} role="alert">
                  Enter the {methodLabel(missingId)} transaction ID (4 to 50 letters or numbers).
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
