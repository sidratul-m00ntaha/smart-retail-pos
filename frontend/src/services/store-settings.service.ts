import type { StoreSettings, StoreSettingsInput } from '../types/store-settings.ts'
import { apiRequest } from './api.ts'

/** Store name, currency, invoice prefix, loyalty and SMS switches. Any logged-in user may read them. */
export function getStoreSettings(): Promise<StoreSettings> {
  return apiRequest<StoreSettings>('/api/settings')
}

export function updateStoreSettings(data: StoreSettingsInput): Promise<StoreSettings> {
  return apiRequest<StoreSettings>('/api/settings', { method: 'PUT', body: data })
}
