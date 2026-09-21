import { useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import CustomerPanel from './CustomerPanel.tsx'
import type { SelectedCustomer } from './CustomerPanel.tsx'
import HeldBills from './HeldBills.tsx'
import PaymentPanel from './PaymentPanel.tsx'
import Receipt from './Receipt.tsx'
import { ApiError } from '../../services/api.ts'
import { listCustomers } from '../../services/customers.ts'
import { createSale, getLoyaltyStatus, holdCart, resumeHeldCart, updateHeldCart } from '../../services/pos.service.ts'
import type { HeldCartSave, Sale } from '../../services/pos.service.ts'
import { buildPayments, calculateCart, formatMoney, parseAmount, settlePayment, toHundredths, toInputText } from './posMath.ts'
import type { Paisa, PaymentMethod, PaymentTexts } from './posMath.ts'
import type { PosProduct } from './posProducts.ts'
import { usePosProducts } from './usePosProducts.ts'
import styles from './PosPage.module.css'

type CartLine = { productId: number; quantity: number }
type Notice = { kind: 'ok' | 'error'; text: string }
type CompletedSale = { sale: Sale; change: Paisa }
/** A sale error belongs to the cart and payment it happened with; it disappears as soon as either changes. */
type SaleError = { text: string; signature: string }

const NO_PAYMENT: PaymentTexts = { cash: '', card: '', digital: '' }

function saleErrorText(error: unknown): string {
  if (!(error instanceof ApiError)) return 'Could not complete the sale.'
  // Status 0 (no answer) or 5xx: we don't know whether the server saved the sale before it failed.
  const unsure = error.status === 0 || error.status >= 500
  return unsure ? `${error.message} The sale may have been saved: ask a manager to check the Activity Logs before trying again.` : error.message
}

export default function PosPage() {
  const { products, status: productStatus, reload: reloadProducts, retry: retryProducts } = usePosProducts()
  const categories = useMemo(() => ['All', ...[...new Set(products.map((product) => product.category))].sort()], [products])
  const productById = useMemo(() => new Map(products.map((product) => [product.productId, product])), [products])
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [scanText, setScanText] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [selected, setSelected] = useState<SelectedCustomer | null>(null)
  const [payTexts, setPayTexts] = useState<PaymentTexts>(NO_PAYMENT)
  const [completed, setCompleted] = useState<CompletedSale | null>(null)
  const [busy, setBusy] = useState<'sale' | 'hold' | null>(null)
  const [heldCartId, setHeldCartId] = useState<number | null>(null) // the held bill loaded on screen, if any
  const [holdNote, setHoldNote] = useState('')
  const [heldRefresh, setHeldRefresh] = useState(0)
  const [saleError, setSaleError] = useState<SaleError | null>(null)
  const busyRef = useRef(false) // blocks a double click before the state has updated
  const scanRef = useRef<HTMLInputElement>(null)

  const term = search.trim().toLowerCase()
  const activeCategory = categories.includes(category) ? category : 'All' // the chosen category may vanish after a reload
  const visibleProducts = products.filter(
    (product) =>
      (activeCategory === 'All' || product.category === activeCategory) &&
      (term === '' ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode.includes(term)),
  )

  const rows = cart.flatMap((line) => {
    const product = productById.get(line.productId)
    return product ? [{ line, product }] : []
  })
  const totals = calculateCart(
    rows.map(({ line, product }) => ({
      unitPrice: toHundredths(product.unitPrice),
      quantity: line.quantity,
      vatHundredths: toHundredths(product.vatPercent),
    })),
    selected?.discountHundredths ?? 0,
  )
  const itemCount = cart.reduce((count, line) => count + line.quantity, 0)

  // Payment: the boxes hold text; the amounts are only used when every box is a valid amount.
  const cash = parseAmount(payTexts.cash)
  const card = parseAmount(payTexts.card)
  const digital = parseAmount(payTexts.digital)
  const invalid = { cash: cash === null, card: card === null, digital: digital === null }
  const settlement =
    cash === null || card === null || digital === null
      ? null
      : settlePayment(
          totals.total,
          { cash, card, digital },
          selected !== null,
          selected ? toHundredths(selected.customer.available_credit) : 0,
        )
  const ready = rows.length > 0 && settlement !== null && settlement.error === null
  const signature = JSON.stringify([selected?.customer.customer_id ?? null, cart, payTexts])
  const visibleError = saleError !== null && saleError.signature === signature ? saleError.text : null
  // Resuming a bill replaces the screen, so it is only allowed while the screen is empty.
  const canResume = cart.length === 0 && heldCartId === null

  /** Adds one unit. Returns a message when it can't be added, otherwise null. */
  function addToCart(product: PosProduct): string | null {
    if (product.stock <= 0) return `${product.name} is out of stock.`
    const inCart = cart.find((line) => line.productId === product.productId)?.quantity ?? 0
    if (inCart + 1 > product.stock) return `Only ${product.stock} of ${product.name} in stock.`
    setCart((lines) =>
      inCart === 0
        ? [...lines, { productId: product.productId, quantity: 1 }]
        : lines.map((line) => (line.productId === product.productId ? { ...line, quantity: line.quantity + 1 } : line)),
    )
    return null
  }

  function handleCardClick(product: PosProduct) {
    const problem = addToCart(product)
    setNotice(problem ? { kind: 'error', text: problem } : null)
  }

  function handleScan(event: FormEvent) {
    event.preventDefault()
    const code = scanText.trim()
    if (code === '') return
    const product = products.find((item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase())
    if (!product) {
      setNotice({ kind: 'error', text: `No product found for "${code}".` })
    } else {
      const problem = addToCart(product)
      setNotice(problem ? { kind: 'error', text: problem } : { kind: 'ok', text: `Added ${product.name}.` })
    }
    setScanText('')
    scanRef.current?.focus() // ready for the next scan
  }

  function changeQuantity(product: PosProduct, change: number) {
    setNotice(null)
    setCart((lines) =>
      lines.flatMap((line) => {
        if (line.productId !== product.productId) return [line]
        const next = line.quantity + change
        if (next <= 0) return []
        return [{ ...line, quantity: Math.min(next, product.stock) }]
      }),
    )
  }

  function removeLine(product: PosProduct) {
    setNotice(null)
    setCart((lines) => lines.filter((line) => line.productId !== product.productId))
  }

  function clearSale() {
    setNotice(null)
    setCart([])
    setSelected(null)
    setPayTexts(NO_PAYMENT)
    setHeldCartId(null)
    setHoldNote('')
  }

  async function completeSale() {
    if (!ready || settlement === null || busyRef.current) return
    busyRef.current = true
    setBusy('sale')
    try {
      const sale = await createSale({
        customer_id: selected?.customer.customer_id ?? null,
        items: rows.map(({ line, product }) => ({ product_id: product.productId, quantity: line.quantity })),
        payments: buildPayments(settlement.applied),
        held_cart_id: heldCartId ?? undefined, // the server completes the held bill in the same transaction
      })
      setHeldRefresh((key) => key + 1)
      reloadProducts()
      setCompleted({ sale, change: settlement.change })
    } catch (error) {
      setSaleError({ text: saleErrorText(error), signature })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  /** Puts the bill on hold (or saves changes to the held bill it came from) and clears the screen for the next customer. */
  async function holdBill() {
    if (rows.length === 0 || busyRef.current) return
    busyRef.current = true
    setBusy('hold')
    try {
      const data: HeldCartSave = {
        customer_id: selected?.customer.customer_id ?? null,
        note: holdNote.trim() === '' ? null : holdNote.trim(),
        items: rows.map(({ line, product }) => ({ product_id: product.productId, quantity: line.quantity })),
      }
      if (heldCartId === null) await holdCart(data)
      else await updateHeldCart(heldCartId, data)
      clearSale()
      setHeldRefresh((key) => key + 1)
      setNotice({ kind: 'ok', text: 'Bill held. Resume it from Held bills.' })
    } catch (error) {
      setSaleError({ text: error instanceof ApiError ? error.message : 'Could not hold the bill.', signature })
    } finally {
      busyRef.current = false
      setBusy(null)
    }
  }

  /**
   * Loads a held bill into the screen. The server re-checked every line against today's products and stock;
   * lines that can't be sold as they were are reduced or removed, and the cashier is told which.
   * The bill stays on hold on the server until the sale is completed.
   */
  async function resumeBill(id: number) {
    const resumed = await resumeHeldCart(id) // throws when it fails: the Held bills list shows the message
    const changes: string[] = []
    const lines: CartLine[] = []
    for (const item of resumed.items) {
      const product = productById.get(item.product_id)
      if (!product) {
        changes.push(`${item.product_name ?? `Product ${item.product_id}`} is not available on this screen.`)
        continue
      }
      const wanted = Number(item.quantity)
      const allowed = Math.min(wanted, item.available_quantity, product.stock)
      const reason = item.problem ? ` (${item.problem})` : ''
      if (allowed <= 0) changes.push(`${product.name} was removed${reason || ' (out of stock)'}.`)
      else {
        if (allowed < wanted) changes.push(`${product.name} was reduced from ${wanted} to ${allowed}${reason}.`)
        lines.push({ productId: product.productId, quantity: allowed })
      }
    }

    let customer: SelectedCustomer | null = null
    if (resumed.customer_id !== null) {
      try {
        const found = (await listCustomers()).find((row) => row.customer_id === resumed.customer_id && row.status === 'active')
        if (found) {
          const loyalty = await getLoyaltyStatus(found.customer_id)
          customer = { customer: found, tierName: loyalty.tier_name, discountHundredths: Math.round(Number(loyalty.discount_percent) * 100) }
        } else changes.push('The customer is no longer available, so the bill is a guest sale now.')
      } catch {
        changes.push('The customer could not be loaded, so the bill is a guest sale now.')
      }
    }

    setCart(lines)
    setSelected(customer)
    setPayTexts(NO_PAYMENT)
    setHeldCartId(resumed.held_cart_id)
    setHoldNote(resumed.note ?? '')
    setNotice(changes.length > 0 ? { kind: 'error', text: `Bill resumed with changes: ${changes.join(' ')}` } : { kind: 'ok', text: 'Bill resumed.' })
  }

  function newSale() {
    clearSale()
    setCompleted(null)
  }

  function payFull(method: PaymentMethod) {
    setPayTexts({ ...NO_PAYMENT, [method]: toInputText(totals.total) })
  }

  return (
    <>
      <div className={styles.layout}>
        <section className={styles.catalog} aria-label="Products">
          <HeldBills refreshKey={heldRefresh} canResume={canResume} onResume={resumeBill} />
          <div className={styles.searchRow}>
            <form onSubmit={handleScan}>
              <input
                ref={scanRef}
                className={styles.input}
                value={scanText}
                onChange={(event) => setScanText(event.target.value)}
                placeholder="Scan barcode or type SKU, then Enter"
                aria-label="Scan barcode or SKU"
              />
            </form>
            <input
              className={styles.input}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name, SKU or barcode"
              aria-label="Search products"
            />
          </div>
          <p className={`${styles.notice} ${notice?.kind === 'error' ? styles.noticeError : styles.noticeOk}`} role="status">
            {notice?.text}
          </p>

          <div className={styles.chips}>
            {categories.map((name) => (
              <button
                key={name}
                type="button"
                className={name === activeCategory ? `${styles.chip} ${styles.chipActive}` : styles.chip}
                onClick={() => setCategory(name)}
              >
                {name}
              </button>
            ))}
          </div>

          {productStatus === 'loading' ? (
            <p className={styles.empty}>Loading products…</p>
          ) : productStatus === 'error' ? (
            <p className={`${styles.empty} ${styles.noticeError}`} role="alert">
              Could not load the products.{' '}
              <button type="button" className={styles.linkButton} onClick={retryProducts}>
                Try again
              </button>
            </p>
          ) : products.length === 0 ? (
            <p className={styles.empty}>There are no active products yet. Add them on the Products page.</p>
          ) : visibleProducts.length === 0 ? (
            <p className={styles.empty}>No products match your search.</p>
          ) : (
            <div className={styles.grid}>
              {visibleProducts.map((product) => (
                <button
                  key={product.productId}
                  type="button"
                  className={styles.card}
                  disabled={product.stock <= 0}
                  onClick={() => handleCardClick(product)}
                >
                  {product.stock <= 0 ? (
                    <span className={`${styles.badge} ${styles.badgeOut}`}>Out</span>
                  ) : product.stock <= product.reorderLevel ? (
                    <span className={`${styles.badge} ${styles.badgeLow}`}>Low</span>
                  ) : null}
                  <span className={styles.category}>{product.category}</span>
                  <span className={styles.name}>{product.name}</span>
                  <span className={styles.price}>{formatMoney(toHundredths(product.unitPrice))}</span>
                  <span className={styles.stock}>{product.stock} in stock</span>
                </button>
              ))}
            </div>
          )}
        </section>

        <aside className={styles.cart} aria-label="Cart">
          <div className={styles.cartHeader}>
            <h2 className={styles.cartTitle}>Current sale{itemCount > 0 && ` · ${itemCount} item${itemCount === 1 ? '' : 's'}`}</h2>
            {(cart.length > 0 || selected !== null || heldCartId !== null) && (
              <button type="button" className={styles.linkButton} onClick={clearSale}>
                Clear
              </button>
            )}
          </div>

          <CustomerPanel selected={selected} onSelect={setSelected} />

          {rows.length === 0 ? (
            <p className={styles.cartEmpty}>The cart is empty. Scan a barcode or click a product.</p>
          ) : (
            <ul className={styles.lines}>
              {rows.map(({ line, product }, index) => (
                <li key={product.productId} className={styles.cartLine}>
                  <div className={styles.lineInfo}>
                    <p className={styles.lineName}>{product.name}</p>
                    <p className={styles.linePrice}>{formatMoney(toHundredths(product.unitPrice))} each</p>
                  </div>
                  <div className={styles.qty}>
                    <button type="button" className={styles.qtyButton} aria-label={`Fewer ${product.name}`} onClick={() => changeQuantity(product, -1)}>
                      −
                    </button>
                    <span className={styles.qtyValue}>{line.quantity}</span>
                    <button
                      type="button"
                      className={styles.qtyButton}
                      aria-label={`More ${product.name}`}
                      disabled={line.quantity >= product.stock}
                      onClick={() => changeQuantity(product, 1)}
                    >
                      +
                    </button>
                  </div>
                  <span className={styles.lineTotal}>{formatMoney(totals.lines[index].subtotal)}</span>
                  <button type="button" className={styles.removeButton} aria-label={`Remove ${product.name}`} onClick={() => removeLine(product)}>
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <dl className={styles.totals}>
            <div className={styles.totalRow}>
              <dt>Subtotal</dt>
              <dd>{formatMoney(totals.subtotal)}</dd>
            </div>
            {totals.discount > 0 && (
              <div className={styles.totalRow}>
                <dt>Loyalty discount</dt>
                <dd>− {formatMoney(totals.discount)}</dd>
              </div>
            )}
            <div className={styles.totalRow}>
              <dt>VAT</dt>
              <dd>{formatMoney(totals.tax)}</dd>
            </div>
            <div className={`${styles.totalRow} ${styles.grandTotal}`}>
              <dt>Total</dt>
              <dd>{formatMoney(totals.total)}</dd>
            </div>
          </dl>

          <PaymentPanel
            total={totals.total}
            texts={payTexts}
            invalid={invalid}
            settlement={settlement}
            onChange={(method, text) => setPayTexts((texts) => ({ ...texts, [method]: text }))}
            onPayFull={payFull}
          />

          <div className={styles.actions}>
            {visibleError && (
              <p className={styles.saleError} role="alert">
                {visibleError}
              </p>
            )}
            {rows.length > 0 && (
              <input
                className={styles.noteInput}
                value={holdNote}
                maxLength={100}
                onChange={(event) => setHoldNote(event.target.value)}
                placeholder="Note for a held bill (optional)"
                aria-label="Note for held bill"
              />
            )}
            <div className={styles.buttonRow}>
              <button type="button" className={styles.secondaryButton} disabled={rows.length === 0 || busy !== null} onClick={holdBill}>
                {busy === 'hold' ? 'Holding…' : heldCartId !== null ? 'Hold again' : 'Hold'}
              </button>
              <button type="button" className={styles.primaryButton} disabled={!ready || busy !== null} onClick={completeSale}>
                {busy === 'sale' ? 'Saving…' : 'Complete sale'}
              </button>
            </div>
          </div>
        </aside>
      </div>
      {completed && (
        <Receipt sale={completed.sale} change={completed.change} onNewSale={newSale} />
      )}
    </>
  )
}
