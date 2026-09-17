import { useEffect, useId, type ReactNode } from 'react'
import styles from './Drawer.module.css'

type DrawerProps = {
  title: string
  onClose: () => void
  children: ReactNode
  /** Buttons at the bottom, e.g. Cancel and Save */
  footer?: ReactNode
}

/** A panel that slides in from the right over the page - use it for add/edit forms. */
export default function Drawer({ title, onClose, children, footer }: DrawerProps) {
  const titleId = useId()

  // Close with the Escape key
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <aside
        className={styles.drawer}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        <header className={styles.head}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>
        <div className={styles.body}>{children}</div>
        {footer && <footer className={styles.foot}>{footer}</footer>}
      </aside>
    </div>
  )
}
