import type { CurrentUser, LoginResponse } from '../types/auth.ts'
import { apiRequest } from './api.ts'

export function login(usernameOrEmail: string, password: string): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/auth/login', {
    form: { username: usernameOrEmail, password },
  })
}

export function fetchCurrentUser(): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/api/auth/me')
}
