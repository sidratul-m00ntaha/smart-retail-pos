import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api'
import { getUnits, createUnit, updateUnit } from '../../services/catalog.service'
import type { Unit } from '../../types/catalog'
import CatalogManager from './CatalogManager'
import { useToast } from './useToast'
import styles from './ProductsPage.module.css'

export default function UnitsPage() {
  const { hasPermission } = useAuth()
  const canManageProducts = hasPermission('products.manage')

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

  useEffect(() => {
    let isCurrent = true
    getUnits()
      .then((rows) => {
        if (isCurrent) setItems(rows)
      })
      .catch((err) => {
        if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load units.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <CatalogManager
        title="Unit"
        placeholder="e.g. Piece"
        items={items.map((u) => ({ id: u.unit_id, name: u.name, status: u.status }))}
        canManage={canManageProducts}
        onCreate={canManageProducts ? async (name) => { await createUnit({ name }); showToast('Unit added.'); await load() } : undefined}
        onToggle={canManageProducts ? async (id, active) => { await updateUnit(id, { status: active ? 'active' : 'inactive' }); await load() } : undefined}
      />
      {message && <div className={`${styles.toast} ${styles.show}`}>{message}</div>}
    </section>
  )
}
