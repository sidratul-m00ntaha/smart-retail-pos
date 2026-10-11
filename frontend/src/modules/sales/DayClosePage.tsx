import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getDayClose, saveDayClose } from '../../services/day-close.service.ts'
import type { DayClose } from '../../services/day-close.service.ts'
import { formatDateTime } from '../../utils/date.ts'
import { isWallet, methodLabel, WALLET_COLORS } from '../../utils/paymentMethods.ts'
import { formatMoney, parseAmount, toHundredths, toInputText } from '../pos/posMath.ts'
import styles from './DayClosePage.module.css'

type State = { status: 'loading' } | { status: 'ready'; report: DayClose } | { status: 'error'; message: string }

const money = (value: string) => formatMoney(toHundredths(value))

/** End-of-day closing: the day's figures, and the cash in the drawer counted against what it should hold. */
export default function DayClosePage() {
  const [date, setDate] = useState('') // '' = today
  const [state, setState] = useState<State>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getDayClose(date || undefined)
      .then((report) => {
        if (!cancelled) setState({ status: 'ready', report })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Could not load the day.' })
      })
    return () => {
      cancelled = true
    }
  }, [date, retryKey])

  function pickDate(value: string) {
    setState({ status: 'loading' })
    setDate(value)
  }

  return (
    <div>
      <div className={styles.toolbar}>
        <label className={styles.field}>
          Day
          <input
            type="date"
            value={date || (state.status === 'ready' ? state.report.business_date : '')}
            onChange={(event) => event.target.value && pickDate(event.target.value)}
          />
        </label>
        {date !== '' && (
          <button type="button" className={styles.secondaryButton} onClick={() => pickDate('')}>
            Today
          </button>
        )}
      </div>

      {state.status === 'loading' && <p className={styles.message}>Loading…</p>}
      {state.status === 'error' && (
        <div>
          <p className={styles.error} role="alert">
            {state.message}
          </p>
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => {
              setState({ status: 'loading' })
              setRetryKey((key) => key + 1)
            }}
          >
            Try again
          </button>
        </div>
      )}
      {state.status === 'ready' && (
        // The key makes the count form start again from the saved count whenever a different day (or a new save) arrives.
        <DayCloseView key={`${state.report.business_date}|${state.report.closing?.updated_at ?? ''}`} report={state.report} onSaved={(report) => setState({ status: 'ready', report })} />
      )}
    </div>
  )
}

function DayCloseView({ report, onSaved }: { report: DayClose; onSaved: (report: DayClose) => void }) {
  const { totals, methods, cashiers, closing } = report
  const [opening, setOpening] = useState(toInputText(toHundredths(closing?.opening_cash ?? report.suggested_opening_cash)))
  const [counted, setCounted] = useState(closing ? toInputText(toHundredths(closing.counted_cash)) : '')
  const [note, setNote] = useState(closing?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const openingPaisa = parseAmount(opening)
  const countedPaisa = counted.trim() === '' ? null : parseAmount(counted)
  const expected = openingPaisa === null ? null : openingPaisa + toHundredths(report.cash_net)
  const difference = expected === null || countedPaisa === null ? null : countedPaisa - expected
  const canSave = openingPaisa !== null && countedPaisa !== null && !saving

  async function save() {
    if (!canSave) return
    setSaving(true)
    setError(null)
    try {
      const updated = await saveDayClose({
        business_date: report.business_date,
        opening_cash: toInputText(openingPaisa),
        counted_cash: toInputText(countedPaisa),
        note: note.trim() || undefined,
      })
      setSaved(true)
      onSaved(updated)
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Could not save the closing.')
    } finally {
      setSaving(false)
    }
  }

  const differenceClass =
    difference === null ? '' : difference === 0 ? styles.balanced : difference < 0 ? styles.short : styles.over

  return (
    <>
      <dl className={styles.cards}>
        <div className={styles.card}>
          <dt>Sales</dt>
          <dd>{totals.transactions}</dd>
        </div>
        <div className={styles.card}>
          <dt>Net sales</dt>
          <dd>{money(totals.net_sales)}</dd>
        </div>
        <div className={styles.card}>
          <dt>Returns</dt>
          <dd>{money(totals.returns_total)}</dd>
        </div>
        <div className={styles.card}>
          <dt>Left on dues</dt>
          <dd className={styles.dueAmount}>{money(totals.due_amount)}</dd>
        </div>
        <div className={styles.card}>
          <dt>Old dues collected</dt>
          <dd>{money(totals.dues_collected)}</dd>
        </div>
      </dl>

      <h3 className={styles.heading}>Money received</h3>
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Method</th>
              <th className={styles.num}>On sales</th>
              <th className={styles.num}>Due payments</th>
              <th className={styles.num}>Refunded</th>
              <th className={styles.num}>Net</th>
            </tr>
          </thead>
          <tbody>
            {methods.map((row) => (
              <tr key={row.method}>
                <td>
                  {isWallet(row.method) && <span className={styles.dot} style={{ background: WALLET_COLORS[row.method] }} aria-hidden="true" />}
                  {methodLabel(row.method)}
                </td>
                <td className={styles.num}>{money(row.sales_received)}</td>
                <td className={styles.num}>{money(row.dues_received)}</td>
                <td className={styles.num}>{money(row.refunded)}</td>
                <td className={`${styles.num} ${styles.strong}`}>{money(row.net)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className={styles.heading}>Cashiers</h3>
      {cashiers.length === 0 ? (
        <p className={styles.message}>No sales on this day.</p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Cashier</th>
                <th className={styles.num}>Sales</th>
                <th className={styles.num}>Total</th>
                <th className={styles.num}>Cash</th>
                <th className={styles.num}>Card, digital, wallets</th>
                <th className={styles.num}>Left on dues</th>
              </tr>
            </thead>
            <tbody>
              {cashiers.map((row) => (
                <tr key={row.cashier_id}>
                  <td>{row.cashier_name ?? `User ${row.cashier_id}`}</td>
                  <td className={styles.num}>{row.transactions}</td>
                  <td className={`${styles.num} ${styles.strong}`}>{money(row.total_amount)}</td>
                  <td className={styles.num}>{money(row.cash_received)}</td>
                  <td className={styles.num}>{money(row.other_received)}</td>
                  <td className={styles.num}>{money(row.due_amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <h3 className={styles.heading}>Cash drawer</h3>
      <section className={styles.drawer} aria-label="Cash drawer count">
        <p className={styles.hint}>
          The drawer should hold: cash already in it + cash received on sales + cash from due payments − cash refunded.
        </p>
        <div className={styles.drawerGrid}>
          <label className={styles.field}>
            Cash in the drawer at the start
            <input inputMode="decimal" value={opening} onChange={(event) => setOpening(event.target.value)} aria-invalid={openingPaisa === null} />
          </label>
          <div className={styles.figure}>
            <span>Cash gained today</span>
            <strong>{money(report.cash_net)}</strong>
          </div>
          <div className={styles.figure}>
            <span>Should be in the drawer</span>
            <strong>{expected === null ? '—' : formatMoney(expected)}</strong>
          </div>
          <label className={styles.field}>
            Cash you counted
            <input inputMode="decimal" value={counted} placeholder="0.00" onChange={(event) => setCounted(event.target.value)} aria-invalid={countedPaisa === null && counted.trim() !== ''} />
          </label>
          <div className={`${styles.figure} ${differenceClass}`}>
            <span>Difference</span>
            <strong>
              {difference === null ? '—' : difference === 0 ? 'Balanced' : `${difference < 0 ? 'Short' : 'Over'} ${formatMoney(Math.abs(difference))}`}
            </strong>
          </div>
        </div>
        <label className={`${styles.field} ${styles.noteField}`}>
          Note (optional)
          <input value={note} maxLength={255} placeholder="e.g. 5 Tk note missing, given as change" onChange={(event) => setNote(event.target.value)} />
        </label>

        {error && (
          <p className={styles.error} role="alert">
            {error}
          </p>
        )}
        <div className={styles.saveRow}>
          <button type="button" className={styles.primaryButton} disabled={!canSave} onClick={save}>
            {saving ? 'Saving…' : closing ? 'Update closing' : 'Close the day'}
          </button>
          {closing && (
            <span className={styles.status} role="status">
              {saved ? 'Saved. ' : ''}Closed by {closing.closed_by_name ?? 'someone'} · {formatDateTime(closing.updated_at)}
            </span>
          )}
        </div>
      </section>
    </>
  )
}
