import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getExpiryAlerts } from '../../services/stock.service.ts'
import type { StockBatch } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import styles from './ExpiryAlertsPage.module.css'

function daysUntil(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - new Date().setHours(0, 0, 0, 0)
  return Math.round(diff / 86400000)
}

export default function ExpiryAlertsPage() {
  const [batches, setBatches] = useState<StockBatch[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getExpiryAlerts(30)
      .then(setBatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load expiry alerts.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <MessagePanel title="Loading expiry alerts…" />
  if (error) return <MessagePanel title="Could not load expiry alerts">{error}</MessagePanel>
  if (batches.length === 0) {
    return <MessagePanel title="Nothing expiring soon">Batches expiring within 30 days will show up here.</MessagePanel>
  }

  return (
    <div className={styles.grid}>
      {batches.map((batch) => {
        const days = daysUntil(batch.expiry_date)
        const level = batch.is_expired ? 'expired' : 'soon'
        const daysLabel = days < 0 ? `${Math.abs(days)}d ago` : `${days}d left`
        const tagLabel = batch.is_expired ? 'Expired' : 'Expiring soon'

        return (
          <div key={batch.stock_batch_id} className={`${styles.card} ${styles[level]}`}>
            <div className={styles.top}>
              <div>
                <p className={styles.name}>Product #{batch.product_id}</p>
                <p className={styles.batch}>Batch {batch.batch_number}</p>
              </div>
              <span className={`${styles.tag} ${styles[level]}`}>{tagLabel}</span>
            </div>
            <div className={styles.meta}><span>Quantity</span><span>{batch.quantity}</span></div>
            <div className={styles.meta}><span>Expiry date</span><span>{batch.expiry_date}</span></div>
            <div className={styles.meta}><span>Time left</span><span>{daysLabel}</span></div>
          </div>
        )
      })}
    </div>
  )
}