import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api'
import { getBrands, createBrand, updateBrand } from '../../services/catalog.service'
import type { Brand } from '../../types/catalog'
import CatalogManager from './CatalogManager'
import { useToast } from './useToast'
import styles from './ProductsPage.module.css'

export default function BrandsPage() {
  const { hasPermission } = useAuth()
  const canManageProducts = hasPermission('products.manage')

  const [items, setItems] = useState<Brand[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { message, showToast } = useToast()

  async function load() {
    setIsLoading(true)
    try {
      setItems(await getBrands())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load brands.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true
    getBrands()
      .then((rows) => {
        if (isCurrent) setItems(rows)
      })
      .catch((err) => {
        if (isCurrent) setError(err instanceof ApiError ? err.message : 'Could not load brands.')
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
        title="Brand"
        placeholder="e.g. ACI"
        items={items.map((b) => ({ id: b.brand_id, name: b.name, status: b.status }))}
        canManage={canManageProducts}
        onCreate={canManageProducts ? async (name) => { await createBrand({ name }); showToast('Brand added.'); await load() } : undefined}
        onToggle={canManageProducts ? async (id, active) => { await updateBrand(id, { status: active ? 'active' : 'inactive' }); await load() } : undefined}
      />
      {message && <div className={`${styles.toast} ${styles.show}`}>{message}</div>}
    </section>
  )
}
