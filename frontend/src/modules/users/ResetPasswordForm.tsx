import { useId, useState, type FormEvent } from 'react'
import Drawer from '../../components/ui/Drawer.tsx'
import { ApiError } from '../../services/api.ts'
import { resetUserPassword } from '../../services/user.service.ts'
import type { User } from '../../types/user.ts'
import styles from './users.module.css'

type ResetPasswordFormProps = {
  user: User
  onClose: () => void
  onSaved: (message: string) => void
}

/** Lets an admin set a new password for a user, e.g. when they forgot it. */
export default function ResetPasswordForm({ user, onClose, onSaved }: ResetPasswordFormProps) {
  const formId = useId()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState<{ newPassword?: string; confirmPassword?: string }>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const found: typeof errors = {}
    if (newPassword.length < 8) found.newPassword = 'Use at least 8 characters.'
    else if (confirmPassword !== newPassword) found.confirmPassword = "The passwords don't match."
    setErrors(found)
    setSaveError(null)
    if (Object.keys(found).length > 0) return

    setIsSaving(true)
    try {
      await resetUserPassword(user.user_id, newPassword)
      onSaved(`Password reset for ${user.full_name}. Give them the new password privately.`)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Could not reset the password.')
      setIsSaving(false)
    }
  }

  return (
    <Drawer
      title="Reset password"
      onClose={onClose}
      footer={
        <>
          <button type="button" className={styles.secondaryButton} onClick={onClose}>
            Cancel
          </button>
          <button type="submit" form={formId} className={styles.saveButton} disabled={isSaving}>
            {isSaving ? 'Saving…' : 'Reset password'}
          </button>
        </>
      }
    >
      <form id={formId} onSubmit={handleSubmit} noValidate>
        <p className={styles.formIntro}>
          Set a new password for <b>{user.full_name}</b> ({user.username}). Their current password will stop working.
        </p>

        {saveError && (
          <p className={styles.formError} role="alert">
            {saveError}
          </p>
        )}

        <div className={errors.newPassword ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
          <label className={styles.label} htmlFor={`${formId}-new`}>
            New password <span className={styles.required}>*</span>
          </label>
          <input
            id={`${formId}-new`}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            autoFocus
          />
          {errors.newPassword ? (
            <p className={styles.fieldError}>{errors.newPassword}</p>
          ) : (
            <p className={styles.hint}>At least 8 characters.</p>
          )}
        </div>

        <div className={errors.confirmPassword ? `${styles.formRow} ${styles.hasError}` : styles.formRow}>
          <label className={styles.label} htmlFor={`${formId}-confirm`}>
            Repeat new password <span className={styles.required}>*</span>
          </label>
          <input
            id={`${formId}-confirm`}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
          {errors.confirmPassword && <p className={styles.fieldError}>{errors.confirmPassword}</p>}
        </div>
      </form>
    </Drawer>
  )
}
