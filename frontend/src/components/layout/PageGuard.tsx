import { useAuth } from '../../hooks/useAuth.ts'
import type { NavItem, NavSection } from '../../types/navigation.ts'
import MessagePanel from '../common/MessagePanel.tsx'

/** Shows a page only to users with its permission. Pages that aren't built yet show "Coming soon". */
export default function PageGuard({ section, item }: { section: NavSection; item: NavItem }) {
  const { hasPermission } = useAuth()

  if (!hasPermission(item.permission)) {
    return <MessagePanel title="Not allowed">Your role doesn't have permission to open this page.</MessagePanel>
  }

  const Page = item.page
  if (Page) return <Page />

  return (
    <MessagePanel title={`${item.label} – coming soon`}>
      <p>This page hasn't been built yet.</p>
      <p>
        Built by: <strong>{item.owner ?? section.owner}</strong>
      </p>
    </MessagePanel>
  )
}
