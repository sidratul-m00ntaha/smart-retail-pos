import { useEffect, useRef } from 'react'
import type { ReactNode, RefObject } from 'react'
import { createPortal } from 'react-dom'
import styles from './InvoiceModal.module.css'

type InvoiceModalProps = {
  /** What screen readers announce, e.g. "Invoice INV-2026-00125" */
  label: string
  /** The invoice document, or a loading / error message */
  children: ReactNode
  /** The buttons under the invoice. They are not printed. */
  actions: ReactNode
  /** The button to focus when the dialog opens; the dialog itself if left out */
  focusRef?: RefObject<HTMLElement | null>
  /** Called when Escape is pressed. Leave it out where closing must be a deliberate click (the POS receipt). */
  onEscape?: () => void
}

/**
 * The paper-like dialog around an invoice. Printing shows only the invoice: the app behind it is hidden,
 * because the dialog is rendered next to #root, not inside it.
 */
export default function InvoiceModal({ label, children, actions, focusRef, onEscape }: InvoiceModalProps) {
  const cardRef = useRef<HTMLElement>(null)
  useEffect(() => {
    ;(focusRef?.current ?? cardRef.current)?.focus()
  }, [focusRef])

  return createPortal(
    <div
      className={styles.overlay}
      onKeyDown={onEscape ? (event) => event.key === 'Escape' && onEscape() : undefined}
    >
      <section ref={cardRef} tabIndex={-1} className={styles.card} role="dialog" aria-modal="true" aria-label={label}>
        {children}
        <div className={`${styles.actions} ${styles.noPrint}`}>{actions}</div>
      </section>
    </div>,
    document.body,
  )
}
