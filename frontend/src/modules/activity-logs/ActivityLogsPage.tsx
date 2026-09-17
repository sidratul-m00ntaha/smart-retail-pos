import { useEffect, useState } from 'react'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { ApiError } from '../../services/api.ts'
import { getActivityLogFilterOptions, getActivityLogs } from '../../services/activity-log.service.ts'
import type { ActivityLogFilterOptions, ActivityLogPage } from '../../types/activity-log.ts'
import { formatDateTime, startOfLocalDay } from '../../utils/date.ts'
import styles from './activity-logs.module.css'

const PAGE_SIZE = 25

type Filters = { userId: string; action: string; entity: string; dateFrom: string; dateTo: string }
const NO_FILTERS: Filters = { userId: '', action: '', entity: '', dateFrom: '', dateTo: '' }
const NO_OPTIONS: ActivityLogFilterOptions = { users: [], actions: [], entities: [] }

/** Activity Logs page (PRD 5.21): who did what and when, with filters and pages. */
export default function ActivityLogsPage() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS)
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('') // follows searchInput after a short pause in typing
  const [page, setPage] = useState(1)
  const [refreshCount, setRefreshCount] = useState(0)
  const [options, setOptions] = useState<ActivityLogFilterOptions>(NO_OPTIONS)

  const [result, setResult] = useState<ActivityLogPage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loadedKey, setLoadedKey] = useState<string | null>(null)

  // Date picker values ("2026-09-17") can be compared as text
  const dateError =
    filters.dateFrom && filters.dateTo && filters.dateFrom > filters.dateTo
      ? "The 'From' date can't be after the 'To' date."
      : null

  // Everything that decides what the list shows. The list is loading until a request for this key has finished.
  const requestKey = JSON.stringify([filters, search, page, refreshCount])
  const isLoading = !dateError && loadedKey !== requestKey

  useEffect(() => {
    getActivityLogFilterOptions()
      .then(setOptions)
      .catch(() => setOptions(NO_OPTIONS)) // the list still works without the dropdown values
  }, [refreshCount])

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
    getActivityLogs({
      user_id: filters.userId ? Number(filters.userId) : undefined,
      action: filters.action,
      entity: filters.entity,
      search,
      created_from: filters.dateFrom ? startOfLocalDay(filters.dateFrom) : undefined,
      created_before: filters.dateTo ? startOfLocalDay(filters.dateTo, true) : undefined,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => {
        if (!isCurrent) return
        setResult(data)
        setError(null)
      })
      .catch((err) => {
        if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load the activity log.')
      })
      .finally(() => {
        if (isCurrent) setLoadedKey(requestKey)
      })
    return () => {
      isCurrent = false
    }
  }, [filters, search, page, requestKey, dateError])

  function changeFilter(name: keyof Filters, value: string) {
    setFilters((current) => ({ ...current, [name]: value }))
    setPage(1)
  }

  function clearFilters() {
    setFilters(NO_FILTERS)
    setSearchInput('')
    setSearch('')
    setPage(1)
  }

  if (result === null && isLoading) return <MessagePanel title="Loading activity logs…" />
  if (result === null) {
    return (
      <MessagePanel title="Could not load the activity log">
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
      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search reference or details</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search reference or details"
            maxLength={100}
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </label>

        <select
          className={styles.select}
          value={filters.userId}
          onChange={(event) => changeFilter('userId', event.target.value)}
          aria-label="Filter by user"
        >
          <option value="">All users</option>
          {options.users.map((user) => (
            <option key={user.user_id} value={String(user.user_id)}>
              {user.full_name} ({user.username})
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={filters.action}
          onChange={(event) => changeFilter('action', event.target.value)}
          aria-label="Filter by action"
        >
          <option value="">All actions</option>
          {options.actions.map((action) => (
            <option key={action} value={action}>
              {action}
            </option>
          ))}
        </select>

        <select
          className={styles.select}
          value={filters.entity}
          onChange={(event) => changeFilter('entity', event.target.value)}
          aria-label="Filter by record type"
        >
          <option value="">All record types</option>
          {options.entities.map((entity) => (
            <option key={entity} value={entity}>
              {entity}
            </option>
          ))}
        </select>

        <div className={styles.dateRange}>
          <label className={styles.dateField}>
            From
            <input
              type="date"
              value={filters.dateFrom}
              max={filters.dateTo || undefined}
              onChange={(event) => changeFilter('dateFrom', event.target.value)}
            />
          </label>
          <label className={styles.dateField}>
            To
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(event) => changeFilter('dateTo', event.target.value)}
            />
          </label>
        </div>

        {hasFilters && (
          <button type="button" className={styles.linkButton} onClick={clearFilters}>
            Clear filters
          </button>
        )}
        <span className={styles.spacer} />
        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setRefreshCount((count) => count + 1)}
          disabled={isLoading}
        >
          {isLoading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      {dateError || error ? (
        <p className={styles.noticeError} role="alert">
          {dateError ?? error}
        </p>
      ) : (
        <div className={isLoading ? `${styles.tableCard} ${styles.isLoading}` : styles.tableCard} aria-busy={isLoading}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>When</th>
                <th>User</th>
                <th>Action</th>
                <th>Record type</th>
                <th>Reference</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {result.items.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.emptyRow}>
                    {hasFilters ? 'No activity matches these filters.' : 'Nothing has been logged yet.'}
                  </td>
                </tr>
              )}
              {result.items.map((log) => (
                <tr key={log.activity_log_id}>
                  <td className={styles.mono}>{formatDateTime(log.created_at)}</td>
                  <td>
                    {log.user_full_name ? (
                      <>
                        <p className={styles.userName}>{log.user_full_name}</p>
                        <p className={styles.userSub}>{log.username}</p>
                      </>
                    ) : (
                      <span className={styles.systemUser}>System</span>
                    )}
                  </td>
                  <td>
                    <span className={`${styles.actionPill} ${styles[`action${log.action}`] ?? ''}`}>{log.action}</span>
                  </td>
                  <td>{log.entity}</td>
                  <td className={styles.mono}>{log.reference ?? '—'}</td>
                  <td className={styles.details}>{log.details ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className={styles.pager}>
            <span>{result.total === 0 ? '0 entries' : `Showing ${firstRow}–${lastRow} of ${result.total}`}</span>
            <span className={styles.spacer} />
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setPage(result.page - 1)}
              disabled={isLoading || result.page <= 1}
            >
              Previous
            </button>
            <span className={styles.pageNumber}>
              Page {result.page} of {pageCount}
            </span>
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={() => setPage(result.page + 1)}
              disabled={isLoading || result.page >= pageCount}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </>
  )
}
