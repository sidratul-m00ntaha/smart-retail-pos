import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import CustomerPanel from './CustomerPanel.tsx'
import type { SelectedCustomer } from './CustomerPanel.tsx'
import PaymentPanel from './PaymentPanel.tsx'
import { calculateCart, formatMoney, parseAmount, settlePayment, toHundredths, toInputText } from './posMath.ts'
import type { PaymentMethod, PaymentTexts } from './posMath.ts'
import { SAMPLE_PRODUCTS } from './sampleProducts.ts'
import type { PosProduct } from './sampleProducts.ts'
import styles from './PosPage.module.css'

type CartLine = { productId: number; quantity: number }
type Notice = { kind: 'ok' | 'error'; text: string }

const LOW_STOCK_AT = 5
const CATEGORIES = ['All', ...new Set(SAMPLE_PRODUCTS.map((product) => product.category))]
const PRODUCT_BY_ID = new Map(SAMPLE_PRODUCTS.map((product) => [product.productId, product]))
const NO_PAYMENT: PaymentTexts = { cash: '', card: '', digital: '' }

export default function PosPage() {
  const [cart, setCart] = useState<CartLine[]>([])
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('All')
  const [scanText, setScanText] = useState('')
  const [notice, setNotice] = useState<Notice | null>(null)
  const [selected, setSelected] = useState<SelectedCustomer | null>(null)
  const [payTexts, setPayTexts] = useState<PaymentTexts>(NO_PAYMENT)
  const scanRef = useRef<HTMLInputElement>(null)

  const term = search.trim().toLowerCase()
  const visibleProducts = SAMPLE_PRODUCTS.filter(
    (product) =>
      (category === 'All' || product.category === category) &&
      (term === '' ||
        product.name.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        product.barcode.includes(term)),
  )

  const rows = cart.flatMap((line) => {
    const product = PRODUCT_BY_ID.get(line.productId)
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
    const product = SAMPLE_PRODUCTS.find((item) => item.barcode === code || item.sku.toLowerCase() === code.toLowerCase())
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
  }

  function payFull(method: PaymentMethod) {
    setPayTexts({ ...NO_PAYMENT, [method]: toInputText(totals.total) })
  }

  return (
    <div className={styles.layout}>
      <section className={styles.catalog} aria-label="Products">
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
          {CATEGORIES.map((name) => (
            <button
              key={name}
              type="button"
              className={name === category ? `${styles.chip} ${styles.chipActive}` : styles.chip}
              onClick={() => setCategory(name)}
            >
              {name}
            </button>
          ))}
        </div>

        {visibleProducts.length === 0 ? (
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
                ) : product.stock <= LOW_STOCK_AT ? (
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
          {(cart.length > 0 || selected !== null) && (
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
          <button
            type="button"
            className={styles.primaryButton}
            disabled
            title={ready ? 'Ready. Completing the sale is connected in the next step.' : 'Finish the cart and payment first'}
          >
            Complete sale
          </button>
        </div>
      </aside>
    </div>
  )
}
