// Sidebar icons, copied from the prototype (docs/prototype/dashboard.html)
const ICON_SHAPES = {
  dashboard: (
    <>
      <rect x="3" y="3" width="8" height="8" rx="1.5" />
      <rect x="13" y="3" width="8" height="5" rx="1.5" />
      <rect x="13" y="10" width="8" height="11" rx="1.5" />
      <rect x="3" y="13" width="8" height="8" rx="1.5" />
    </>
  ),
  pos: (
    <>
      <rect x="2" y="6" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="M6 15h4" />
    </>
  ),
  products: (
    <>
      <path d="M21 8 12 3 3 8l9 5 9-5Z" />
      <path d="M3 8v8l9 5 9-5V8" />
      <path d="M12 13v8" />
    </>
  ),
  purchasing: (
    <>
      <path d="M1 3h3l2.4 12.4a2 2 0 0 0 2 1.6h8.2a2 2 0 0 0 2-1.6L21 7H5" />
      <circle cx="9" cy="21" r="1.4" />
      <circle cx="17" cy="21" r="1.4" />
    </>
  ),
  inventory: (
    <>
      <rect x="3" y="3" width="18" height="5" rx="1.2" />
      <rect x="3" y="10" width="18" height="5" rx="1.2" />
      <rect x="3" y="17" width="18" height="4" rx="1.2" />
    </>
  ),
  customers: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" />
      <circle cx="17.5" cy="8.5" r="2.6" />
      <path d="M15.5 14.2c2.8.3 5 2.5 5 5.8" />
    </>
  ),
  sales: (
    <>
      <path d="M6 2h12v19l-3-2-3 2-3-2-3 2Z" />
      <path d="M9 8h6M9 12h6" />
    </>
  ),
  reports: <path d="M4 20V10M12 20V4M20 20v-7" />,
  ai: (
    <>
      <rect x="3" y="5" width="18" height="12" rx="3" />
      <path d="M8 21l3-4h2l3 4" />
      <circle cx="8.5" cy="11" r="1" />
      <circle cx="15.5" cy="11" r="1" />
    </>
  ),
  activity: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  users: (
    <>
      <circle cx="12" cy="8" r="3.4" />
      <path d="M4.5 20c0-4.1 3.4-6.6 7.5-6.6s7.5 2.5 7.5 6.6" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 13a7.7 7.7 0 0 0 0-2l2-1.5-2-3.4-2.3.9a7.6 7.6 0 0 0-1.7-1L15 3h-6l-.4 2.9a7.6 7.6 0 0 0-1.7 1l-2.3-.9-2 3.4L4.6 11a7.7 7.7 0 0 0 0 2l-2 1.5 2 3.4 2.3-.9c.5.4 1.1.8 1.7 1L9 21h6l.4-2.9c.6-.2 1.2-.6 1.7-1l2.3.9 2-3.4-2-1.5Z" />
    </>
  ),
}

export type IconName = keyof typeof ICON_SHAPES

export function NavIcon({ name }: { name: IconName }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
      {ICON_SHAPES[name]}
    </svg>
  )
}
