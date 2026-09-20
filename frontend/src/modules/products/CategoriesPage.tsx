import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api'
import { getCategories, createCategory, updateCategory } from '../../services/catalog.service'
import type { Category } from '../../types/catalog'
import CatalogManager from './CatalogManager'
import { useToast } from './useToast'
import styles from './ProductsPage.module.css'

export default function CategoriesPage() {
  const { hasPermission } = useAuth()
  const canManageProducts = hasPermission('products.manage')

  const [items, setItems] = useState<Category[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { message, showToast } = useToast()

  async function load() {
    setIsLoading(true)
    try {
      setItems(await getCategories())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load categories.')
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
        title="Category"
        placeholder="e.g. Grocery"
        items={items.map((c) => ({
          id: c.category_id,
          name: c.name,
          status: c.status,
        }))}
        canManage={canManageProducts}
        onCreate={canManageProducts ? async (name) => {
          await createCategory({ name })
          showToast('Category added.')
          await load()
        } : undefined}
        onToggle={canManageProducts ? async (id, active) => {
          await updateCategory(id, {
            status: active ? 'active' : 'inactive',
          })
          await load()
        } : undefined}
      />

      {message && (
        <div className={`${styles.toast} ${styles.show}`}>
          {message}
        </div>
      )}
    </section>
  )
}