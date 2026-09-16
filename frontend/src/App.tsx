import { useEffect, useState } from 'react'
import { getHealth, type HealthStatus } from './services/api.ts'

// Temporary start page: proves the frontend can reach the backend and database.
// It will be replaced by the real layout (login, sidebar, dashboard) later.
function App() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setError('Cannot reach the backend. Is it running on port 8000?'))
  }, [])

  return (
    <main className="status-page">
      <h1>Smart Retail POS</h1>
      <p>Frontend: ok</p>
      {!health && !error && <p>Checking backend...</p>}
      {error && <p className="error">{error}</p>}
      {health && (
        <>
          <p>Backend API: {health.api}</p>
          <p>Database: {health.database}</p>
          {health.detail && <p className="error">{health.detail}</p>}
        </>
      )}
    </main>
  )
}

export default App