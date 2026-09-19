import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api.ts'
import { getMovements } from '../../services/stock.service.ts'
import type { StockMovement } from '../../types/stock.ts'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { formatDateTime } from '../../utils/date.ts'
import styles from './StockPage.module.css'

export default function MovementsPage() {
  const [movements, setMovements] = useState<StockMovement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getMovements()
      .then(setMovements)
      .catch((err) => setError(err instanceof ApiError ? err.message : 'Could not load movements.'))
      .finally(() => setIsLoading(false))
  }, [])

  if (isLoading) return <MessagePanel title="Loading movements…" />
  if (error) return <MessagePanel title="Could not load movements">{error}</MessagePanel>
  if (movements.length === 0) {
    return <MessagePanel title="No movements yet">Stock in/out history appears here once purchases or sales are recorded.</MessagePanel>
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>Product ID</th>
          <th>Type</th>
          <th>Quantity</th>
          <th>Balance after</th>
          <th>Source</th>
          <th>When</th>
        </tr>
      </thead>
      <tbody>
        {movements.map((row) => (
          <tr key={row.stock_movement_id}>
            <td>{row.product_id}</td>
            <td className={row.movement_type === 'in' ? styles.ok : styles.lowStock}>
              {row.movement_type === 'in' ? 'In' : 'Out'}
            </td>
            <td>{row.quantity}</td>
            <td>{row.running_balance}</td>
            <td>{row.source}</td>
            <td>{formatDateTime(row.created_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}