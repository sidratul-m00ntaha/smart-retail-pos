/**
 * Money maths for the POS screen.
 *
 * Amounts are whole paisa (1 Tk = 100 paisa) and percentages are hundredths of a percent
 * (5.00% = 500), so there are no floating-point errors.
 *
 * This mirrors backend/app/services/sale_calculator.py: the loyalty discount comes first, then VAT
 * on the discounted amount, and every line is rounded once (half up). It is only a PREVIEW for the
 * cashier - the server recalculates everything from its own prices when the sale is completed.
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

/** Turns an API decimal string into hundredths: "90.00" -> 9000 and "5.00" -> 500. */
export function toHundredths(value: string): number {
  const [whole, fraction = ''] = value.trim().split('.')
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
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

/** 123456 -> "Tk 1,234.56" */
export function formatMoney(paisa: Paisa): string {
  const whole = Math.floor(paisa / 100)
  const fraction = String(paisa % 100).padStart(2, '0')
  return `Tk ${whole.toLocaleString('en-US')}.${fraction}`
}
