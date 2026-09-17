// Same shapes as backend/app/schemas/store_setting.py
export type StoreSettings = {
  store_name: string
  address: string | null
  phone: string | null
  email: string | null
  currency_code: CurrencyCode
  /** e.g. "৳" - use it when showing money */
  currency_symbol: string
  invoice_prefix: string
  /** Chosen on the VAT Rates page once Module 2 adds VAT rates */
  default_tax_rate_id: number | null
  loyalty_enabled: boolean
  sms_enabled: boolean
  sms_sender_name: string | null
  updated_at: string | null
  updated_by_name: string | null
}

export type CurrencyCode = 'BDT' | 'USD' | 'INR'

/** What the settings form sends. Empty optional fields may be sent as "" - they are saved as empty. */
export type StoreSettingsInput = {
  store_name: string
  address: string
  phone: string
  email: string
  currency_code: CurrencyCode
  invoice_prefix: string
  loyalty_enabled: boolean
  sms_enabled: boolean
  sms_sender_name: string
}
