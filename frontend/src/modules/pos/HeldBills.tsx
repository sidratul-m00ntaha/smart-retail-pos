import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { discardHeldCart, listHeldCarts } from '../../services/pos.service.ts'
import type { HeldCart } from '../../services/pos.service.ts'
import { formatDateTime } from '../../utils/date.ts'
import styles from './HeldBills.module.css'

type HeldBillsProps = {
  /** Change this number to reload the list (after holding a bill or completing a sale). */
  refreshKey: number
  /** false while the screen holds a sale: resuming another bill would overwrite it. */
  canResume: boolean
  /** Loads the bill into the screen. Throws (ApiError) when it can't. */
  onResume: (heldCartId: number) => Promise<void>
}

function messageOf(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback
}

/** Bills put on hold so the cashier could serve the next customer. Any cashier can resume any of them. */
export default function HeldBills({ refreshKey, canResume, onResume }: HeldBillsProps) {
  const [carts, setCarts] = useState<HeldCart[]>([])
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [retryKey, setRetryKey] = useState(0)
  const [open, setOpen] = useState(false)
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirmId, setConfirmId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    listHeldCarts()
      .then((rows) => {
        if (cancelled) return
        setCarts(rows)
        setLoadState('ready')
      })
      .catch(() => {
        if (!cancelled) setLoadState('error')
      })
    return () => {
      cancelled = true
    }
  }, [refreshKey, retryKey])

  async function resume(cart: HeldCart) {
    setError(null)
    setBusyId(cart.held_cart_id)
    try {
      await onResume(cart.held_cart_id)
      setOpen(false)
    } catch (caught) {
      setError(messageOf(caught, 'Could not resume the held bill.'))
    } finally {
      setBusyId(null)
    }
  }

  async function discard(cart: HeldCart) {
    setError(null)
    setBusyId(cart.held_cart_id)
    try {
      await discardHeldCart(cart.held_cart_id)
      setCarts((rows) => rows.filter((row) => row.held_cart_id !== cart.held_cart_id))
      setConfirmId(null)
    } catch (caught) {
      setError(messageOf(caught, 'Could not discard the held bill.'))
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className={styles.wrap}>
      <button type="button" className={styles.toggle} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        Held bills{loadState === 'ready' && ` (${carts.length})`}
      </button>

      {open && (
        <section className={styles.panel} aria-label="Held bills">
          {loadState === 'loading' && <p className={styles.hint}>Loading held bills…</p>}
          {loadState === 'error' && (
            <p className={styles.error} role="alert">
              Could not load the held bills.{' '}
              <button
                type="button"
                className={styles.linkButton}
                onClick={() => {
                  setLoadState('loading')
                  setRetryKey((key) => key + 1)
                }}
              >
                Try again
              </button>
            </p>
          )}
          {loadState === 'ready' && carts.length === 0 && <p className={styles.hint}>No bills on hold.</p>}
          {loadState === 'ready' && carts.length > 0 && !canResume && (
            <p className={styles.hint}>Hold or clear the current sale before resuming another bill.</p>
          )}
          {error && (
            <p className={styles.error} role="alert">
              {error}
            </p>
          )}

          <ul className={styles.list}>
            {carts.map((cart) => {
              const label = cart.note ?? `bill ${cart.held_cart_id}`
              const units = cart.items.reduce((total, item) => total + Number(item.quantity), 0)
              return (
                <li key={cart.held_cart_id} className={styles.item}>
                  <div className={styles.info}>
                    <p className={styles.note}>{cart.note ?? 'No note'}</p>
                    <p className={styles.meta}>
                      {units} item{units === 1 ? '' : 's'} · {cart.cashier_name ?? 'Cashier'} · {formatDateTime(cart.created_at)}
                    </p>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.resume}
                      aria-label={`Resume ${label}`}
                      disabled={!canResume || busyId !== null}
                      onClick={() => resume(cart)}
                    >
                      Resume
                    </button>
                    {confirmId === cart.held_cart_id ? (
                      <>
                        <button
                          type="button"
                          className={styles.danger}
                          aria-label={`Confirm discard ${label}`}
                          disabled={busyId !== null}
                          onClick={() => discard(cart)}
                        >
                          Confirm
                        </button>
                        <button type="button" className={styles.linkButton} onClick={() => setConfirmId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        className={styles.linkButton}
                        aria-label={`Discard ${label}`}
                        disabled={busyId !== null}
                        onClick={() => setConfirmId(cart.held_cart_id)}
                      >
                        Discard
                      </button>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}
    </div>
  )
}
