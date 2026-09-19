import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getBrands, createBrand, updateBrand } from '../../services/catalog.service'
import type { Brand } from '../../types/catalog'
import CatalogManager from './CatalogManager'
import { useToast } from './useToast'
import styles from './ProductsPage.module.css'

export default function BrandsPage() {
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

  useEffect(() => { load() }, [])

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <CatalogManager
        title="Brand"
        placeholder="e.g. ACI"
        items={items.map((b) => ({ id: b.brand_id, name: b.name, status: b.status }))}
        onCreate={async (name) => { await createBrand({ name }); showToast('Brand added.'); await load() }}
        onToggle={async (id, active) => { await updateBrand(id, { status: active ? 'active' : 'inactive' }); await load() }}
      />
      {message && <div className={`${styles.toast} ${styles.show}`}>{message}</div>}
    </section>
  )
}
