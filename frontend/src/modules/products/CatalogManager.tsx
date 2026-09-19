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

/** Shared list UI for Categories, Brands and Units — PRD 5.4: each supports
 * Active/Inactive status and is managed independently. */
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

  async function handleAdd() {
    if (!name.trim() || !onCreate) return

    setBusy(true)
    try {
      await onCreate(name.trim())
      setName('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.tableCard}>
      {canManage && (
        <div className={styles.toolbar} style={{ padding: '16px 16px 0' }}>
          <div className={styles.searchField} style={{ maxWidth: 260 }}>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={placeholder}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            />
          </div>

          <button
            className={styles.btnPrimary}
            onClick={handleAdd}
            disabled={busy}
          >
            + Add {title.toLowerCase()}
          </button>
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
                      onToggle?.(item.id, item.status !== 'active')
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