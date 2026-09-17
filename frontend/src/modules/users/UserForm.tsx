import { useId, useState, type FormEvent, type ReactNode } from 'react'
import Drawer from '../../components/ui/Drawer.tsx'
import { ApiError } from '../../services/api.ts'
import { createUser, updateUser } from '../../services/user.service.ts'
import type { Role, User } from '../../types/user.ts'
import styles from './users.module.css'

// Same rules as backend/app/schemas/user.py
const USERNAME_PATTERN = /^[A-Za-z0-9._-]+$/
const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/

type UserFormProps = {
  /** The user to edit. Leave it out to add a new user. */
  user?: User
  /** true when admins edit their own account (role and status can't be changed) */
  isSelf?: boolean
  roles: Role[]
  onClose: () => void
  onSaved: (message: string, savedUser: User) => void
}

type FieldErrors = Partial<Record<'fullName' | 'username' | 'email' | 'password' | 'role', string>>

export default function UserForm({ user, isSelf = false, roles, onClose, onSaved }: UserFormProps) {
  const formId = useId()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [username, setUsername] = useState(user?.username ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [roleId, setRoleId] = useState<number | null>(user?.role_id ?? null)
  const [isActive, setIsActive] = useState(user?.is_active ?? true)
  const [errors, setErrors] = useState<FieldErrors>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const selectedRole = roles.find((role) => role.role_id === roleId)

  function validate(): FieldErrors {
    const found: FieldErrors = {}
    if (!fullName.trim()) found.fullName = 'Enter the full name.'
    const trimmedUsername = username.trim()
    if (trimmedUsername.length < 3 || trimmedUsername.length > 50) found.username = 'Use 3 to 50 characters.'
    else if (!USERNAME_PATTERN.test(trimmedUsername)) found.username = 'Use only letters, numbers, dots, dashes and underscores.'
    if (!EMAIL_PATTERN.test(email.trim())) found.email = 'Enter a valid email address.'
    if (!user && password.length < 8) found.password = 'Use at least 8 characters.'
    if (roleId === null) found.role = 'Choose a role.'
    return found
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found = validate()
    setErrors(found)
    setSaveError(null)
    if (Object.keys(found).length > 0 || roleId === null) return

    const data = {
      full_name: fullName.trim(),
      username: username.trim(),
      email: email.trim(),
      role_id: roleId,
      is_active: isActive,
    }
    setIsSaving(true)
    try {
      if (user) {
        const saved = await updateUser(user.user_id, data)
        onSaved(`Saved changes to ${saved.full_name}.`, saved)
      } else {
        const saved = await createUser({ ...data, password })
        onSaved(`${saved.full_name} was added and can sign in now.`, saved)
      }
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not save the user.')
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title={user ? 'Edit user' : 'Add user'}
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Saving…' : user ? 'Save changes' : 'Add user'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        {saveError && (
          <p className={styles.formError} role="alert">
            {saveError}
          </p>
        )}

        <Field id={`${formId}-name`} label="Full name" error={errors.fullName}>
          <input
            id={`${formId}-name`}
            type="text"
            placeholder="e.g. Karim Ahmed"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            autoFocus
          />
        </Field>

        <div className={styles.twoColumns}>
          <Field id={`${formId}-username`} label="Username" error={errors.username}>
            <input
              id={`${formId}-username`}
              type="text"
              placeholder="karim"
              autoComplete="off"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </Field>
          <Field id={`${formId}-email`} label="Email" error={errors.email}>
            <input
              id={`${formId}-email`}
              type="email"
              placeholder="karim@store.com"
              autoComplete="off"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </Field>
        </div>

        {!user && (
          <Field
            id={`${formId}-password`}
            label="Password"
            error={errors.password}
            hint="At least 8 characters. Give it to the user privately."
          >
            <input
              id={`${formId}-password`}
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </Field>
        )}

        <div className={styles.formRow}>
          <span className={styles.label} id={`${formId}-role`}>
            Role <span className={styles.required}>*</span>
          </span>
          <div className={styles.roleOptions} role="radiogroup" aria-labelledby={`${formId}-role`}>
            {roles.map((role) => {
              const isSelected = role.role_id === roleId
              return (
                <button
                  key={role.role_id}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  disabled={isSelf}
                  className={isSelected ? `${styles.roleOption} ${styles[`role${role.name}`] ?? ''}` : styles.roleOption}
                  onClick={() => setRoleId(role.role_id)}
                >
                  {role.name}
                </button>
              )
            })}
          </div>
          {selectedRole && (
            <p className={styles.roleScope}>
              <b>{selectedRole.name}:</b> {selectedRole.description} ({selectedRole.permissions.length}{' '}
              {selectedRole.permissions.length === 1 ? 'permission' : 'permissions'})
            </p>
          )}
          {isSelf && <p className={styles.hint}>You can't change your own role.</p>}
          {errors.role && <p className={styles.fieldError}>{errors.role}</p>}
        </div>

        <label className={styles.toggleRow}>
          <span>
            <span className={styles.toggleLabel}>Active</span>
            <span className={styles.toggleSub}>
              {isSelf ? "You can't deactivate your own account." : 'Inactive users cannot sign in.'}
            </span>
          </span>
          <span className={styles.switch}>
            <input
              type="checkbox"
              checked={isActive}
              disabled={isSelf}
              onChange={(event) => setIsActive(event.target.checked)}
            />
            <span className={styles.slider} />
          </span>
        </label>
      </form>
    </Drawer>
  )
}

type FieldProps = { id: string; label: string; error?: string; hint?: string; children: ReactNode }

function Field({ id, label, error, hint, children }: FieldProps) {
  return (
    <div className={error ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
      <label className={styles.label} htmlFor={id}>
        {label} <span className={styles.required}>*</span>
      </label>
      {children}
      {error ? <p className={styles.fieldError}>{error}</p> : hint && <p className={styles.hint}>{hint}</p>}
    </div>
  )
}
