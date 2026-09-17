import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { AuthContext } from '../../hooks/useAuth.ts'
import { clearToken, getToken, saveToken, setUnauthorizedHandler } from '../../services/api.ts'
import { fetchCurrentUser, login as loginRequest } from '../../services/auth.service.ts'
import type { CurrentUser, PermissionCode } from '../../types/auth.ts'

/** Keeps track of who is logged in, for the whole app. */
export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null)
  const [signInMessage, setSignInMessage] = useState<string | null>(null)
  // A token saved from last time? Check it with the backend before showing any page.
  const [isRestoring, setIsRestoring] = useState(() => getToken() !== null)

  const logout = useCallback((message?: string) => {
    clearToken()
    setUser(null)
    setSignInMessage(message ?? null)
  }, [])

  // Any API call answered with 401 (login expired or no longer valid) logs the user out
  useEffect(() => {
    setUnauthorizedHandler(() => logout('Your session has expired. Please sign in again.'))
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (!isRestoring) return
    fetchCurrentUser()
      .then(setUser)
      .catch(() => {}) // a 401 is handled above; otherwise the sign-in page shows the server status
      .finally(() => setIsRestoring(false))
  }, [isRestoring])

  const login = useCallback(async (usernameOrEmail: string, password: string, remember: boolean) => {
    const result = await loginRequest(usernameOrEmail, password)
    saveToken(result.access_token, remember)
    setSignInMessage(null)
    setUser(result.user)
  }, [])

  const refreshUser = useCallback(async () => {
    setUser(await fetchCurrentUser())
  }, [])

  const hasPermission = useCallback(
    (code: PermissionCode) => user?.permissions.includes(code) ?? false,
    [user],
  )

  const value = useMemo(
    () => ({ user, login, logout, refreshUser, hasPermission, signInMessage }),
    [user, login, logout, refreshUser, hasPermission, signInMessage],
  )

  if (isRestoring) {
    return <MessagePanel title="Loading…" fullPage />
  }

  return <AuthContext value={value}>{children}</AuthContext>
}
