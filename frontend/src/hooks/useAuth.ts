import { createContext, useContext } from 'react'
import type { CurrentUser, PermissionCode } from '../types/auth.ts'

export type AuthContextValue = {
  /** The logged-in user, or null when nobody is logged in */
  user: CurrentUser | null
  login: (usernameOrEmail: string, password: string, remember: boolean) => Promise<void>
  logout: (message?: string) => void
  /** true if the logged-in user's role has this permission */
  hasPermission: (code: PermissionCode) => boolean
  /** A message for the sign-in page, e.g. "Your session has expired" */
  signInMessage: string | null
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/** Who is logged in. Use it in any component: const { user, hasPermission } = useAuth() */
export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth() must be used inside <AuthProvider>')
  return value
}
