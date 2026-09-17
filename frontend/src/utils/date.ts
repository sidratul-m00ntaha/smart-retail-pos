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

/**
 * For date filters: turns a date picker value ("2026-09-17") into the moment that day starts
 * in the user's local time, as an ISO string for the API. `dayAfter: true` gives the start of the next day,
 * so "up to and including 17 Sep" becomes "before 18 Sep 00:00".
 */
export function startOfLocalDay(date: string, dayAfter = false): string {
  const start = new Date(`${date}T00:00:00`) // no "Z", so this is local time
  if (dayAfter) start.setDate(start.getDate() + 1)
  return start.toISOString()
}
