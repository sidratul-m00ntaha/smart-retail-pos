// All calls to the FastAPI backend go through files in src/services/.
// Page components should never call fetch() directly.

// Backend address, set in frontend/.env (see .env.example)
export const API_BASE_URL: string =
  import.meta.env.VITE_API_BASE_URL ?? 'http://127.0.0.1:8000'

export type HealthStatus = {
  api: string
  database: string
  detail?: string
}

export async function getHealth(): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE_URL}/api/health`)
  return response.json()
}