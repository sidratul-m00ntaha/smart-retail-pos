import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getUnits, createUnit, updateUnit } from '../../services/catalog.service'
import type { Unit } from '../../types/catalog'
import CatalogManager from './CatalogManager'
import { useToast } from './useToast'
import styles from './ProductsPage.module.css'

export default function UnitsPage() {
  const [items, setItems] = useState<Unit[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { message, showToast } = useToast()

  async function load() {
    setIsLoading(true)
    try {
      setItems(await getUnits())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load units.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <CatalogManager
        title="Unit"
        placeholder="e.g. Piece"
        items={items.map((u) => ({ id: u.unit_id, name: u.name, status: u.status }))}
        onCreate={async (name) => { await createUnit({ name }); showToast('Unit added.'); await load() }}
        onToggle={async (id, active) => { await updateUnit(id, { status: active ? 'active' : 'inactive' }); await load() }}
      />
      {message && <div className={`${styles.toast} ${styles.show}`}>{message}</div>}
    </section>
  )
}
