import { useEffect, useState } from 'react'
import { getProducts } from '../../services/product.service.ts'
import { toPosProduct } from './posProducts.ts'
import type { PosProduct } from './posProducts.ts'

type ProductsState = { status: 'loading' | 'ready' | 'error'; products: PosProduct[] }

/**
 * The active products the POS can sell, from Module 2's API.
 * reload() refreshes them quietly (for the stock numbers after a sale); retry() is for the error message.
 */
export function usePosProducts() {
  const [state, setState] = useState<ProductsState>({ status: 'loading', products: [] })
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    getProducts({ status_filter: 'active' })
      .then((rows) => {
        if (!cancelled) setState({ status: 'ready', products: rows.map(toPosProduct) })
      })
      .catch(() => {
        // A failed quiet refresh keeps the products already on screen; only a first load shows the error.
        if (!cancelled) setState((previous) => (previous.products.length > 0 ? previous : { status: 'error', products: [] }))
      })
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  return {
    products: state.products,
    status: state.status,
    reload: () => setReloadKey((key) => key + 1),
    retry: () => {
      setState({ status: 'loading', products: [] })
      setReloadKey((key) => key + 1)
    },
  }
}
