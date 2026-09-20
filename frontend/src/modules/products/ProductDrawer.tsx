import { useState } from 'react'
import styles from './ProductsPage.module.css'
import type { Product, NewProduct } from '../../types/product'
import type { Category, Brand, Unit, TaxRate } from '../../types/catalog'

interface Props {
  open: boolean
  product: Product | null
  categories: Category[]
  brands: Brand[]
  units: Unit[]
  taxRates: TaxRate[]
  onClose: () => void
  onSave: (data: NewProduct) => Promise<void>
}

const emptyForm: NewProduct = {
  product_code: '', barcode: '', name: '', category_id: 0, brand_id: undefined, unit_id: 0,
  tax_rate_id: undefined, purchase_price: 0, sale_price: 0, tax_percent: 0, reorder_level: 0,
  expiry_tracking: false, status: 'active',
}

export default function ProductDrawer({ open, product, categories, brands, units, taxRates, onClose, onSave }: Props) {
  if (!open) return null
  // The form is only mounted while the drawer is open, so it always starts from the product being edited
  return (
    <ProductForm
      product={product}
      categories={categories}
      brands={brands}
      units={units}
      taxRates={taxRates}
      onClose={onClose}
      onSave={onSave}
    />
  )
}

type ProductFormProps = Omit<Props, 'open'>

function ProductForm({ product, categories, brands, units, taxRates, onClose, onSave }: ProductFormProps) {
  const [form, setForm] = useState<NewProduct>(() =>
    product
      ? {
          product_code: product.product_code,
          barcode: product.barcode ?? '',
          name: product.name,
          category_id: product.category_id,
          brand_id: product.brand_id ?? undefined,
          unit_id: product.unit_id,
          tax_rate_id: product.tax_rate_id ?? undefined,
          purchase_price: product.purchase_price,
          sale_price: product.sale_price,
          tax_percent: product.tax_percent,
          reorder_level: product.reorder_level,
          expiry_tracking: product.expiry_tracking,
          status: product.status,
        }
      : emptyForm,
  )
  const [errors, setErrors] = useState<Record<string, boolean>>({})
  const [saving, setSaving] = useState(false)

  function set<K extends keyof NewProduct>(key: K, value: NewProduct[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSave() {
    const nextErrors: Record<string, boolean> = {
      name: !form.name.trim(),
      product_code: !form.product_code.trim(),
      category_id: !form.category_id,
      unit_id: !form.unit_id,
    }
    setErrors(nextErrors)
    if (Object.values(nextErrors).some(Boolean)) return

    setSaving(true)
    try {
      await onSave(form)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.drawer}>
        <div className={styles.drawerHead}>
          <h3>{product ? 'Edit product' : 'Add product'}</h3>
          <button className={styles.drawerClose} onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className={styles.drawerBody}>
          <div className={`${styles.formRow} ${errors.name ? styles.hasError : ''}`}>
            <label>Product name <span className={styles.req}>*</span></label>
            <input value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Rice 5kg" />
            {errors.name && <p className={styles.formError}>Enter a product name.</p>}
          </div>

          <div className={styles.form2col}>
            <div className={`${styles.formRow} ${errors.product_code ? styles.hasError : ''}`}>
              <label>SKU / product code <span className={styles.req}>*</span></label>
              <input value={form.product_code} onChange={(e) => set('product_code', e.target.value)} placeholder="PRD-1009" />
              {errors.product_code && <p className={styles.formError}>Enter a product code.</p>}
            </div>
            <div className={styles.formRow}>
              <label>Barcode</label>
              <input value={form.barcode ?? ''} onChange={(e) => set('barcode', e.target.value)} placeholder="1009" />
            </div>
          </div>

          <div className={styles.form2col}>
            <div className={`${styles.formRow} ${errors.category_id ? styles.hasError : ''}`}>
              <label>Category <span className={styles.req}>*</span></label>
              <select value={form.category_id || ''} onChange={(e) => set('category_id', Number(e.target.value))}>
                <option value="">Select…</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.name}</option>)}
              </select>
              {errors.category_id && <p className={styles.formError}>Select a category.</p>}
            </div>
            <div className={`${styles.formRow} ${errors.unit_id ? styles.hasError : ''}`}>
              <label>Unit <span className={styles.req}>*</span></label>
              <select value={form.unit_id || ''} onChange={(e) => set('unit_id', Number(e.target.value))}>
                <option value="">Select…</option>
                {units.map((u) => <option key={u.unit_id} value={u.unit_id}>{u.name}</option>)}
              </select>
              {errors.unit_id && <p className={styles.formError}>Select a unit.</p>}
            </div>
          </div>

          <div className={styles.formRow}>
            <label>Brand</label>
            <select value={form.brand_id ?? ''} onChange={(e) => set('brand_id', e.target.value ? Number(e.target.value) : undefined)}>
              <option value="">None</option>
              {brands.map((b) => <option key={b.brand_id} value={b.brand_id}>{b.name}</option>)}
            </select>
          </div>

          <div className={styles.form2col}>
            <div className={styles.formRow}>
              <label>Purchase price (Tk)</label>
              <input type="number" value={form.purchase_price} onChange={(e) => set('purchase_price', Number(e.target.value))} />
            </div>
            <div className={styles.formRow}>
              <label>Selling price (Tk)</label>
              <input type="number" value={form.sale_price} onChange={(e) => set('sale_price', Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.form2col}>
            <div className={styles.formRow}>
              <label>Tax / VAT rate</label>
              <select
                value={form.tax_rate_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value ? Number(e.target.value) : undefined
                  const rate = taxRates.find((t) => t.tax_rate_id === id)
                  set('tax_rate_id', id)
                  set('tax_percent', rate ? rate.rate_percent : 0)
                }}
              >
                <option value="">None</option>
                {taxRates.map((t) => <option key={t.tax_rate_id} value={t.tax_rate_id}>{t.name} ({t.rate_percent}%)</option>)}
              </select>
            </div>
            <div className={styles.formRow}>
              <label>Reorder level</label>
              <input type="number" value={form.reorder_level} onChange={(e) => set('reorder_level', Number(e.target.value))} />
            </div>
          </div>

          <div className={styles.toggleRow}>
            <div>
              <p className={styles.tLabel}>Expiry tracking</p>
              <p className={styles.tSub}>Enable for perishable products</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={form.expiry_tracking} onChange={(e) => set('expiry_tracking', e.target.checked)} />
              <span className={styles.slider} />
            </label>
          </div>
          <div className={styles.toggleRow}>
            <div>
              <p className={styles.tLabel}>Active</p>
              <p className={styles.tSub}>{form.status === 'active' ? 'Sellable and purchasable' : 'Hidden from POS · historical records kept'}</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" checked={form.status === 'active'} onChange={(e) => set('status', e.target.checked ? 'active' : 'inactive')} />
              <span className={styles.slider} />
            </label>
          </div>
        </div>
        <div className={styles.drawerFoot}>
          <button className={styles.btnSecondary} onClick={onClose}>Cancel</button>
          <button className={styles.btnSave} onClick={handleSave} disabled={saving}>
            {saving ? 'Saving…' : 'Save product'}
          </button>
        </div>
      </div>
    </>
  )
}
