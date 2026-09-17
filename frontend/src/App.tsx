import { Navigate, Route, Routes } from 'react-router'
import MessagePanel from './components/common/MessagePanel.tsx'
import AppLayout from './components/layout/AppLayout.tsx'
import PageGuard from './components/layout/PageGuard.tsx'
import { homePathFor, NAV_SECTIONS } from './config/navigation.ts'
import { useAuth } from './hooks/useAuth.ts'
import LoginPage from './modules/auth/LoginPage.tsx'
import RequireAuth from './modules/auth/RequireAuth.tsx'

// Page routes are built from each module's navigation.ts - add your pages there, not here.
export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<HomeRedirect />} />
        {NAV_SECTIONS.flatMap((section) =>
          section.items.map((item) => (
            <Route key={item.path} path={item.path} element={<PageGuard section={section} item={item} />} />
          )),
        )}
        <Route
          path="*"
          element={<MessagePanel title="Page not found">This address doesn't exist. Use the sidebar to find the page you need.</MessagePanel>}
        />
      </Route>
    </Routes>
  )
}

/** "/" sends each user to the first page their role may open (managers: Dashboard, cashiers: POS). */
function HomeRedirect() {
  const { hasPermission } = useAuth()
  const home = homePathFor(hasPermission)

  if (!home) {
    return <MessagePanel title="No pages available">Your role can't open any pages yet. Please contact an administrator.</MessagePanel>
  }
  return <Navigate to={home} replace />
}
