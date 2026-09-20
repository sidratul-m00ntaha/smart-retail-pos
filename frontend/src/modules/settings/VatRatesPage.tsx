import { useEffect, useState } from 'react'
import { ApiError } from '../../services/api'
import { getTaxRates, createTaxRate, updateTaxRate } from '../../services/catalog.service'
import type { TaxRate } from '../../types/catalog'
import TaxRatesManager from '../products/TaxRatesManager'
import { useToast } from '../products/useToast'
import styles from '../products/ProductsPage.module.css'

export default function VatRatesPage() {
  const [items, setItems] = useState<TaxRate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { message, showToast } = useToast()

  async function load() {
    setIsLoading(true)
    try {
      setItems(await getTaxRates())
      setError(null)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load VAT rates.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  if (isLoading) return <p>Loading…</p>
  if (error) return <p>{error}</p>

  return (
    <section>
      <TaxRatesManager
        items={items}
        onCreate={async (name, ratePercent) => {
          await createTaxRate({ name, rate_percent: ratePercent })
          showToast('VAT rate added.')
          await load()
        }}
        onToggle={async (id, active) => {
          await updateTaxRate(id, { status: active ? 'active' : 'inactive' })
          await load()
        }}
      />
      {message && <div className={`${styles.toast} ${styles.show}`}>{message}</div>}
    </section>
  )
}
