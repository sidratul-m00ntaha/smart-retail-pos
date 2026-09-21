// /**
//  * Money maths and labels for the purchasing pages.
//  *
//  * Amounts are whole paisa (1 Tk = 100 paisa) and percentages are hundredths of a percent (15.00% = 1500),
//  * so there are no floating-point errors. This mirrors backend/app/services/purchase_calculator.py:
//  *
//  *     line total = quantity x unit price x (1 - line discount %)      subtotal = sum of the lines
//  *     VAT        = subtotal x VAT %                                   total = subtotal - discount + VAT + shipping
//  *
//  * It is only a PREVIEW for the manager - the server recalculates everything when the purchase is confirmed.
//  */
// import type { PaymentMethod, PaymentStatus } from '../../types/purchasing.ts'

// export type Paisa = number

// export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
//   { value: 'cash', label: 'Cash' },
//   { value: 'bank', label: 'Bank / card' },
//   { value: 'digital', label: 'Digital' },
// ]

// export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
//   PAID: 'Paid',
//   PARTIALLY_PAID: 'Part paid',
//   DUE: 'Due',
// }

// export function methodLabel(method: string): string {
//   return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method
// }

// /** Turns an API decimal string into hundredths: "90.00" -> 9000, "5.5" -> 550. */
// export function toHundredths(value: string): number {
//   const text = value.trim()
//   const [whole, fraction = ''] = text.split('.')
//   return Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
// }

// /** What the manager typed in an amount box: "250" -> 25000, "250.5" -> 25050, "" -> 0, "abc" -> null. */
// export function parseAmount(text: string): Paisa | null {
//   const clean = text.trim()
//   if (clean === '') return 0
//   return /^\d{1,10}(\.\d{1,2})?$/.test(clean) ? toHundredths(clean) : null
// }

// /** A percentage box: "15" -> 1500, "2.5" -> 250, "" -> 0. Null when it isn't a number from 0 to 100. */
// export function parsePercent(text: string): number | null {
//   const clean = text.trim()
//   if (clean === '') return 0
//   if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return null
//   const hundredths = toHundredths(clean)
//   return hundredths <= 10000 ? hundredths : null
// }

// /** A quantity box: whole numbers from 1 (stock is counted in whole units). Null otherwise. */
// export function parseQuantity(text: string): number | null {
//   const clean = text.trim()
//   if (!/^\d{1,7}$/.test(clean)) return null
//   const quantity = Number(clean)
//   return quantity >= 1 ? quantity : null
// }

// /** 25050 -> "250.50", for filling an input box or sending to the API. */
// export function toInputText(paisa: Paisa): string {
//   return (paisa / 100).toFixed(2)
// }

// /** 123456 -> "Tk 1,234.56" and -5025 -> "-Tk 50.25" */
// export function formatMoney(paisa: Paisa): string {
//   const sign = paisa < 0 ? '-' : ''
//   const amount = Math.abs(paisa)
//   const whole = Math.floor(amount / 100)
//   const fraction = String(amount % 100).padStart(2, '0')
//   return `${sign}Tk ${whole.toLocaleString('en-US')}.${fraction}`
// }

// /** An API amount as money: "1102.50" -> "Tk 1,102.50" */
// export function moneyText(value: string): string {
//   return formatMoney(toHundredths(value))
// }

// /** "15.00" -> "15", "2.50" -> "2.5" */
// export function percentText(value: string): string {
//   return String(Number(value))
// }

// /** Today as "2026-09-21" in the user's local time, for the expiry date box */
// export function todayText(): string {
//   return new Date().toLocaleDateString('en-CA')
// }

// export type PreviewLine = {
//   unitPrice: Paisa
//   quantity: number
//   /** Hundredths of a percent */
//   discountHundredths: number
// }

// export type PurchasePreview = {
//   lines: Paisa[]
//   subtotal: Paisa
//   discount: Paisa
//   tax: Paisa
//   shipping: Paisa
//   total: Paisa
// }

// /** n / d rounded half up, for whole numbers (n >= 0, d > 0). BigInt keeps very large purchases exact. */
// function divideHalfUp(n: bigint, d: bigint): number {
//   return Number((2n * n + d) / (2n * d))
// }

// export function calculatePurchase(
//   lines: PreviewLine[],
//   discount: Paisa,
//   taxHundredths: number,
//   shipping: Paisa,
// ): PurchasePreview {
//   const lineTotals = lines.map((line) =>
//     divideHalfUp(BigInt(line.unitPrice) * BigInt(line.quantity) * BigInt(10000 - line.discountHundredths), 10000n),
//   )
//   const subtotal = lineTotals.reduce((sum, amount) => sum + amount, 0)
//   const tax = divideHalfUp(BigInt(subtotal) * BigInt(taxHundredths), 10000n)
//   return { lines: lineTotals, subtotal, discount, tax, shipping, total: subtotal - discount + tax + shipping }
// }














/**
 * Money maths and labels for the purchasing pages.
 *
 * Amounts are whole paisa (1 Tk = 100 paisa) and percentages are hundredths of a percent (15.00% = 1500),
 * so there are no floating-point errors. This mirrors backend/app/services/purchase_calculator.py:
 *
 *     line total = quantity x unit price x (1 - line discount %)      subtotal = sum of the lines
 *     VAT        = subtotal x VAT %                                   total = subtotal - discount + VAT + shipping
 *
 * It is only a PREVIEW for the manager - the server recalculates everything when the purchase is confirmed.
 */
import type { PaymentMethod, PaymentStatus } from '../../types/purchasing.ts'

export type Paisa = number

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank / Card' },
  { value: 'digital', label: 'Digital payment' },
]

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PAID: 'Paid',
  PARTIALLY_PAID: 'Part paid',
  DUE: 'Due',
}

export function methodLabel(method: string): string {
  return PAYMENT_METHODS.find((item) => item.value === method)?.label ?? method
}

/** Turns an API decimal string into hundredths: "90.00" -> 9000, "5.5" -> 550. */
export function toHundredths(value: string): number {
  const text = value.trim()
  const [whole, fraction = ''] = text.split('.')
  return Number(whole) * 100 + Number((fraction + '00').slice(0, 2))
}

/** What the manager typed in an amount box: "250" -> 25000, "250.5" -> 25050, "" -> 0, "abc" -> null. */
export function parseAmount(text: string): Paisa | null {
  const clean = text.trim()
  if (clean === '') return 0
  return /^\d{1,10}(\.\d{1,2})?$/.test(clean) ? toHundredths(clean) : null
}

/** A percentage box: "15" -> 1500, "2.5" -> 250, "" -> 0. Null when it isn't a number from 0 to 100. */
export function parsePercent(text: string): number | null {
  const clean = text.trim()
  if (clean === '') return 0
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(clean)) return null
  const hundredths = toHundredths(clean)
  return hundredths <= 10000 ? hundredths : null
}

/** A quantity box: whole numbers from 1 (stock is counted in whole units). Null otherwise. */
export function parseQuantity(text: string): number | null {
  const clean = text.trim()
  if (!/^\d{1,7}$/.test(clean)) return null
  const quantity = Number(clean)
  return quantity >= 1 ? quantity : null
}

/** 25050 -> "250.50", for filling an input box or sending to the API. */
export function toInputText(paisa: Paisa): string {
  return (paisa / 100).toFixed(2)
}

/** 123456 -> "Tk 1,234.56" and -5025 -> "-Tk 50.25" */
export function formatMoney(paisa: Paisa): string {
  const sign = paisa < 0 ? '-' : ''
  const amount = Math.abs(paisa)
  const whole = Math.floor(amount / 100)
  const fraction = String(amount % 100).padStart(2, '0')
  return `${sign}Tk ${whole.toLocaleString('en-US')}.${fraction}`
}

/** An API amount as money: "1102.50" -> "Tk 1,102.50" */
export function moneyText(value: string): string {
  return formatMoney(toHundredths(value))
}

/** "15.00" -> "15", "2.50" -> "2.5" */
export function percentText(value: string): string {
  return String(Number(value))
}

/** Today as "2026-09-21" in the user's local time, for the expiry date box */
export function todayText(): string {
  return new Date().toLocaleDateString('en-CA')
}

export type PreviewLine = {
  unitPrice: Paisa
  quantity: number
  /** Hundredths of a percent */
  discountHundredths: number
}

export type PurchasePreview = {
  lines: Paisa[]
  subtotal: Paisa
  discount: Paisa
  tax: Paisa
  shipping: Paisa
  total: Paisa
}

/** n / d rounded half up, for whole numbers (n >= 0, d > 0). BigInt keeps very large purchases exact. */
function divideHalfUp(n: bigint, d: bigint): number {
  return Number((2n * n + d) / (2n * d))
}

export function calculatePurchase(
  lines: PreviewLine[],
  discount: Paisa,
  taxHundredths: number,
  shipping: Paisa,
): PurchasePreview {
  const lineTotals = lines.map((line) =>
    divideHalfUp(BigInt(line.unitPrice) * BigInt(line.quantity) * BigInt(10000 - line.discountHundredths), 10000n),
  )
  const subtotal = lineTotals.reduce((sum, amount) => sum + amount, 0)
  const tax = divideHalfUp(BigInt(subtotal) * BigInt(taxHundredths), 10000n)
  return { lines: lineTotals, subtotal, discount, tax, shipping, total: subtotal - discount + tax + shipping }
}