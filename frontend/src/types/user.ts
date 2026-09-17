import type { PermissionCode } from './auth.ts'

// Same shapes as backend/app/schemas/user.py
export type User = {
  user_id: number
  full_name: string
  username: string
  email: string
  role_id: number
  role: string
  is_active: boolean
  last_login_at: string | null
  created_at: string
}

export type Role = {
  role_id: number
  name: string
  description: string | null
  permissions: PermissionCode[]
}

/** What the add/edit user form sends */
export type UserInput = {
  full_name: string
  username: string
  email: string
  role_id: number
  is_active: boolean
}

export type NewUserInput = UserInput & { password: string }
