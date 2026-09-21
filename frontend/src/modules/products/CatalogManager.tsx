import { useState } from 'react'
import styles from './ProductsPage.module.css'
import type { CatalogStatus } from '../../types/catalog'

interface Item {
  id: number
  name: string
  status: CatalogStatus
}

interface Props {
  title: string
  placeholder: string
  items: Item[]
  canManage: boolean
  onCreate?: (name: string) => Promise<void>
  onToggle?: (id: number, active: boolean) => Promise<void>
}

/**
 * Shared list UI for Categories, Brands and Units.
 *
 * Admin users can create and change status.
 * Users without products.manage can only view the list.
 */
export default function CatalogManager({
  title,
  placeholder,
  items,
  canManage,
  onCreate,
  onToggle,
}: Props) {
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleAdd() {
    const trimmedName = name.trim()

    if (!trimmedName) {
      setError(`Please enter a ${title.toLowerCase()} name.`)
      return
    }

    if (!onCreate) {
      setError(`You do not have permission to add ${title.toLowerCase()}s.`)
      return
    }

    setError(null)
    setBusy(true)

    try {
      await onCreate(trimmedName)
      setName('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : `Could not add ${title.toLowerCase()}.`,
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.tableCard}>
      {canManage && (
        <div
          className={styles.toolbar}
          style={{ padding: '16px 16px 0' }}
        >
          <div
            className={styles.searchField}
            style={{ maxWidth: 260 }}
          >
            <input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (error) setError(null)
              }}
              placeholder={placeholder}
              disabled={busy}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  void handleAdd()
                }
              }}
            />
          </div>

          <button
            className={styles.btnPrimary}
            onClick={() => void handleAdd()}
            disabled={busy}
          >
            {busy
              ? 'Adding…'
              : `+ Add ${title.toLowerCase()}`}
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          style={{
            margin: '12px 16px 0',
            color: '#b42318',
            fontSize: '14px',
          }}
        >
          {error}
        </div>
      )}

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Status</th>
            {canManage && <th></th>}
          </tr>
        </thead>

        <tbody>
          {items.length === 0 && (
            <tr className={styles.emptyRow}>
              <td colSpan={canManage ? 3 : 2}>
                No {title.toLowerCase()} yet.
              </td>
            </tr>
          )}

          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.name}</td>

              <td>
                <span
                  className={`${styles.pill} ${styles[item.status]}`}
                >
                  {item.status}
                </span>
              </td>

              {canManage && (
                <td>
                  <button
                    className={styles.iconBtnSm}
                    onClick={() =>
                      void onToggle?.(
                        item.id,
                        item.status !== 'active',
                      )
                    }
                    aria-label="Toggle status"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                    >
                      <circle cx="12" cy="12" r="9" />
                      <path d="M8 12h8" />
                    </svg>
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}