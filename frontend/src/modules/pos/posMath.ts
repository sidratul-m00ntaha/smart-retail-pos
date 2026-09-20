/**
 * Money maths for the POS screen.
 *
 * Amounts are whole paisa (1 Tk = 100 paisa) and percentages are hundredths of a percent
 * (5.00% = 500), so there are no floating-point errors.
 *
 * This mirrors backend/app/services/sale_calculator.py: the loyalty discount comes first, then VAT
 * on the discounted amount, every line is rounded once (half up), and the payment rules are the same
 * (guests pay in full, a due can't pass the credit limit). It is only a PREVIEW for the cashier - the
 * server recalculates everything from its own prices and checks the same rules when the sale is completed.
 */

export type Paisa = number

export type CartLineInput = {
  unitPrice: Paisa
  quantity: number
  /** VAT in hundredths of a percent, e.g. 5.00% = 500 */
  vatHundredths: number
}

export type LineTotals = {
  subtotal: Paisa
  discount: Paisa
  tax: Paisa
  total: Paisa
}

export type CartTotals = LineTotals & { lines: LineTotals[] }

export type PaymentMethod = 'cash' | 'card' | 'digital'
export type PaymentAmounts = Record<PaymentMethod, Paisa>
/** What the cashier typed in each payment box */
export type PaymentTexts = Record<PaymentMethod, string>
export type PaymentStatus = 'PAID' | 'PARTIALLY_PAID' | 'DUE'

export type Settlement = {
  paid: Paisa
  due: Paisa
  /** Cash handed over beyond what was needed - give it back to the customer */
  change: Paisa
  status: PaymentStatus
  /** What will be sent to the server: the cash is reduced by the change */
  applied: PaymentAmounts
  /** null = the payment is allowed */
  error: string | null
}

/** Turns an API decimal string into hundredths: "90.00" -> 9000, "5.5" -> 550, "-50.25" -> -5025. */
export function toHundredths(value: string): number {
  const text = value.trim()
  const negative = text.startsWith('-')
  const [whole, fraction = ''] = (negative ? text.slice(1) : text).split('.')
  const hundredths = Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
  return negative ? -hundredths : hundredths
}

/** What the cashier typed in a payment box: "250" -> 25000, "250.5" -> 25050, "" -> 0, "abc" -> null. */
export function parseAmount(text: string): Paisa | null {
  const clean = text.trim()
  if (clean === '') return 0
  return /^\d+(\.\d{1,2})?$/.test(clean) ? toHundredths(clean) : null
}

/** 25050 -> "250.50", for filling an input box. */
export function toInputText(paisa: Paisa): string {
  return (paisa / 100).toFixed(2)
}

/** n / d rounded half up, for whole numbers (n >= 0, d > 0). */
function divideHalfUp(n: number, d: number): number {
  return Math.floor((2 * n + d) / (2 * d))
}

export function calculateLine(line: CartLineInput, discountHundredths: number): LineTotals {
  const subtotal = line.unitPrice * line.quantity
  const discount = divideHalfUp(subtotal * discountHundredths, 10000)
  const taxable = subtotal - discount
  const tax = divideHalfUp(taxable * line.vatHundredths, 10000)
  return { subtotal, discount, tax, total: taxable + tax }
}

/** Sale totals are the sums of the rounded lines, so the parts always add up to the total. */
export function calculateCart(lines: CartLineInput[], discountHundredths: number): CartTotals {
  const results = lines.map((line) => calculateLine(line, discountHundredths))
  const sum = (pick: (line: LineTotals) => number) => results.reduce((total, line) => total + pick(line), 0)
  return {
    lines: results,
    subtotal: sum((line) => line.subtotal),
    discount: sum((line) => line.discount),
    tax: sum((line) => line.tax),
    total: sum((line) => line.total),
  }
}

/**
 * Works out paid, due, change and status, and applies the server's payment rules
 * (backend settle_payment): a guest must pay in full, and a due can't pass the available credit.
 * Only cash can produce change; card and digital payments can't be more than the total.
 */
export function settlePayment(
  total: Paisa,
  entered: PaymentAmounts,
  isRegisteredCustomer: boolean,
  availableCredit: Paisa,
): Settlement {
  const nonCash = entered.card + entered.digital
  if (nonCash > total) {
    return {
      paid: total,
      due: 0,
      change: 0,
      status: 'PAID',
      applied: { cash: 0, card: entered.card, digital: entered.digital },
      error: 'Card and digital payments are more than the total.',
    }
  }
  const cash = Math.min(entered.cash, total - nonCash)
  const paid = nonCash + cash
  const due = total - paid

  let error: string | null = null
  if (due > 0) {
    if (!isRegisteredCustomer) error = 'Guest customers must pay the full amount.'
    else if (due > Math.max(availableCredit, 0)) error = 'Credit limit exceeded.'
  }
  const status: PaymentStatus = due === 0 ? 'PAID' : paid === 0 ? 'DUE' : 'PARTIALLY_PAID'
  return {
    paid,
    due,
    change: entered.cash - cash,
    status,
    applied: { cash, card: entered.card, digital: entered.digital },
    error,
  }
}

/**
 * The payments to send to the server: only methods with money in them, in a fixed order. Amounts are
 * exact decimal strings ("189.00"). Cash is already reduced by the change, so the total always matches.
 * A due is not sent: the server works it out as total - paid.
 */
export function buildPayments(applied: PaymentAmounts): { method: PaymentMethod; amount: string }[] {
  const methods: PaymentMethod[] = ['cash', 'card', 'digital']
  return methods.filter((method) => applied[method] > 0).map((method) => ({ method, amount: toInputText(applied[method]) }))
}

/** 123456 -> "Tk 1,234.56" and -5025 -> "-Tk 50.25" */
export function formatMoney(paisa: Paisa): string {
  const sign = paisa < 0 ? '-' : ''
  const amount = Math.abs(paisa)
  const whole = Math.floor(amount / 100)
  const fraction = String(amount % 100).padStart(2, '0')
  return `${sign}Tk ${whole.toLocaleString('en-US')}.${fraction}`
}
