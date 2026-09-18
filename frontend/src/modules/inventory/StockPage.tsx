import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getStock } from '../../services/stock.service.ts'
import type { ProductStock } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { formatDateTime } from '../../utils/date.ts'
import styles from './StockPage.module.css'

export default function StockPage() {
  const [stock, setStock] = useState<ProductStock[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getStock()
      .then(setStock)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load stock.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <MessagePanel title="Loading stock…" />
  if (error) return <MessagePanel title="Could not load stock">{error}</MessagePanel>
  if (stock.length === 0) {
    return <MessagePanel title="No stock yet">Stock levels appear here once products exist and purchases are recorded.</MessagePanel>
  }

  const lowCount = stock.filter((row) => row.is_low_stock).length
  const outCount = stock.filter((row) => row.current_stock === 0).length

  return (
    <>
      <div className={styles.statStrip}>
        <div className={styles.statChip}>
          <span className={styles.n}>{stock.length}</span> products tracked
        </div>
        {lowCount > 0 && (
          <div className={`${styles.statChip} ${styles.warn}`}>
            <span className={styles.n}>{lowCount}</span> low stock
          </div>
        )}
        {outCount > 0 && (
          <div className={`${styles.statChip} ${styles.bad}`}>
            <span className={styles.n}>{outCount}</span> out of stock
          </div>
        )}
      </div>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Product ID</th>
            <th>Current stock</th>
            <th>Reorder level</th>
            <th>Status</th>
            <th>Last updated</th>
          </tr>
        </thead>
        <tbody>
          {stock.map((row) => (
            <tr key={row.product_stock_id}>
              <td>{row.product_id}</td>
              <td>{row.current_stock}</td>
              <td>{row.reorder_level}</td>
              <td>
                {row.is_low_stock ? (
                  <span className={`${styles.statusPill} ${styles.low}`}>Low</span>
                ) : (
                  <span className={`${styles.statusPill} ${styles.normal}`}>Normal</span>
                )}
              </td>
              <td>{formatDateTime(row.updated_at)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  )
}