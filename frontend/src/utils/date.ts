/** Shows a date/time from the API in the user's local time, e.g. "17 Sep 2026, 16:05". */
export function formatDateTime(value: string | null, whenEmpty = '—'): string {
  if (!value) return whenEmpty
  return new Date(value).toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
