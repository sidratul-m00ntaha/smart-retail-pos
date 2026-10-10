import { useSyncExternalStore } from 'react'
import Chart from 'chart.js/auto'

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
