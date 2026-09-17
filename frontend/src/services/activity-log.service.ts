import type { ActivityLogFilterOptions, ActivityLogPage, ActivityLogQuery } from '../types/activity-log.ts'
import { apiRequest } from './api.ts'

export function getActivityLogs(query: ActivityLogQuery): Promise<ActivityLogPage> {
  const params = new URLSearchParams()
  for (const [name, value] of Object.entries(query)) {
    if (value !== undefined && value !== '') params.set(name, String(value))
  }
  return apiRequest<ActivityLogPage>(`/api/activity-logs?${params}`)
}

export function getActivityLogFilterOptions(): Promise<ActivityLogFilterOptions> {
  return apiRequest<ActivityLogFilterOptions>('/api/activity-logs/filters')
}
