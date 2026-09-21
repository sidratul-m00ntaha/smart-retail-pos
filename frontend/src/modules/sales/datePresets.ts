/** Quick date ranges for the Sales and Invoices lists (PRD 5.19). Dates are date-picker text: "2026-09-21". */

export type PresetId = 'all' | 'today' | 'yesterday' | 'last7' | 'month'
export type DatePreset = PresetId | 'custom'

export const PRESETS: { id: PresetId; label: string }[] = [
  { id: 'all', label: 'All time' },
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'last7', label: 'Last 7 days' },
  { id: 'month', label: 'This month' },
]

/** A Date as the text a date picker uses, in the user's local time: "2026-09-21". */
export function toDateInput(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function daysAgo(now: Date, days: number): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - days)
}

/** The range for a preset as of `now`. Both ends are included; "all" is no range at all. */
export function presetRange(preset: PresetId, now: Date): { dateFrom: string; dateTo: string } {
  switch (preset) {
    case 'today':
      return { dateFrom: toDateInput(now), dateTo: toDateInput(now) }
    case 'yesterday':
      return { dateFrom: toDateInput(daysAgo(now, 1)), dateTo: toDateInput(daysAgo(now, 1)) }
    case 'last7':
      return { dateFrom: toDateInput(daysAgo(now, 6)), dateTo: toDateInput(now) }
    case 'month':
      return { dateFrom: toDateInput(new Date(now.getFullYear(), now.getMonth(), 1)), dateTo: toDateInput(now) }
    case 'all':
      return { dateFrom: '', dateTo: '' }
  }
}
