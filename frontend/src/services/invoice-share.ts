import { apiRequest } from './api.ts'
import type { InvoiceData } from './pos.service.ts'

/**
 * The address the QR code on an invoice points to. It is the address this app is open on.
 * To show the QR code to a phone, set VITE_PUBLIC_URL in frontend/.env to an address the phone can reach,
 * for example http://192.168.0.5:5173 (see docs/extra-features.md).
 */
const APP_URL: string = String(import.meta.env.VITE_PUBLIC_URL ?? window.location.origin).replace(/\/+$/, '')

export function publicInvoiceUrl(shareCode: string): string {
  return `${APP_URL}/i/${encodeURIComponent(shareCode)}`
}

/** The invoice behind a QR code. No login is needed. */
export function getPublicInvoice(shareCode: string): Promise<InvoiceData> {
  return apiRequest<InvoiceData>(`/api/public/invoices/${encodeURIComponent(shareCode)}`)
}
