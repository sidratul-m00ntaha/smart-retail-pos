import { useState } from 'react'
import styles from './ProductsPage.module.css'
import type { TaxRate } from '../../types/catalog'

interface Props {
  items: TaxRate[]
  onCreate: (name: string, ratePercent: number) => Promise<void>
  onToggle: (id: number, active: boolean) => Promise<void>
}

/** PRD 5.16 — named, reusable VAT rates (Standard VAT 15%, Reduced VAT 5%, Zero VAT 0%). */
export default function TaxRatesManager({ items, onCreate, onToggle }: Props) {
  const [name, setName] = useState('')
  const [rate, setRate] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleAdd() {
    if (!name.trim() || rate === '') return
    setBusy(true)
    try {
      await onCreate(name.trim(), Number(rate))
      setName('')
      setRate('')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.tableCard}>
      <div className={styles.toolbar} style={{ padding: '16px 16px 0' }}>
        <div className={styles.searchField} style={{ maxWidth: 220 }}>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Standard VAT" />
        </div>
        <div className={styles.selectField}>
          <input
            style={{ width: 90, padding: '9px 11px', border: '1px solid var(--border)', borderRadius: 9, fontSize: 13.5 }}
            type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="Rate %"
          />
        </div>
        <button className={styles.btnPrimary} onClick={handleAdd} disabled={busy}>+ Add tax rate</button>
      </div>
      <table>
        <thead><tr><th>Name</th><th>Rate</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {items.length === 0 && (
            <tr className={styles.emptyRow}><td colSpan={4}>No tax rates yet.</td></tr>
          )}
          {items.map((t) => (
            <tr key={t.tax_rate_id}>
              <td>{t.name}</td>
              <td className={styles.mono}>{t.rate_percent}%</td>
              <td><span className={`${styles.pill} ${styles[t.status]}`}>{t.status}</span></td>
              <td>
                <button className={styles.iconBtnSm} onClick={() => onToggle(t.tax_rate_id, t.status !== 'active')} aria-label="Toggle status">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <circle cx="12" cy="12" r="9" /><path d="M8 12h8" />
                  </svg>
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
