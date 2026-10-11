import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { ApiError } from '../../services/api.ts'
import { getPublicInvoice } from '../../services/invoice-share.ts'
import type { InvoiceData } from '../../services/pos.service.ts'
import InvoiceDocument from './InvoiceDocument.tsx'
import styles from './PublicInvoicePage.module.css'

type State = { status: 'loading' } | { status: 'ready'; invoice: InvoiceData } | { status: 'error'; message: string }

/** What opens when a customer scans the QR code on an invoice: just their invoice, no login. */
export default function PublicInvoicePage() {
  const { code = '' } = useParams()
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    getPublicInvoice(code)
      .then((invoice) => {
        if (!cancelled) setState({ status: 'ready', invoice })
      })
      .catch((error) => {
        if (cancelled) return
        const notFound = error instanceof ApiError && error.status === 404
        setState({
          status: 'error',
          message: notFound ? 'This invoice link is not valid.' : 'Could not load the invoice. Please try again in a moment.',
        })
      })
    return () => {
      cancelled = true
    }
  }, [code])

  return (
    <main className={styles.page}>
      {/* The invoice is white like paper in both themes */}
      <div className={styles.card} data-theme="light">
        {state.status === 'loading' && <p className={styles.message}>Loading invoice…</p>}
        {state.status === 'error' && (
          <p className={styles.error} role="alert">
            {state.message}
          </p>
        )}
        {state.status === 'ready' && (
          <>
            <InvoiceDocument sale={state.invoice} />
            <p className={styles.thanks}>Thank you for shopping with us.</p>
          </>
        )}
      </div>
    </main>
  )
}
