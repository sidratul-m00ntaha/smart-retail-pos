import type { ReactNode } from 'react'
import styles from './MessagePanel.module.css'

type MessagePanelProps = {
  title: string
  children?: ReactNode
  /** true = centred on an empty screen (used before the app layout is shown) */
  fullPage?: boolean
}

/** A simple card with a title and text - for loading, empty, error and "coming soon" states. */
export default function MessagePanel({ title, children, fullPage = false }: MessagePanelProps) {
  const panel = (
    <section className={styles.panel}>
      <h2 className={styles.title}>{title}</h2>
      {children && <div className={styles.text}>{children}</div>}
    </section>
  )
  return fullPage ? <div className={styles.fullPage}>{panel}</div> : panel
}
