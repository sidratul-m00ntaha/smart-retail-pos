import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api.ts'
import { createCustomer, listCustomers } from '../../services/customers.ts'
import type { Customer } from '../../services/customers.ts'
import { getLoyaltyStatus } from '../../services/pos.service.ts'
import { formatMoney, toHundredths } from './posMath.ts'
import styles from './CustomerPanel.module.css'

export type SelectedCustomer = {
  customer: Customer
  tierName: string
  /** Loyalty discount in hundredths of a percent, 10.00% = 1000 */
  discountHundredths: number
}

type CustomerPanelProps = {
  selected: SelectedCustomer | null
  onSelect: (selected: SelectedCustomer | null) => void
}

const MAX_RESULTS = 5

/** Who is buying: a guest (default) or a registered customer, who can get the loyalty discount and buy on due. */
export default function CustomerPanel({ selected, onSelect }: CustomerPanelProps) {
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('customers.create')

  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [reloadKey, setReloadKey] = useState(0)
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<number | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listCustomers()
      .then((rows) => {
        if (cancelled) return
        setCustomers(rows)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  const term = query.trim().toLowerCase()
  const matches =
    term === ''
      ? []
      : customers
          .filter((customer) => customer.status === 'active' && (customer.name.toLowerCase().includes(term) || customer.phone.includes(term)))
          .slice(0, MAX_RESULTS)

  async function pick(customer: Customer) {
    setPickError(null)
    setBusyId(customer.customer_id)
    try {
      const loyalty = await getLoyaltyStatus(customer.customer_id)
      onSelect({ customer, tierName: loyalty.tier_name, discountHundredths: Math.round(Number(loyalty.discount_percent) * 100) })
      setQuery('')
    } catch (error) {
      setPickError(error instanceof ApiError ? error.message : "Could not load the customer's loyalty details.")
    } finally {
      setBusyId(null)
    }
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    const cleanName = name.trim()
    const cleanPhone = phone.trim()
    if (cleanName === '' || cleanPhone === '') {
      setFormError('Enter a name and a phone number.')
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      // Only name and phone are sent, so the credit limit stays 0.00 until a manager raises it.
      const created = await createCustomer({ name: cleanName, phone: cleanPhone })
      setCustomers((rows) => [...rows, created])
      setFormOpen(false)
      setName('')
      setPhone('')
      await pick(created)
    } catch (error) {
      setFormError(error instanceof ApiError ? error.message : 'Could not save the customer.')
    } finally {
      setSaving(false)
    }
  }

  if (selected) {
    const { customer, tierName, discountHundredths } = selected
    return (
      <section className={styles.panel} aria-label="Customer">
        <div className={styles.selectedTop}>
          <div>
            <p className={styles.name}>{customer.name}</p>
            <p className={styles.meta}>{customer.phone}</p>
          </div>
          <button type="button" className={styles.linkButton} onClick={() => onSelect(null)}>
            Remove
          </button>
        </div>
        <p className={styles.chips}>
          <span className={styles.pill}>{discountHundredths > 0 ? `${tierName} · ${discountHundredths / 100}% off` : tierName}</span>
          <span className={styles.meta}>{customer.loyalty_points} points</span>
        </p>
        <p className={styles.meta}>
          Credit available {formatMoney(toHundredths(customer.available_credit))} · Due {formatMoney(toHundredths(customer.outstanding_due))}
        </p>
      </section>
    )
  }

  return (
    <section className={styles.panel} aria-label="Customer">
      <div className={styles.headerRow}>
        <h3 className={styles.title}>Customer</h3>
        <span className={styles.guest}>Guest</span>
      </div>
      <p className={styles.hint}>Guests must pay in full. Pick a customer to use the loyalty discount or sell on due.</p>

      {loadState === 'loading' && <p className={styles.hint}>Loading customers…</p>}
      {loadState === 'error' && (
        <p className={styles.error} role="alert">
          Could not load the customers.{' '}
          <button
            type="button"
            className={styles.linkButton}
            onClick={() => {
              setLoadState('loading')
              setReloadKey((key) => key + 1)
            }}
          >
            Try again
          </button>
        </p>
      )}
      {loadState === 'ready' && (
        <input
          className={styles.input}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search customer by name or phone"
          aria-label="Search customer"
        />
      )}

      {matches.length > 0 && (
        <ul className={styles.results}>
          {matches.map((customer) => (
            <li key={customer.customer_id}>
              <button type="button" className={styles.result} disabled={busyId !== null} onClick={() => pick(customer)}>
                <span className={styles.name}>{customer.name}</span>
                <span className={styles.meta}>{customer.phone}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {term !== '' && matches.length === 0 && loadState === 'ready' && <p className={styles.hint}>No customer found.</p>}
      {pickError && (
        <p className={styles.error} role="alert">
          {pickError}
        </p>
      )}

      {canCreate && !formOpen && (
        <button type="button" className={styles.linkButton} onClick={() => setFormOpen(true)}>
          + New customer
        </button>
      )}
      {formOpen && (
        <form className={styles.form} onSubmit={handleCreate}>
          <input className={styles.input} value={name} onChange={(event) => setName(event.target.value)} placeholder="Name" aria-label="New customer name" />
          <input className={styles.input} value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="Phone (e.g. 017...)" aria-label="New customer phone" />
          {formError && (
            <p className={styles.error} role="alert">
              {formError}
            </p>
          )}
          <div className={styles.formActions}>
            <button type="submit" className={styles.saveButton} disabled={saving}>
              {saving ? 'Saving…' : 'Save customer'}
            </button>
            <button type="button" className={styles.linkButton} onClick={() => setFormOpen(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
    </section>
  )
}
