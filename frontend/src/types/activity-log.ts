// Same shapes as backend/app/schemas/activity_log.py
export type ActivityLog = {
  activity_log_id: number
  /** Empty for actions done by the system */
  user_id: number | null
  user_full_name: string | null
  username: string | null
  action: string
  entity: string
  reference: string | null
  details: string | null
  created_at: string
}

export type ActivityLogPage = {
  items: ActivityLog[]
  total: number
  page: number
  page_size: number
}

export type ActivityLogFilterOptions = {
  users: { user_id: number; full_name: string; username: string }[]
  actions: string[]
  entities: string[]
}

/** Filters for the activity log list. Leave a field out to not filter by it. */
export type ActivityLogQuery = {
  user_id?: number
  action?: string
  entity?: string
  /** Text in the reference or details */
  search?: string
  /** ISO date/time, included */
  created_from?: string
  /** ISO date/time, not included */
  created_before?: string
  page?: number
  page_size?: number
}
