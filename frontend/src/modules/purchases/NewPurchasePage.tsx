// import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
// import { Link, useNavigate } from 'react-router'
// import MessagePanel from '../../components/common/MessagePanel.tsx'
// import { ApiError } from '../../services/api.ts'
// import { getTaxRates } from '../../services/catalog.service.ts'
// import { getProducts } from '../../services/product.service.ts'
// import { createPurchase, getSuppliers } from '../../services/purchasing.service.ts'
// import { getStoreSettings } from '../../services/store-settings.service.ts'
// import type { TaxRate } from '../../types/catalog.ts'
// import type { Product } from '../../types/product.ts'
// import type { NewPurchaseLine, PaymentMethod, Supplier } from '../../types/purchasing.ts'
// import {
//   calculatePurchase,
//   formatMoney,
//   PAYMENT_METHODS,
//   parseAmount,
//   parsePercent,
//   parseQuantity,
//   toHundredths,
//   toInputText,
//   todayText,
// } from './purchasingUtils.ts'
// import styles from './purchasing.module.css'

// /** One product on the purchase. Everything is text until it is checked, so half-typed numbers are fine. */
// type LineDraft = {
//   key: number
//   product: Product
//   quantity: string
//   unitPrice: string
//   discount: string
//   batchNumber: string
//   expiryDate: string
// }

// type ParsedLine = { quantity: number | null; price: number | null; discount: number | null }

// const MAX_RESULTS = 6

// /**
//  * New purchase page (PRD 5.6): pick the supplier, add what was delivered, check the totals, say what was paid.
//  * Confirming saves the purchase AND adds the stock, in one step on the server.
//  */
// export default function NewPurchasePage() {
//   const ids = useId()
//   const navigate = useNavigate()
//   const nextKey = useRef(1)

//   const [suppliers, setSuppliers] = useState<Supplier[]>([])
//   const [products, setProducts] = useState<Product[]>([])
//   const [taxRates, setTaxRates] = useState<TaxRate[]>([])
//   const [isLoading, setIsLoading] = useState(true)
//   const [loadError, setLoadError] = useState<string | null>(null)

//   const [supplierId, setSupplierId] = useState('')
//   const [lines, setLines] = useState<LineDraft[]>([])
//   const [search, setSearch] = useState('')
//   const [searchMessage, setSearchMessage] = useState<string | null>(null)
//   const [taxRateId, setTaxRateId] = useState('')
//   const [discountText, setDiscountText] = useState('')
//   const [shippingText, setShippingText] = useState('')
//   const [paidText, setPaidText] = useState('')
//   const [method, setMethod] = useState<PaymentMethod>('cash')
//   const [note, setNote] = useState('')
//   const [saveError, setSaveError] = useState<string | null>(null)
//   const [isSaving, setIsSaving] = useState(false)
//   const [today] = useState(todayText)

//   useEffect(() => {
//     let isCurrent = true
//     Promise.all([getSuppliers('active'), getProducts(), getTaxRates(), getStoreSettings().catch(() => null)])
//       .then(([supplierRows, productRows, rateRows, settings]) => {
//         if (!isCurrent) return
//         const activeRates = rateRows.filter((rate) => rate.status === 'active')
//         setSuppliers(supplierRows)
//         setProducts(productRows.filter((product) => product.status === 'active'))
//         setTaxRates(activeRates)
//         // Start from the store's default VAT rate, when one is set in Settings
//         const defaultRateId = settings?.default_tax_rate_id
//         if (defaultRateId != null && activeRates.some((rate) => rate.tax_rate_id === defaultRateId)) {
//           setTaxRateId(String(defaultRateId))
//         }
//       })
//       .catch((err) => {
//         if (isCurrent) setLoadError(err instanceof ApiError ? err.message : 'Could not open the new purchase page.')
//       })
//       .finally(() => {
//         if (isCurrent) setIsLoading(false)
//       })
//     return () => {
//       isCurrent = false
//     }
//   }, [])

//   // ---- what the manager typed, checked ----
//   const supplier = suppliers.find((row) => String(row.supplier_id) === supplierId)
//   const parsed: ParsedLine[] = lines.map((line) => ({
//     quantity: parseQuantity(line.quantity),
//     price: parseAmount(line.unitPrice),
//     discount: parsePercent(line.discount),
//   }))
//   const lineProblems = lines.map((line, index) => lineProblem(line, parsed[index], today))
//   const discount = parseAmount(discountText)
//   const shipping = parseAmount(shippingText)
//   const paid = parseAmount(paidText)
//   const taxRate = taxRates.find((rate) => String(rate.tax_rate_id) === taxRateId)
//   const taxHundredths = taxRate ? Math.round(Number(taxRate.rate_percent) * 100) : 0

//   const preview = calculatePurchase(
//     parsed.map((line) => ({ unitPrice: line.price ?? 0, quantity: line.quantity ?? 0, discountHundredths: line.discount ?? 0 })),
//     discount ?? 0,
//     taxHundredths,
//     shipping ?? 0,
//   )

//   // The first thing still missing. The Confirm button stays off until nothing is missing.
//   let nextStep: string | null = null
//   if (supplierId === '') nextStep = 'Choose the supplier.'
//   else if (lines.length === 0) nextStep = 'Add the products that were delivered.'
//   else if (lineProblems.some((problem) => problem !== null)) nextStep = 'Fix the line marked in red.'
//   else if (discount === null) nextStep = 'Enter the discount like 50 or 50.50.'
//   else if (shipping === null) nextStep = 'Enter the shipping charge like 50 or 50.50.'
//   else if (discount > preview.subtotal) nextStep = "The discount can't be more than the subtotal."
//   else if (paid === null) nextStep = 'Enter the amount paid like 250 or 250.50.'
//   else if (paid > preview.total) nextStep = `The amount paid can't be more than ${formatMoney(preview.total)}.`

//   const term = search.trim().toLowerCase()
//   const matches =
//     term === ''
//       ? []
//       : products
//           .filter(
//             (product) =>
//               product.name.toLowerCase().includes(term) ||
//               product.product_code.toLowerCase().includes(term) ||
//               (product.barcode ?? '').includes(term),
//           )
//           .slice(0, MAX_RESULTS)

//   // ---- actions ----
//   function addProduct(product: Product) {
//     setSearch('')
//     setSearchMessage(null)
//     const key = nextKey.current++
//     setLines((current) => {
//       // The same product twice is one line with a bigger quantity - except products with expiry, where each batch is its own line
//       const existing = product.expiry_tracking ? undefined : current.find((line) => line.product.product_id === product.product_id)
//       if (existing) {
//         return current.map((line) => (line === existing ? { ...line, quantity: String((parseQuantity(line.quantity) ?? 0) + 1) } : line))
//       }
//       return [
//         ...current,
//         {
//           key,
//           product,
//           quantity: '1',
//           unitPrice: toInputText(toHundredths(String(product.purchase_price))),
//           discount: '0',
//           batchNumber: '',
//           expiryDate: '',
//         },
//       ]
//     })
//   }

//   function updateLine(key: number, change: Partial<LineDraft>) {
//     setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))
//   }

//   function removeLine(key: number) {
//     setLines((current) => current.filter((line) => line.key !== key))
//   }

//   /** Enter adds the product: an exact barcode or SKU first, otherwise the first match. Never submits the purchase. */
//   function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
//     if (event.key !== 'Enter') return
//     event.preventDefault()
//     const code = search.trim()
//     if (code === '') return
//     const exact = products.find((product) => product.barcode === code || product.product_code.toLowerCase() === code.toLowerCase())
//     const chosen = exact ?? matches[0]
//     if (chosen) addProduct(chosen)
//     else setSearchMessage(`No active product matches "${code}".`)
//   }

//   async function handleConfirm() {
//     if (nextStep !== null || isSaving || discount === null || shipping === null || paid === null) return

//     const items: NewPurchaseLine[] = []
//     for (const [index, line] of lines.entries()) {
//       const { quantity, price, discount: lineDiscount } = parsed[index]
//       if (quantity === null || price === null || lineDiscount === null) return
//       items.push({
//         product_id: line.product.product_id,
//         quantity,
//         unit_price: toInputText(price),
//         line_discount_percent: toInputText(lineDiscount),
//         batch_number: line.product.expiry_tracking ? line.batchNumber.trim() : null,
//         expiry_date: line.product.expiry_tracking ? line.expiryDate : null,
//       })
//     }

//     setIsSaving(true)
//     setSaveError(null)
//     try {
//       const saved = await createPurchase({
//         supplier_id: Number(supplierId),
//         items,
//         discount_amount: toInputText(discount),
//         tax_rate_id: taxRate ? taxRate.tax_rate_id : null,
//         shipping_charge: toInputText(shipping),
//         paid_amount: toInputText(paid),
//         payment_method: paid > 0 ? method : null,
//         note: note.trim() === '' ? null : note.trim(),
//       })
//       navigate('/purchasing/purchases', { state: { notice: `Purchase ${saved.purchase_number} confirmed. Stock was increased.` } })
//     } catch (err) {
//       setSaveError(err instanceof ApiError ? err.message : 'Could not save the purchase.')
//       setIsSaving(false)
//     }
//   }

//   if (isLoading) return <MessagePanel title="Opening the new purchase…" />
//   if (loadError) return <MessagePanel title="Could not open the new purchase page">{loadError}</MessagePanel>
//   if (suppliers.length === 0) {
//     return (
//       <MessagePanel title="Add a supplier first">
//         <p>A purchase needs an active supplier.</p>
//         <p>
//           <Link to="/purchasing/suppliers">Go to Suppliers</Link>
//         </p>
//       </MessagePanel>
//     )
//   }

//   const supplierDue = supplier ? toHundredths(supplier.outstanding_due) : 0
//   const due = preview.total - (paid ?? 0)

//   return (
//     <>
//       <Link to="/purchasing/purchases" className={styles.backLink}>
//         Back to purchases
//       </Link>

//       <div className={styles.purchaseLayout}>
//         <div className={styles.purchaseMain}>
//           <section className={styles.card} aria-labelledby={`${ids}-supplier-title`}>
//             <h2 className={styles.cardTitle} id={`${ids}-supplier-title`}>
//               Supplier
//             </h2>
//             <select
//               className={styles.wideSelect}
//               value={supplierId}
//               onChange={(event) => setSupplierId(event.target.value)}
//               aria-label="Supplier"
//             >
//               <option value="">Choose the supplier…</option>
//               {suppliers.map((row) => (
//                 <option key={row.supplier_id} value={row.supplier_id}>
//                   {row.name}
//                 </option>
//               ))}
//             </select>
//             {supplier && (
//               <p className={styles.cardSub}>
//                 {supplier.phone}
//                 {supplierDue > 0 ? ` · we already owe this supplier ${formatMoney(supplierDue)}` : ' · nothing owed to this supplier yet'}
//               </p>
//             )}
//           </section>

//           <section className={styles.card} aria-labelledby={`${ids}-items-title`}>
//             <h2 className={styles.cardTitle} id={`${ids}-items-title`}>
//               Products delivered
//             </h2>

//             {products.length === 0 ? (
//               <p className={styles.cardSub}>There are no active products. Add products first, then come back.</p>
//             ) : (
//               <div className={styles.picker}>
//                 <input
//                   className={styles.pickerInput}
//                   value={search}
//                   onChange={(event) => {
//                     setSearch(event.target.value)
//                     setSearchMessage(null)
//                   }}
//                   onKeyDown={handleSearchKeyDown}
//                   placeholder="Scan a barcode or search by name or SKU, then press Enter"
//                   aria-label="Find a product"
//                   autoComplete="off"
//                 />
//                 {matches.length > 0 && (
//                   <ul className={styles.results}>
//                     {matches.map((product) => (
//                       <li key={product.product_id}>
//                         <button type="button" className={styles.result} onClick={() => addProduct(product)}>
//                           <span>
//                             {product.name}
//                             {product.expiry_tracking && <span className={styles.expiryTag}>expires</span>}
//                           </span>
//                           <span className={styles.resultMeta}>
//                             {product.product_code} · cost {formatMoney(toHundredths(String(product.purchase_price)))}
//                           </span>
//                         </button>
//                       </li>
//                     ))}
//                   </ul>
//                 )}
//                 {term !== '' && matches.length === 0 && <p className={styles.hint}>No active product matches.</p>}
//                 {searchMessage && (
//                   <p className={styles.fieldError} role="alert">
//                     {searchMessage}
//                   </p>
//                 )}
//               </div>
//             )}

//             {lines.length === 0 ? (
//               <p className={styles.emptyLines}>Nothing added yet. Search above to add the first product.</p>
//             ) : (
//               <div className={styles.linesWrap}>
//                 <table className={styles.linesTable}>
//                   <thead>
//                     <tr>
//                       <th>Product</th>
//                       <th>Quantity</th>
//                       <th>Unit price</th>
//                       <th>Discount %</th>
//                       <th className={styles.right}>Line total</th>
//                       <th>
//                         <span className={styles.visuallyHidden}>Remove</span>
//                       </th>
//                     </tr>
//                   </thead>
//                   <tbody>
//                     {lines.map((line, index) => {
//                       const problem = lineProblems[index]
//                       const name = line.product.name
//                       return (
//                         <Fragment key={line.key}>
//                           <tr>
//                             <td>
//                               <p className={styles.nameMain}>{name}</p>
//                               <p className={styles.nameSub}>{line.product.product_code}</p>
//                             </td>
//                             <td>
//                               <input
//                                 className={styles.lineInput}
//                                 inputMode="numeric"
//                                 value={line.quantity}
//                                 onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
//                                 aria-label={`Quantity of ${name}`}
//                               />
//                             </td>
//                             <td>
//                               <input
//                                 className={styles.lineInput}
//                                 inputMode="decimal"
//                                 value={line.unitPrice}
//                                 onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
//                                 aria-label={`Unit price of ${name}`}
//                               />
//                             </td>
//                             <td>
//                               <input
//                                 className={styles.lineInput}
//                                 inputMode="decimal"
//                                 value={line.discount}
//                                 onChange={(event) => updateLine(line.key, { discount: event.target.value })}
//                                 aria-label={`Discount percent of ${name}`}
//                               />
//                             </td>
//                             <td className={`${styles.mono} ${styles.right}`}>{problem ? '—' : formatMoney(preview.lines[index])}</td>
//                             <td>
//                               <button type="button" className={styles.removeButton} onClick={() => removeLine(line.key)} aria-label={`Remove ${name}`}>
//                                 ×
//                               </button>
//                             </td>
//                           </tr>
//                           {line.product.expiry_tracking && (
//                             <tr className={styles.batchRow}>
//                               <td colSpan={6}>
//                                 <div className={styles.batchFields}>
//                                   <label>
//                                     Batch number
//                                     <input
//                                       className={styles.lineInput}
//                                       value={line.batchNumber}
//                                       maxLength={50}
//                                       onChange={(event) => updateLine(line.key, { batchNumber: event.target.value })}
//                                     />
//                                   </label>
//                                   <label>
//                                     Expiry date
//                                     <input
//                                       className={styles.lineInput}
//                                       type="date"
//                                       min={today}
//                                       value={line.expiryDate}
//                                       onChange={(event) => updateLine(line.key, { expiryDate: event.target.value })}
//                                     />
//                                   </label>
//                                 </div>
//                               </td>
//                             </tr>
//                           )}
//                           {problem && (
//                             <tr>
//                               <td colSpan={6} className={styles.lineHint} role="alert">
//                                 {name}: {problem}
//                               </td>
//                             </tr>
//                           )}
//                         </Fragment>
//                       )
//                     })}
//                   </tbody>
//                 </table>
//               </div>
//             )}
//           </section>
//         </div>

//         <aside className={styles.summaryCard} aria-label="Purchase summary">
//           <h2 className={styles.cardTitle}>Summary</h2>

//           <div className={styles.twoColumns}>
//             <div className={styles.formRow}>
//               <label className={styles.label} htmlFor={`${ids}-discount`}>
//                 Discount (Tk)
//               </label>
//               <input
//                 id={`${ids}-discount`}
//                 inputMode="decimal"
//                 placeholder="0.00"
//                 value={discountText}
//                 onChange={(event) => setDiscountText(event.target.value)}
//               />
//             </div>
//             <div className={styles.formRow}>
//               <label className={styles.label} htmlFor={`${ids}-shipping`}>
//                 Shipping (Tk)
//               </label>
//               <input
//                 id={`${ids}-shipping`}
//                 inputMode="decimal"
//                 placeholder="0.00"
//                 value={shippingText}
//                 onChange={(event) => setShippingText(event.target.value)}
//               />
//             </div>
//           </div>

//           <div className={styles.formRow}>
//             <label className={styles.label} htmlFor={`${ids}-vat`}>
//               VAT rate
//             </label>
//             <select id={`${ids}-vat`} value={taxRateId} onChange={(event) => setTaxRateId(event.target.value)}>
//               <option value="">No VAT</option>
//               {taxRates.map((rate) => (
//                 <option key={rate.tax_rate_id} value={rate.tax_rate_id}>
//                   {rate.name} ({Number(rate.rate_percent)}%)
//                 </option>
//               ))}
//             </select>
//           </div>

//           <dl className={styles.totalsBox}>
//             <div className={styles.totalRow}>
//               <dt>Subtotal</dt>
//               <dd>{formatMoney(preview.subtotal)}</dd>
//             </div>
//             {preview.discount > 0 && (
//               <div className={styles.totalRow}>
//                 <dt>Discount</dt>
//                 <dd>− {formatMoney(preview.discount)}</dd>
//               </div>
//             )}
//             {taxHundredths > 0 && (
//               <div className={styles.totalRow}>
//                 <dt>VAT ({taxHundredths / 100}%)</dt>
//                 <dd>{formatMoney(preview.tax)}</dd>
//               </div>
//             )}
//             {preview.shipping > 0 && (
//               <div className={styles.totalRow}>
//                 <dt>Shipping</dt>
//                 <dd>{formatMoney(preview.shipping)}</dd>
//               </div>
//             )}
//             <div className={`${styles.totalRow} ${styles.grandTotal}`}>
//               <dt>Total</dt>
//               <dd>{formatMoney(preview.total)}</dd>
//             </div>
//           </dl>

//           <h3 className={styles.subTitle}>Paid now</h3>
//           <div className={styles.paidRow}>
//             <input
//               inputMode="decimal"
//               placeholder="0.00"
//               value={paidText}
//               onChange={(event) => setPaidText(event.target.value)}
//               aria-label="Amount paid now"
//             />
//             <button type="button" className={styles.linkButton} disabled={preview.total <= 0} onClick={() => setPaidText(toInputText(preview.total))}>
//               Pay in full
//             </button>
//           </div>
//           <select
//             className={styles.wideSelect}
//             value={method}
//             onChange={(event) => setMethod(event.target.value as PaymentMethod)}
//             aria-label="Payment method"
//             disabled={paid === 0}
//           >
//             {PAYMENT_METHODS.map((item) => (
//               <option key={item.value} value={item.value}>
//                 {item.label}
//               </option>
//             ))}
//           </select>
//           <p className={due > 0 ? `${styles.dueLine} ${styles.dueText}` : styles.dueLine}>
//             <span>Left to pay the supplier</span>
//             <span className={styles.mono}>{formatMoney(Math.max(due, 0))}</span>
//           </p>

//           <div className={styles.formRow}>
//             <label className={styles.label} htmlFor={`${ids}-note`}>
//               Note
//             </label>
//             <input
//               id={`${ids}-note`}
//               type="text"
//               placeholder="optional, e.g. delivery challan no."
//               maxLength={255}
//               value={note}
//               onChange={(event) => setNote(event.target.value)}
//             />
//           </div>

//           {saveError && (
//             <p className={styles.summaryError} role="alert">
//               {saveError}
//             </p>
//           )}
//           <p className={styles.nextStep} role="status">
//             {nextStep ?? 'Everything is filled in. Confirming adds the stock.'}
//           </p>
//           <button type="button" className={styles.confirmButton} disabled={nextStep !== null || isSaving} onClick={handleConfirm}>
//             {isSaving ? 'Saving…' : 'Confirm purchase'}
//           </button>
//         </aside>
//       </div>
//     </>
//   )
// }

// function lineProblem(line: LineDraft, parsed: ParsedLine, today: string): string | null {
//   if (parsed.quantity === null) return 'Enter a whole number of units.'
//   if (parsed.price === null || parsed.price <= 0) return 'Enter a price above zero.'
//   if (parsed.discount === null) return 'The discount must be from 0 to 100%.'
//   if (line.product.expiry_tracking) {
//     if (line.batchNumber.trim() === '' || line.expiryDate === '') return 'This product expires: enter the batch number and expiry date.'
//     if (line.expiryDate < today) return 'The expiry date is in the past.'
//   }
//   return null
// }














import { Fragment, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { Link, useNavigate } from 'react-router'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { ApiError } from '../../services/api.ts'
import { getTaxRates } from '../../services/catalog.service.ts'
import { getProducts } from '../../services/product.service.ts'
import { createPurchase, getSuppliers } from '../../services/purchasing.service.ts'
import { getStoreSettings } from '../../services/store-settings.service.ts'
import type { TaxRate } from '../../types/catalog.ts'
import type { Product } from '../../types/product.ts'
import type { NewPurchaseLine, PaymentMethod, Supplier } from '../../types/purchasing.ts'
import {
  calculatePurchase,
  formatMoney,
  PAYMENT_METHODS,
  parseAmount,
  parsePercent,
  parseQuantity,
  toHundredths,
  toInputText,
  todayText,
} from './purchasingUtils.ts'
import styles from './purchasing.module.css'

/** One product on the purchase. Everything is text until it is checked, so half-typed numbers are fine. */
type LineDraft = {
  key: number
  product: Product
  quantity: string
  unitPrice: string
  discount: string
  batchNumber: string
  expiryDate: string
}

type ParsedLine = { quantity: number | null; price: number | null; discount: number | null }

const MAX_RESULTS = 6

/**
 * New purchase page (PRD 5.6): pick the supplier, add what was delivered, check the totals, say what was paid.
 * Confirming saves the purchase AND adds the stock, in one step on the server.
 */
export default function NewPurchasePage() {
  const ids = useId()
  const navigate = useNavigate()
  const nextKey = useRef(1)

  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [taxRates, setTaxRates] = useState<TaxRate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  const [supplierId, setSupplierId] = useState('')
  const [lines, setLines] = useState<LineDraft[]>([])
  const [search, setSearch] = useState('')
  const [searchMessage, setSearchMessage] = useState<string | null>(null)
  const [taxRateId, setTaxRateId] = useState('')
  const [discountText, setDiscountText] = useState('')
  const [shippingText, setShippingText] = useState('')
  const [paidText, setPaidText] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [note, setNote] = useState('')
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [today] = useState(todayText)

  useEffect(() => {
    let isCurrent = true
    Promise.all([getSuppliers('active'), getProducts(), getTaxRates(), getStoreSettings().catch(() => null)])
      .then(([supplierRows, productRows, rateRows, settings]) => {
        if (!isCurrent) return
        const activeRates = rateRows.filter((rate) => rate.status === 'active')
        setSuppliers(supplierRows)
        setProducts(productRows.filter((product) => product.status === 'active'))
        setTaxRates(activeRates)
        // Start from the store's default VAT rate, when one is set in Settings
        const defaultRateId = settings?.default_tax_rate_id
        if (defaultRateId != null && activeRates.some((rate) => rate.tax_rate_id === defaultRateId)) {
          setTaxRateId(String(defaultRateId))
        }
      })
      .catch((err) => {
        if (isCurrent) setLoadError(err instanceof ApiError ? err.message : 'Could not open the new purchase page.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  // ---- what the manager typed, checked ----
  const supplier = suppliers.find((row) => String(row.supplier_id) === supplierId)
  const parsed: ParsedLine[] = lines.map((line) => ({
    quantity: parseQuantity(line.quantity),
    price: parseAmount(line.unitPrice),
    discount: parsePercent(line.discount),
  }))
  const lineProblems = lines.map((line, index) => lineProblem(line, parsed[index], today))
  const discount = parseAmount(discountText)
  const shipping = parseAmount(shippingText)
  const paid = parseAmount(paidText)
  const taxRate = taxRates.find((rate) => String(rate.tax_rate_id) === taxRateId)
  const taxHundredths = taxRate ? Math.round(Number(taxRate.rate_percent) * 100) : 0

  const preview = calculatePurchase(
    parsed.map((line) => ({ unitPrice: line.price ?? 0, quantity: line.quantity ?? 0, discountHundredths: line.discount ?? 0 })),
    discount ?? 0,
    taxHundredths,
    shipping ?? 0,
  )

  // The first thing still missing. The Confirm button stays off until nothing is missing.
  let nextStep: string | null = null
  if (supplierId === '') nextStep = 'Choose the supplier.'
  else if (lines.length === 0) nextStep = 'Add the products that were delivered.'
  else if (lineProblems.some((problem) => problem !== null)) nextStep = 'Fix the line marked in red.'
  else if (discount === null) nextStep = 'Enter the discount like 50 or 50.50.'
  else if (shipping === null) nextStep = 'Enter the shipping charge like 50 or 50.50.'
  else if (discount > preview.subtotal) nextStep = "The discount can't be more than the subtotal."
  else if (paid === null) nextStep = 'Enter the amount paid like 250 or 250.50.'
  else if (paid > preview.total) nextStep = `The amount paid can't be more than ${formatMoney(preview.total)}.`

  const term = search.trim().toLowerCase()
  const matches =
    term === ''
      ? []
      : products
          .filter(
            (product) =>
              product.name.toLowerCase().includes(term) ||
              product.product_code.toLowerCase().includes(term) ||
              (product.barcode ?? '').includes(term),
          )
          .slice(0, MAX_RESULTS)

  // ---- actions ----
  function addProduct(product: Product) {
    setSearch('')
    setSearchMessage(null)
    const key = nextKey.current++
    setLines((current) => {
      // The same product twice is one line with a bigger quantity - except products with expiry, where each batch is its own line
      const existing = product.expiry_tracking ? undefined : current.find((line) => line.product.product_id === product.product_id)
      if (existing) {
        return current.map((line) => (line === existing ? { ...line, quantity: String((parseQuantity(line.quantity) ?? 0) + 1) } : line))
      }
      return [
        ...current,
        {
          key,
          product,
          quantity: '1',
          unitPrice: toInputText(toHundredths(String(product.purchase_price))),
          discount: '0',
          batchNumber: '',
          expiryDate: '',
        },
      ]
    })
  }

  function updateLine(key: number, change: Partial<LineDraft>) {
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...change } : line)))
  }

  function removeLine(key: number) {
    setLines((current) => current.filter((line) => line.key !== key))
  }

  /** Enter adds the product: an exact barcode or SKU first, otherwise the first match. Never submits the purchase. */
  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== 'Enter') return
    event.preventDefault()
    const code = search.trim()
    if (code === '') return
    const exact = products.find((product) => product.barcode === code || product.product_code.toLowerCase() === code.toLowerCase())
    const chosen = exact ?? matches[0]
    if (chosen) addProduct(chosen)
    else setSearchMessage(`No active product matches "${code}".`)
  }

  async function handleConfirm() {
    if (nextStep !== null || isSaving || discount === null || shipping === null || paid === null) return

    const items: NewPurchaseLine[] = []
    for (const [index, line] of lines.entries()) {
      const { quantity, price, discount: lineDiscount } = parsed[index]
      if (quantity === null || price === null || lineDiscount === null) return
      items.push({
        product_id: line.product.product_id,
        quantity,
        unit_price: toInputText(price),
        line_discount_percent: toInputText(lineDiscount),
        batch_number: line.product.expiry_tracking ? line.batchNumber.trim() : null,
        expiry_date: line.product.expiry_tracking ? line.expiryDate : null,
      })
    }

    setIsSaving(true)
    setSaveError(null)
    try {
      const saved = await createPurchase({
        supplier_id: Number(supplierId),
        items,
        discount_amount: toInputText(discount),
        tax_rate_id: taxRate ? taxRate.tax_rate_id : null,
        shipping_charge: toInputText(shipping),
        paid_amount: toInputText(paid),
        payment_method: paid > 0 ? method : null,
        note: note.trim() === '' ? null : note.trim(),
      })
      navigate('/purchasing/purchases', { state: { notice: `Purchase ${saved.purchase_number} confirmed. Stock was increased.` } })
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save the purchase.')
      setIsSaving(false)
    }
  }

  if (isLoading) return <MessagePanel title="Opening the new purchase…" />
  if (loadError) return <MessagePanel title="Could not open the new purchase page">{loadError}</MessagePanel>
  if (suppliers.length === 0) {
    return (
      <MessagePanel title="Add a supplier first">
        <p>A purchase needs an active supplier.</p>
        <p>
          <Link to="/purchasing/suppliers">Go to Suppliers</Link>
        </p>
      </MessagePanel>
    )
  }

  const supplierDue = supplier ? toHundredths(supplier.outstanding_due) : 0
  const due = preview.total - (paid ?? 0)

  return (
    <>
      <Link to="/purchasing/purchases" className={styles.backLink}>
        Back to purchases
      </Link>

      <div className={styles.purchaseLayout}>
        <div className={styles.purchaseMain}>
          <section className={styles.card} aria-labelledby={`${ids}-supplier-title`}>
            <h2 className={styles.cardTitle} id={`${ids}-supplier-title`}>
              Supplier
            </h2>
            <select
              className={styles.wideSelect}
              value={supplierId}
              onChange={(event) => setSupplierId(event.target.value)}
              aria-label="Supplier"
            >
              <option value="">Choose the supplier…</option>
              {suppliers.map((row) => (
                <option key={row.supplier_id} value={row.supplier_id}>
                  {row.name}
                </option>
              ))}
            </select>
            {supplier && (
              <p className={styles.cardSub}>
                {supplier.phone}
                {supplierDue > 0 ? ` · we already owe this supplier ${formatMoney(supplierDue)}` : ' · nothing owed to this supplier yet'}
              </p>
            )}
          </section>

          <section className={styles.card} aria-labelledby={`${ids}-items-title`}>
            <h2 className={styles.cardTitle} id={`${ids}-items-title`}>
              Products delivered
            </h2>

            {products.length === 0 ? (
              <p className={styles.cardSub}>There are no active products. Add products first, then come back.</p>
            ) : (
              <div className={styles.picker}>
                <input
                  className={styles.pickerInput}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setSearchMessage(null)
                  }}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Scan a barcode or search by name or SKU, then press Enter"
                  aria-label="Find a product"
                  autoComplete="off"
                />
                {matches.length > 0 && (
                  <ul className={styles.results}>
                    {matches.map((product) => (
                      <li key={product.product_id}>
                        <button type="button" className={styles.result} onClick={() => addProduct(product)}>
                          <span>
                            {product.name}
                            {product.expiry_tracking && <span className={styles.expiryTag}>expires</span>}
                          </span>
                          <span className={styles.resultMeta}>
                            {product.product_code} · cost {formatMoney(toHundredths(String(product.purchase_price)))}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {term !== '' && matches.length === 0 && <p className={styles.hint}>No active product matches.</p>}
                {searchMessage && (
                  <p className={styles.fieldError} role="alert">
                    {searchMessage}
                  </p>
                )}
              </div>
            )}

            {lines.length === 0 ? (
              <p className={styles.emptyLines}>Nothing added yet. Search above to add the first product.</p>
            ) : (
              <div className={styles.linesWrap}>
                <table className={styles.linesTable}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit price</th>
                      <th>Discount %</th>
                      <th className={styles.right}>Line total</th>
                      <th>
                        <span className={styles.visuallyHidden}>Remove</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, index) => {
                      const problem = lineProblems[index]
                      const name = line.product.name
                      return (
                        <Fragment key={line.key}>
                          <tr>
                            <td>
                              <p className={styles.nameMain}>{name}</p>
                              <p className={styles.nameSub}>{line.product.product_code}</p>
                            </td>
                            <td>
                              <input
                                className={styles.lineInput}
                                inputMode="numeric"
                                value={line.quantity}
                                onChange={(event) => updateLine(line.key, { quantity: event.target.value })}
                                aria-label={`Quantity of ${name}`}
                              />
                            </td>
                            <td>
                              <input
                                className={styles.lineInput}
                                inputMode="decimal"
                                value={line.unitPrice}
                                onChange={(event) => updateLine(line.key, { unitPrice: event.target.value })}
                                aria-label={`Unit price of ${name}`}
                              />
                            </td>
                            <td>
                              <input
                                className={styles.lineInput}
                                inputMode="decimal"
                                value={line.discount}
                                onChange={(event) => updateLine(line.key, { discount: event.target.value })}
                                aria-label={`Discount percent of ${name}`}
                              />
                            </td>
                            <td className={`${styles.mono} ${styles.right}`}>{problem ? '—' : formatMoney(preview.lines[index])}</td>
                            <td>
                              <button type="button" className={styles.removeButton} onClick={() => removeLine(line.key)} aria-label={`Remove ${name}`}>
                                ×
                              </button>
                            </td>
                          </tr>
                          {line.product.expiry_tracking && (
                            <tr className={styles.batchRow}>
                              <td colSpan={6}>
                                <div className={styles.batchFields}>
                                  <label>
                                    Batch number
                                    <input
                                      className={styles.lineInput}
                                      value={line.batchNumber}
                                      maxLength={50}
                                      onChange={(event) => updateLine(line.key, { batchNumber: event.target.value })}
                                    />
                                  </label>
                                  <label>
                                    Expiry date
                                    <input
                                      className={styles.lineInput}
                                      type="date"
                                      min={today}
                                      value={line.expiryDate}
                                      onChange={(event) => updateLine(line.key, { expiryDate: event.target.value })}
                                    />
                                  </label>
                                </div>
                              </td>
                            </tr>
                          )}
                          {problem && (
                            <tr>
                              <td colSpan={6} className={styles.lineHint} role="alert">
                                {name}: {problem}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        <aside className={styles.summaryCard} aria-label="Purchase summary">
          <h2 className={styles.cardTitle}>Summary</h2>

          <div className={styles.twoColumns}>
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor={`${ids}-discount`}>
                Discount (Tk)
              </label>
              <input
                id={`${ids}-discount`}
                inputMode="decimal"
                placeholder="0.00"
                value={discountText}
                onChange={(event) => setDiscountText(event.target.value)}
              />
            </div>
            <div className={styles.formRow}>
              <label className={styles.label} htmlFor={`${ids}-shipping`}>
                Shipping (Tk)
              </label>
              <input
                id={`${ids}-shipping`}
                inputMode="decimal"
                placeholder="0.00"
                value={shippingText}
                onChange={(event) => setShippingText(event.target.value)}
              />
            </div>
          </div>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor={`${ids}-vat`}>
              VAT rate
            </label>
            <select id={`${ids}-vat`} value={taxRateId} onChange={(event) => setTaxRateId(event.target.value)}>
              <option value="">No VAT</option>
              {taxRates.map((rate) => (
                <option key={rate.tax_rate_id} value={rate.tax_rate_id}>
                  {rate.name} ({Number(rate.rate_percent)}%)
                </option>
              ))}
            </select>
          </div>

          <dl className={styles.totalsBox}>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatMoney(preview.subtotal)}</dd>
            </div>
            {preview.discount > 0 && (
              <div className={styles.totalRow}>
                <dt>Discount</dt>
                <dd>− {formatMoney(preview.discount)}</dd>
              </div>
            )}
            {taxHundredths > 0 && (
              <div className={styles.totalRow}>
                <dt>VAT ({taxHundredths / 100}%)</dt>
                <dd>{formatMoney(preview.tax)}</dd>
              </div>
            )}
            {preview.shipping > 0 && (
              <div className={styles.totalRow}>
                <dt>Shipping</dt>
                <dd>{formatMoney(preview.shipping)}</dd>
              </div>
            )}
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <dt>Total</dt>
              <dd>{formatMoney(preview.total)}</dd>
            </div>
          </dl>

          <h3 className={styles.subTitle}>Paid now</h3>
          <div className={styles.paidRow}>
            <input
              inputMode="decimal"
              placeholder="0.00"
              value={paidText}
              onChange={(event) => setPaidText(event.target.value)}
              aria-label="Amount paid now"
            />
            <button type="button" className={styles.linkButton} disabled={preview.total <= 0} onClick={() => setPaidText(toInputText(preview.total))}>
              Pay in full
            </button>
          </div>
          <select
            className={styles.wideSelect}
            value={method}
            onChange={(event) => setMethod(event.target.value as PaymentMethod)}
            aria-label="Payment method"
            disabled={paid === 0}
          >
            {PAYMENT_METHODS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p className={due > 0 ? `${styles.dueLine} ${styles.dueText}` : styles.dueLine}>
            <span>Left to pay the supplier</span>
            <span className={styles.mono}>{formatMoney(Math.max(due, 0))}</span>
          </p>

          <div className={styles.formRow}>
            <label className={styles.label} htmlFor={`${ids}-note`}>
              Note
            </label>
            <input
              id={`${ids}-note`}
              type="text"
              placeholder="optional, e.g. delivery challan no."
              maxLength={255}
              value={note}
              onChange={(event) => setNote(event.target.value)}
            />
          </div>

          {saveError && (
            <p className={styles.summaryError} role="alert">
              {saveError}
            </p>
          )}
          <p className={styles.nextStep} role="status">
            {nextStep ?? 'Everything is filled in. Confirming adds the stock.'}
          </p>
          <button type="button" className={styles.confirmButton} disabled={nextStep !== null || isSaving} onClick={handleConfirm}>
            {isSaving ? 'Saving…' : 'Confirm purchase'}
          </button>
        </aside>
      </div>
    </>
  )
}

function lineProblem(line: LineDraft, parsed: ParsedLine, today: string): string | null {
  if (parsed.quantity === null) return 'Enter a whole number of units.'
  if (parsed.price === null || parsed.price <= 0) return 'Enter a price above zero.'
  if (parsed.discount === null) return 'The discount must be from 0 to 100%.'
  if (line.product.expiry_tracking) {
    if (line.batchNumber.trim() === '' || line.expiryDate === '') return 'This product expires: enter the batch number and expiry date.'
    if (line.expiryDate < today) return 'The expiry date is in the past.'
  }
  return null
}
