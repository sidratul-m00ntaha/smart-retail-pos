// All calls to the FastAPI backend go through apiRequest() in this file.
// Page components should never call fetch() directly - put your calls in src/services/.

// Backend address, set in frontend/.env (see .env.example)
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

/** An error answer from the backend. `message` is safe to show to the user. */
export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

// ---- Login token ----
// "Remember this device" keeps the token in localStorage (survives closing the browser),
// otherwise it goes in sessionStorage (cleared when the browser closes).
const TOKEN_KEY = 'smart-retail-pos.token'

export function saveToken(token: string, remember: boolean): void {
  clearToken()
  const storage = remember ? localStorage : sessionStorage
  storage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY) ?? sessionStorage.getItem(TOKEN_KEY)
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY)
  sessionStorage.removeItem(TOKEN_KEY)
}

// Called when the backend says the login is no longer valid (set by AuthProvider)
let onUnauthorized: (() => void) | null = null

export function setUnauthorizedHandler(handler: (() => void) | null): void {
  onUnauthorized = handler
}

// ---- Requests ----
type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Sent as JSON */
  body?: unknown
  /** Sent as a form - only the login endpoint needs this */
  form?: Record<string, string>
}

/** Calls the backend and returns its JSON answer. Throws ApiError when the backend answers with an error. */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {}
  if (token) headers.Authorization = `Bearer ${token}`

  let body: BodyInit | undefined
  if (options.form) {
    body = new URLSearchParams(options.form)
  } else if (options.body !== undefined) {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify(options.body)
  }

  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? (body ? 'POST' : 'GET'),
      headers,
      body,
    })
  } catch {
    throw new ApiError(0, 'Cannot reach the server. Check that the backend is running.')
  }

  if (response.status === 401 && token) {
    clearToken()
    onUnauthorized?.()
  }

  const data: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    throw new ApiError(response.status, errorMessage(data, response.status))
  }
  return data as T
}

function errorMessage(data: unknown, status: number): string {
  const detail = (data as { detail?: unknown } | null)?.detail
  if (typeof detail === 'string') return detail
  if (Array.isArray(detail)) return 'Some fields are missing or not valid.' // FastAPI validation errors (422)
  return `Something went wrong (error ${status}). Please try again.`
}

// ---- Health check ----
export type HealthStatus = {
  api: string
  database: string
  detail?: string
}

export function getHealth(): Promise<HealthStatus> {
  return apiRequest<HealthStatus>('/api/health')
}
