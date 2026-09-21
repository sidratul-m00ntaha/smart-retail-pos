import { useEffect, useRef, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import type { Sale } from '../../services/pos.service.ts'
import { getInvoice } from '../../services/sales.service.ts'
import InvoiceDocument from './InvoiceDocument.tsx'
import InvoiceModal from './InvoiceModal.tsx'
import styles from './InvoiceModal.module.css'

type InvoiceDialogProps = {
  invoiceNumber: string
  onClose: () => void
}

type State = { status: 'loading' } | { status: 'ready'; sale: Sale } | { status: 'error'; message: string }

/** Opens an invoice from the Sales or Invoices page: loads it by number, shows it, and lets the manager print it. */
export default function InvoiceDialog({ invoiceNumber, onClose }: InvoiceDialogProps) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    let cancelled = false
    getInvoice(invoiceNumber)
      .then((sale) => {
        if (!cancelled) setState({ status: 'ready', sale })
      })
      .catch((error) => {
        if (!cancelled) setState({ status: 'error', message: error instanceof ApiError ? error.message : 'Could not load the invoice.' })
      })
    return () => {
      cancelled = true
    }
  }, [invoiceNumber, retryKey])

  return (
    <InvoiceModal
      label={`Invoice ${invoiceNumber}`}
      focusRef={closeRef}
      onEscape={onClose}
      actions={
        <>
          {state.status === 'ready' && (
            <button type="button" className={styles.secondary} onClick={() => window.print()}>
              Print
            </button>
          )}
          {state.status === 'error' && (
            <button
              type="button"
              className={styles.secondary}
              onClick={() => {
                setState({ status: 'loading' })
                setRetryKey((key) => key + 1)
              }}
            >
              Try again
            </button>
          )}
          <button type="button" className={styles.primary} ref={closeRef} onClick={onClose}>
            Close
          </button>
        </>
      }
    >
      {state.status === 'loading' && <p className={styles.message}>Loading invoice…</p>}
      {state.status === 'error' && (
        <p className={styles.error} role="alert">
          {state.message}
        </p>
      )}
      {state.status === 'ready' && <InvoiceDocument sale={state.sale} />}
    </InvoiceModal>
  )
}
