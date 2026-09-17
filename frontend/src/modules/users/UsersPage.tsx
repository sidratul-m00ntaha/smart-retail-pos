import { useEffect, useMemo, useState } from 'react'
import MessagePanel from '../../components/common/MessagePanel.tsx'
import { useAuth } from '../../hooks/useAuth.ts'
import { ApiError } from '../../services/api.ts'
import { getRoles, getUsers, updateUser } from '../../services/user.service.ts'
import type { Role, User } from '../../types/user.ts'
import { formatDateTime } from '../../utils/date.ts'
import { initials } from '../../utils/text.ts'
import ResetPasswordForm from './ResetPasswordForm.tsx'
import UserForm from './UserForm.tsx'
import styles from './users.module.css'

type StatusFilter = 'All' | 'Active' | 'Inactive'
type OpenPanel = { type: 'add' } | { type: 'edit'; user: User } | { type: 'password'; user: User } | null
type Notice = { text: string; isError?: boolean }

/** Users page (PRD 5.2): list, add, edit, activate/deactivate and reset passwords. */
export default function UsersPage() {
  const { user: currentUser, refreshUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('All')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All')
  const [openPanel, setOpenPanel] = useState<OpenPanel>(null)
  const [notice, setNotice] = useState<Notice | null>(null)

  useEffect(() => {
    Promise.all([getUsers(), getRoles()])
      .then(([userList, roleList]) => {
        setUsers(userList)
        setRoles(roleList)
      })
      .catch((err) => setLoadError(errorText(err, 'Could not load users.')))
      .finally(() => setIsLoading(false))
  }, [])

  // Hide the notice after a few seconds
  useEffect(() => {
    if (!notice) return
    const timer = setTimeout(() => setNotice(null), 5000)
    return () => clearTimeout(timer)
  }, [notice])

  const visibleUsers = useMemo(() => {
    const term = search.trim().toLowerCase()
    return users.filter(
      (user) =>
        (term === '' || [user.full_name, user.username, user.email].some((text) => text.toLowerCase().includes(term))) &&
        (roleFilter === 'All' || user.role === roleFilter) &&
        (statusFilter === 'All' || user.is_active === (statusFilter === 'Active')),
    )
  }, [users, search, roleFilter, statusFilter])

  // After any change: show a message and reload the list, so the table is always up to date
  async function handleSaved(message: string, savedUser?: User) {
    setOpenPanel(null)
    setNotice({ text: message })
    try {
      setUsers(await getUsers())
      if (savedUser && savedUser.user_id === currentUser?.user_id) await refreshUser()
    } catch (err) {
      setNotice({ text: errorText(err, 'Saved, but the list could not be refreshed.'), isError: true })
    }
  }

  async function toggleActive(user: User) {
    try {
      const saved = await updateUser(user.user_id, {
        full_name: user.full_name,
        username: user.username,
        email: user.email,
        role_id: user.role_id,
        is_active: !user.is_active,
      })
      await handleSaved(`${saved.full_name} is now ${saved.is_active ? 'active' : 'inactive'}.`)
    } catch (err) {
      setNotice({ text: errorText(err, 'Could not change the status.'), isError: true })
    }
  }

  if (isLoading) return <MessagePanel title="Loading users…" />
  if (loadError) return <MessagePanel title="Could not load users">{loadError}</MessagePanel>

  const activeCount = users.filter((user) => user.is_active).length
  const adminCount = users.filter((user) => user.role === 'Admin').length

  return (
    <>
      <div className={styles.statStrip}>
        <span className={styles.statChip}>
          <b>{users.length}</b> users
        </span>
        <span className={styles.statChip}>
          <b>{activeCount}</b> active
        </span>
        <span className={styles.statChip}>
          <b>{adminCount}</b> {adminCount === 1 ? 'admin' : 'admins'}
        </span>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.search}>
          <span className={styles.visuallyHidden}>Search users</span>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search users"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>

        <select
          className={styles.select}
          value={roleFilter}
          onChange={(event) => setRoleFilter(event.target.value)}
          aria-label="Filter by role"
        >
          <option value="All">All roles</option>
          {roles.map((role) => (
            <option key={role.role_id} value={role.name}>
              {role.name}
            </option>
          ))}
        </select>

        <div className={styles.statusTabs} role="group" aria-label="Filter by status">
          {(['All', 'Active', 'Inactive'] as const).map((status) => (
            <button
              key={status}
              type="button"
              className={status === statusFilter ? `${styles.statusTab} ${styles.statusTabActive}` : styles.statusTab}
              aria-pressed={status === statusFilter}
              onClick={() => setStatusFilter(status)}
            >
              {status}
            </button>
          ))}
        </div>

        <span className={styles.spacer} />
        <button type="button" className={styles.primaryButton} onClick={() => setOpenPanel({ type: 'add' })}>
          + Add user
        </button>
      </div>

      {notice && (
        <p className={notice.isError ? `${styles.notice} ${styles.noticeError}` : styles.notice} role="status">
          {notice.text}
        </p>
      )}

      <div className={styles.tableCard}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>User</th>
              <th>Role</th>
              <th>Last login</th>
              <th>Status</th>
              <th>
                <span className={styles.visuallyHidden}>Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleUsers.length === 0 && (
              <tr>
                <td colSpan={5} className={styles.emptyRow}>
                  No users match your search.
                </td>
              </tr>
            )}
            {visibleUsers.map((user) => {
              const isMe = user.user_id === currentUser?.user_id
              return (
                <tr key={user.user_id}>
                  <td>
                    <div className={styles.userCell}>
                      <span className={styles.userAvatar} aria-hidden="true">
                        {initials(user.full_name)}
                      </span>
                      <div>
                        <p className={styles.userName}>
                          {user.full_name}
                          {isMe && <span className={styles.youTag}>you</span>}
                        </p>
                        <p className={styles.userSub}>
                          {user.username} · {user.email}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`${styles.rolePill} ${styles[`role${user.role}`] ?? ''}`}>{user.role}</span>
                  </td>
                  <td className={styles.mono}>{formatDateTime(user.last_login_at, 'Never')}</td>
                  <td>
                    <span className={user.is_active ? `${styles.pill} ${styles.pillActive}` : `${styles.pill} ${styles.pillInactive}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td>
                    <div className={styles.rowActions}>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Edit"
                        aria-label={`Edit ${user.full_name}`}
                        onClick={() => setOpenPanel({ type: 'edit', user })}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <path d="M12 20h9" />
                          <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title="Reset password"
                        aria-label={`Reset password for ${user.full_name}`}
                        onClick={() => setOpenPanel({ type: 'password', user })}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                          <circle cx="7.5" cy="15.5" r="4.5" />
                          <path d="m10.7 12.3 9.8-9.8M16 7l3 3M18.5 4.5l2 2" />
                        </svg>
                      </button>
                      <button
                        type="button"
                        className={styles.iconButton}
                        title={isMe ? "You can't deactivate your own account" : user.is_active ? 'Deactivate' : 'Activate'}
                        aria-label={`${user.is_active ? 'Deactivate' : 'Activate'} ${user.full_name}`}
                        disabled={isMe}
                        onClick={() => toggleActive(user)}
                      >
                        {user.is_active ? (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="M8 12h8" />
                          </svg>
                        ) : (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <circle cx="12" cy="12" r="9" />
                            <path d="m8 12 3 3 5-6" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {openPanel?.type === 'add' && <UserForm roles={roles} onClose={() => setOpenPanel(null)} onSaved={handleSaved} />}
      {openPanel?.type === 'edit' && (
        <UserForm
          user={openPanel.user}
          isSelf={openPanel.user.user_id === currentUser?.user_id}
          roles={roles}
          onClose={() => setOpenPanel(null)}
          onSaved={handleSaved}
        />
      )}
      {openPanel?.type === 'password' && (
        <ResetPasswordForm user={openPanel.user} onClose={() => setOpenPanel(null)} onSaved={handleSaved} />
      )}
    </>
  )
}

function errorText(err: unknown, fallback: string): string {
  return err instanceof ApiError ? err.message : fallback
}
