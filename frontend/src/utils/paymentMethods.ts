/** The ways a customer can pay at the POS. The server accepts the same list (backend/app/schemas/sale.py). */

/** Mobile wallets. Each payment needs the transaction ID from the customer's payment message. */
export const WALLET_METHODS = ['bkash', 'nagad', 'rocket'] as const
export type WalletMethod = (typeof WALLET_METHODS)[number]

export type PaymentMethod = 'cash' | 'card' | 'digital' | WalletMethod

/** In the order they appear on the POS screen and in the reports */
export const PAYMENT_METHODS: PaymentMethod[] = ['cash', 'card', 'digital', ...WALLET_METHODS]

const LABELS: Record<PaymentMethod, string> = {
  cash: 'Cash',
  card: 'Card',
  digital: 'Digital',
  bkash: 'bKash',
  nagad: 'Nagad',
  rocket: 'Rocket',
}

/** "bkash" -> "bKash". An unknown method (an old or future one) is shown as it is saved. */
export function methodLabel(method: string): string {
  return LABELS[method as PaymentMethod] ?? method
}

export function isWallet(method: string): method is WalletMethod {
  return (WALLET_METHODS as readonly string[]).includes(method)
}

/** The brand colours of the wallets (used for small dots and chart slices) */
export const WALLET_COLORS: Record<WalletMethod, string> = {
  bkash: '#e2136e',
  nagad: '#f6921e',
  rocket: '#8c3494',
}

/** The same rule as the server: 4 to 50 letters, numbers, - or _ */
const TRANSACTION_ID = /^[A-Za-z0-9_-]{4,50}$/

export function isValidTransactionId(text: string): boolean {
  return TRANSACTION_ID.test(text.trim())
}
