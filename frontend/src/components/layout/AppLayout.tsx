import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { findSection, NAV_SECTIONS, visibleItems } from '../../config/navigation.ts'
import { useAuth } from '../../hooks/useAuth.ts'
import { initials } from '../../utils/text.ts'
import styles from './AppLayout.module.css'
import { NavIcon } from './icons.tsx'

/** The frame around every page: sidebar, top bar and page tabs. The current page appears in <Outlet />. */
export default function AppLayout() {
  const { user, logout, hasPermission } = useAuth()
  const { pathname } = useLocation()

  if (!user) return null // RequireAuth sends logged-out users to the sign-in page

  const currentSection = findSection(pathname)
  const tabs = currentSection ? visibleItems(currentSection, hasPermission) : []

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.eyebrow}>Smart Retail</span>
          <span className={styles.brandTitle}>Point of Sale</span>
        </div>

        <nav className={styles.nav} aria-label="Main">
          {NAV_SECTIONS.map((section) => {
            const [firstPage] = visibleItems(section, hasPermission)
            if (!firstPage) return null // the user's role can't open any page in this section
            const isActive = section === currentSection
            return (
              <Link
                key={section.label}
                to={firstPage.path}
                className={isActive ? `${styles.navItem} ${styles.active}` : styles.navItem}
                aria-current={isActive ? 'page' : undefined}
              >
                <NavIcon name={section.icon} />
                {section.label}
              </Link>
            )
          })}
        </nav>

        <div className={styles.sidebarFooter}>Signed in as {user.username}</div>
      </aside>

      <div className={styles.main}>
        <header className={styles.topbar}>
          <div>
            <h1 className={styles.pageTitle}>{currentSection?.label ?? 'Smart Retail POS'}</h1>
            <p className={styles.date}>{formatToday()}</p>
          </div>
          <div className={styles.topRight}>
            <span className={styles.rolePill}>{user.role}</span>
            <span className={styles.avatar} title={user.full_name} aria-hidden="true">
              {initials(user.full_name)}
            </span>
            <button type="button" className={styles.logoutButton} onClick={() => logout()}>
              Log out
            </button>
          </div>
        </header>

        <main className={styles.content}>
          {tabs.length > 1 && (
            <nav className={styles.pageTabs} aria-label={`${currentSection?.label} pages`}>
              {tabs.map((tab) => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end
                  className={({ isActive }) => (isActive ? `${styles.pageTab} ${styles.activeTab}` : styles.pageTab)}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>
          )}
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function formatToday(): string {
  return new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}
