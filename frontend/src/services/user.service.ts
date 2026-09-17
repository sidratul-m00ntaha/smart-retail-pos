import type { NewUserInput, Role, User, UserInput } from '../types/user.ts'
import { apiRequest } from './api.ts'

export function getUsers(): Promise<User[]> {
  return apiRequest<User[]>('/api/users')
}

export function getRoles(): Promise<Role[]> {
  return apiRequest<Role[]>('/api/roles')
}

export function createUser(data: NewUserInput): Promise<User> {
  return apiRequest<User>('/api/users', { method: 'POST', body: data })
}

export function updateUser(userId: number, data: UserInput): Promise<User> {
  return apiRequest<User>(`/api/users/${userId}`, { method: 'PUT', body: data })
}

export function resetUserPassword(userId: number, newPassword: string): Promise<null> {
  return apiRequest<null>(`/api/users/${userId}/reset-password`, {
    method: 'POST',
    body: { new_password: newPassword },
  })
}
