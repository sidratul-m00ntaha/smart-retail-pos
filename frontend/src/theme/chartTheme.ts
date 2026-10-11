import { useSyncExternalStore } from 'react'
import Chart from 'chart.js/auto'
import { isWallet, WALLET_COLORS } from '../utils/paymentMethods.ts'

/** The colours charts use, read from the theme variables in index.css so they match light and dark mode. */
export function chartColors() {
  const css = getComputedStyle(document.documentElement)
  const read = (name: string) => css.getPropertyValue(name).trim()
  return {
    primary: read('--primary'),
    accent: read('--accent'),
    muted: read('--ink-soft'),
    grid: read('--border'),
  }
}

/** One colour for each payment method: the wallets keep their brand colours, the rest follow the theme. */
export function paymentMethodColor(method: string, colors: ReturnType<typeof chartColors>, index: number): string {
  if (isWallet(method)) return WALLET_COLORS[method]
  const byMethod: Record<string, string> = { cash: colors.primary, card: colors.accent, digital: colors.muted }
  return byMethod[method] ?? [colors.primary, colors.accent, colors.muted][index % 3]
}

/** Sets the default text and line colours for every chart created afterwards. Call it before `new Chart(...)`. */
export function applyChartDefaults() {
  const colors = chartColors()
  Chart.defaults.color = colors.muted
  Chart.defaults.borderColor = colors.grid
}

/** "#18181b" + 0.1 -> "rgba(24, 24, 27, 0.1)". Used for the soft fill under a line. */
export function withAlpha(hex: string, alpha: number): string {
  const value = hex.replace('#', '')
  const r = parseInt(value.slice(0, 2), 16)
  const g = parseInt(value.slice(2, 4), 16)
  const b = parseInt(value.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange)
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
  return () => observer.disconnect()
}

function getSnapshot(): 'light' | 'dark' {
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light'
}

/** The current theme. A component that draws charts lists it in its effect, so the charts are redrawn when the theme changes. */
export function useThemeName() {
  return useSyncExternalStore(subscribe, getSnapshot)
}
