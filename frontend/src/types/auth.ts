// Must match backend/app/core/permissions.py
export type PermissionCode =
  | 'users.manage'
  | 'settings.manage'
  | 'activity_logs.view'
  | 'tax_rates.manage'
  | 'products.manage'
  | 'suppliers.manage'
  | 'purchases.manage'
  | 'inventory.manage'
  | 'customers.manage'
  | 'customers.create'
  | 'customer_dues.receive'
  | 'loyalty.configure'
  | 'pos.sell'
  | 'sales.view'
  | 'reports.view'
  | 'ai.use'

// Same shape as CurrentUser in backend/app/schemas/auth.py
export type CurrentUser = {
  user_id: number
  username: string
  full_name: string
  email: string
  role: string
  permissions: PermissionCode[]
}

export type LoginResponse = {
  access_token: string
  token_type: string
  user: CurrentUser
}
