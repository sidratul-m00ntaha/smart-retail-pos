import { useEffect, useState } from 'react'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { ApiError } from '../../services/api.ts'
import { listInvoices, listSales } from '../../services/sales.service.ts'
import type { PaymentStatusFilter, SaleListPage } from '../../services/sales.service.ts'
import { formatDateTime, startOfLocalDay } from '../../utils/date.ts'
import { formatMoney, toHundredths } from '../pos/posMath.ts'
import { PRESETS, presetRange } from './datePresets.ts'
import type { DatePreset, PresetId } from './datePresets.ts'
import InvoiceDialog from './InvoiceDialog.tsx'
import styles from './SalesList.module.css'

/** "sales": summary cards and every column. "invoices": fewer columns and a View button per row. */
export type SalesListMode = 'sales' | 'invoices'

const PAGE_SIZE = 25

type Filters = { dateFrom: string; dateTo: string; paymentStatus: PaymentStatusFilter }
const NO_FILTERS: Filters = { dateFrom: '', dateTo: '', paymentStatus: '' }

const STATUS_TEXT: Record<string, string> = { PAID: 'Paid', PARTIALLY_PAID: 'Partly paid', DUE: 'Due' }
const STATUS_CLASS: Record<string, string> = { PAID: styles.paid, PARTIALLY_PAID: styles.partly, DUE: styles.dueStatus }

const money = (value: string) => formatMoney(toHundredths(value))

/** The sales / invoices list (PRD 5.15, 5.17, 5.19): date presets, payment status, search, pages, and the invoice on click. */
export default function SalesList({ mode }: { mode: SalesListMode }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [preset, setPreset] = useState<DatePreset>('all')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('') // follows searchInput after a short pause in typing
  const [page, setPage] = useState(1)
  const [refreshCount, setRefreshCount] = useState(0)
  const [result, setResult] = useState<SaleListPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [openInvoice, setOpenInvoice] = useState<string | null>(null)

  // Date picker values ("2026-09-17") can be compared as text
  const dateError =
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo ? "The 'From' date can't be after the 'To' date." : null

  // Everything that decides what the list shows. The list is loading until a request for this key has finished.
  const requestKey = JSON.stringify([mode, filters, search, page, refreshCount])
  const isLoading = !dateError && loadedKey !== requestKey

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim())
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [searchInput])

  useEffect(() => {
    if (dateError) return
    let isCurrent = true // ignore answers that arrive after the filters have changed again
    const load = mode === 'sales' ? listSales : listInvoices
    load({
      created_from: filters.dateFrom ? startOfLocalDay(filters.dateFrom) : undefined,
      created_before: filters.dateTo ? startOfLocalDay(filters.dateTo, true) : undefined,
      payment_status: filters.paymentStatus,
      search,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        if (!isCurrent) return
        setResult(data)
        setError(null)
      })
      .catch((err) => {
        if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load the list.')
      })
      .finally(() => {
        if (isCurrent) setLoadedKey(requestKey)
      })
    return () => {
      isCurrent = false
    }
  }, [mode, filters, search, page, requestKey, dateError])

  function choosePreset(id: PresetId) {
    setPreset(id)
    setFilters((current) => ({ ...current, ...presetRange(id, new Date()) }))
    setPage(1)
  }

  function changeDate(name: 'dateFrom' | 'dateTo', value: string) {
    setPreset('custom')
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  function changeStatus(value: PaymentStatusFilter) {
    setFilters((current) => ({ ...current, paymentStatus: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(NO_FILTERS)
    setPreset('all')
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  const noun = mode === 'sales' ? 'sales' : 'invoices'
  if (result === null && isLoading) return <MessagePanel title={`Loading ${noun}…`} />
  if (result === null) {
    return (
      <MessagePanel title={`Could not load the ${noun}`}>
        <p>{error}</p>
        <button type="button" className={styles.secondaryButton} onClick={() => setRefreshCount((count) => count + 1)}>
          Try again
        </button>
      </MessagePanel>
    )
  }

  const hasFilters = searchInput !== '' || JSON.stringify(filters) !== JSON.stringify(NO_FILTERS)
  const pageCount = Math.max(1, Math.ceil(result.total / PAGE_SIZE))
  const firstRow = result.total === 0 ? 0 : (result.page - 1) * PAGE_SIZE + 1
  const lastRow = (result.page - 1) * PAGE_SIZE + result.items.length

  return (
    <>
      {mode === 'sales' && (
        <dl className={styles.cards}>
          <div className={styles.card}>
            <dt>Transactions</dt>
            <dd>{result.totals.transactions}</dd>
          </div>
          <div className={styles.card}>
            <dt>Total sales</dt>
            <dd>{money(result.totals.total_amount)}</dd>
          </div>
          <div className={styles.card}>
            <dt>Collected</dt>
            <dd>{money(result.totals.paid_amount)}</dd>
          </div>
          <div className={styles.card}>
            <dt>Due</dt>
            <dd className={toHundredths(result.totals.due_amount) > 0 ? styles.dueAmount : undefined}>{money(result.totals.due_amount)}</dd>
          </div>
        </dl>
      )}

      <div className={styles.toolbar}>
        <div className={styles.presets} role="group" aria-label="Date range">
          {PRESETS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              aria-pressed={preset === id}
              className={preset === id ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => choosePreset(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <label className={styles.field}>
          <span>From</span>
          <input type="date" value={filters.dateFrom} max={filters.dateTo || undefined} onChange={(event) => changeDate('dateFrom', event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>To</span>
          <input type="date" value={filters.dateTo} min={filters.dateFrom || undefined} onChange={(event) => changeDate('dateTo', event.target.value)} />
        </label>
        <label className={styles.field}>
          <span>Payment</span>
          <select value={filters.paymentStatus} onChange={(event) => changeStatus(event.target.value as PaymentStatusFilter)}>
            <option value="">All</option>
            <option value="PAID">Paid</option>
            <option value="PARTIALLY_PAID">Partly paid</option>
            <option value="DUE">Due</option>
          </select>
        </label>
        <input
          className={styles.search}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          placeholder="Search invoice number, customer or phone"
          aria-label="Search"
        />
        {hasFilters && (
          <button type="button" className={styles.linkButton} onClick={clearFilters}>
            Clear filters
          </button>
        )}
      </div>

      {dateError && (
        <p className={styles.error} role="alert">
          {dateError}
        </p>
      )}
      {error && !dateError && (
        <p className={styles.error} role="alert">
          {error}{' '}
          <button type="button" className={styles.linkButton} onClick={() => setRefreshCount((count) => count + 1)}>
            Try again
          </button>
        </p>
      )}

      {result.items.length === 0 ? (
        <p className={styles.empty}>
          No {noun} match these filters.{' '}
          {hasFilters && (
            <button type="button" className={styles.linkButton} onClick={clearFilters}>
              Clear filters
            </button>
          )}
        </p>
      ) : (
        <div className={styles.tableWrap}>
          <table className={isLoading ? `${styles.table} ${styles.loading}` : styles.table} aria-busy={isLoading}>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Customer</th>
                {mode === 'sales' && <th>Cashier</th>}
                {mode === 'sales' && <th className={styles.num}>Items</th>}
                <th className={styles.num}>Total</th>
                {mode === 'sales' && <th className={styles.num}>Paid</th>}
                <th className={styles.num}>Due</th>
                <th>Status</th>
                {mode === 'invoices' && <th />}
              </tr>
            </thead>
            <tbody>
              {result.items.map((row) => (
                <tr key={row.sale_id}>
                  <td>
                    <button type="button" className={styles.invoiceLink} onClick={() => setOpenInvoice(row.invoice_number)}>
                      {row.invoice_number}
                    </button>
                  </td>
                  <td>{formatDateTime(row.created_at)}</td>
                  <td>
                    {row.customer_name ? (
                      <>
                        {row.customer_name}
                        <span className={styles.sub}>{row.customer_phone}</span>
                      </>
                    ) : (
                      <span className={styles.guest}>Guest</span>
                    )}
                  </td>
                  {mode === 'sales' && <td>{row.cashier_name ?? '—'}</td>}
                  {mode === 'sales' && <td className={styles.num}>{Number(row.item_count)}</td>}
                  <td className={styles.num}>{money(row.total_amount)}</td>
                  {mode === 'sales' && <td className={styles.num}>{money(row.paid_amount)}</td>}
                  <td className={toHundredths(row.due_amount) > 0 ? `${styles.num} ${styles.dueAmount}` : styles.num}>{money(row.due_amount)}</td>
                  <td>
                    <span className={`${styles.status} ${STATUS_CLASS[row.payment_status] ?? ''}`}>{STATUS_TEXT[row.payment_status] ?? row.payment_status}</span>
                  </td>
                  {mode === 'invoices' && (
                    <td className={styles.num}>
                      <button type="button" className={styles.secondaryButton} aria-label={`View ${row.invoice_number}`} onClick={() => setOpenInvoice(row.invoice_number)}>
                        View
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className={styles.pager}>
        <span>
          {firstRow}–{lastRow} of {result.total}
        </span>
        <span className={styles.pagerButtons}>
          <button type="button" className={styles.secondaryButton} onClick={() => setPage(result.page - 1)} disabled={isLoading || result.page <= 1}>
            Previous
          </button>
          <span className={styles.pageNumber}>
            Page {result.page} of {pageCount}
          </span>
          <button type="button" className={styles.secondaryButton} onClick={() => setPage(result.page + 1)} disabled={isLoading || result.page >= pageCount}>
            Next
          </button>
        </span>
      </div>

      {openInvoice && <InvoiceDialog invoiceNumber={openInvoice} onClose={() => setOpenInvoice(null)} />}
    </>
  )
}
