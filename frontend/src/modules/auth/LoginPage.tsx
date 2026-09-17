import { useEffect, useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError, getHealth } from '../../services/api.ts'
import styles from './LoginPage.module.css'

type ServerStatus = 'checking' | 'connected' | 'noDatabase' | 'offline'

const SERVER_STATUS_TEXT: Record<ServerStatus, string> = {
  checking: 'Checking the server…',
  connected: 'Server and database connected',
  noDatabase: 'Server is running, but the database is not connected',
  offline: 'Cannot reach the server – is the backend running?',
}

// Sample receipt on the left panel (decoration only, as in docs/prototype/login.html)
const RECEIPT_LINES = [
  ['Rice 5kg x2', 'Tk 1,100'],
  ['Oil 1L x1', 'Tk 180'],
  ['Milk 1L x2', 'Tk 200'],
  ['Biscuit x3', 'Tk 150'],
]

export default function LoginPage() {
  const { user, login, signInMessage } = useAuth()
  const location = useLocation()

  const [usernameOrEmail, setUsernameOrEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [showPassword, setShowPassword] = useState(false)
  const [missing, setMissing] = useState({ username: false, password: false })
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [serverStatus, setServerStatus] = useState<ServerStatus>('checking')

  useEffect(() => {
    getHealth()
      .then(() => setServerStatus('connected'))
      .catch((err) => setServerStatus(err instanceof ApiError && err.status !== 0 ? 'noDatabase' : 'offline'))
  }, [])

  // Already signed in (or just signed in): go to the page they wanted, or home
  if (user) {
    const from = (location.state as { from?: string } | null)?.from
    return <Navigate to={from && from !== '/login' ? from : '/'} replace />
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const missingFields = { username: usernameOrEmail.trim() === '', password: password === '' }
    setMissing(missingFields)
    setError(null)
    if (missingFields.username || missingFields.password) return

    setIsSubmitting(true)
    try {
      await login(usernameOrEmail.trim(), password, remember)
      // Success: the user is now set, so this page re-renders and redirects (see above)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
      setIsSubmitting(false)
    }
  }

  const banner = error ?? signInMessage

  return (
    <div className={styles.page}>
      <aside className={styles.brandPanel}>
        <div>
          <span className={styles.eyebrow}>Smart Retail</span>
          <p className={styles.brandTitle}>Point of Sale</p>
          <p className={styles.tagline}>
            One counter for products, purchases, inventory, sales and the numbers behind them.
          </p>
        </div>

        <div className={styles.receiptWrap} aria-hidden="true">
          <div className={styles.receipt}>
            <p className={styles.receiptTitle}>SMART RETAIL STORE</p>
            <p className={styles.receiptSub}>Terminal 03</p>
            <hr className={styles.rule} />
            {RECEIPT_LINES.map(([name, price], index) => (
              <div key={name} className={styles.receiptLine} style={{ animationDelay: `${index * 0.4}s` }}>
                <span>{name}</span>
                <span>{price}</span>
              </div>
            ))}
            <hr className={styles.rule} />
            <div className={styles.receiptTotal}>
              <span>Total</span>
              <span>Tk 1,630</span>
            </div>
            <div className={styles.barcode} />
            <p className={styles.barcodeLabel}>INV-2026-00125</p>
          </div>
        </div>

        <p className={styles.flow}>Products → Purchases → Inventory → POS → Reports</p>
      </aside>

      <main className={styles.authPanel}>
        <div className={styles.card}>
          <h1 className={styles.heading}>Sign in</h1>
          <p className={styles.sub}>Sign in to manage your store.</p>

          {banner && (
            <div className={`${styles.banner} ${error ? styles.bannerError : styles.bannerInfo}`} role="alert">
              {banner}
            </div>
          )}

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <div className={styles.field}>
              <label htmlFor="username">Username or email</label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                autoFocus
                value={usernameOrEmail}
                onChange={(event) => setUsernameOrEmail(event.target.value)}
                aria-invalid={missing.username}
                className={missing.username ? styles.inputError : undefined}
              />
              {missing.username && <p className={styles.fieldError}>Enter your username or email.</p>}
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <div className={styles.passwordWrap}>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  aria-invalid={missing.password}
                  className={missing.password ? styles.inputError : undefined}
                />
                <button
                  type="button"
                  className={styles.toggle}
                  onClick={() => setShowPassword((shown) => !shown)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                    <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
              {missing.password && <p className={styles.fieldError}>Enter your password.</p>}
            </div>

            <label className={styles.remember}>
              <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
              Remember this device
            </label>

            <button type="submit" className={styles.submit} disabled={isSubmitting}>
              {isSubmitting && <span className={styles.spinner} aria-hidden="true" />}
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className={styles.help}>Forgot your password? Ask an administrator to reset it.</p>
          <p className={`${styles.serverStatus} ${styles[serverStatus]}`}>● {SERVER_STATUS_TEXT[serverStatus]}</p>
        </div>
      </main>
    </div>
  )
}
