import type { NavSection } from '../../types/navigation.ts'

// Owned by Module 1. When a page is built, import it and add `page: YourPage` to its entry.
// See docs/frontend-guide.md
export const aiAssistantSection: NavSection = {
  label: 'AI Assistant',
  icon: 'ai',
  owner: 'Module 1 – Auth & Administration',
  items: [{ label: 'AI Assistant', path: '/ai-assistant', permission: 'ai.use' }],
}
