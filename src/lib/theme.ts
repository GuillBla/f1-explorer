import { useCallback, useEffect, useState } from 'react'

/**
 * Site theme: "light" (Paddock), "dark" (Paddock sombre) or system default.
 * The choice is stored in localStorage and applied as data-theme on <html>
 * (index.html applies it before first paint to avoid a flash).
 */
export type Theme = 'light' | 'dark'
const KEY = 'f1x-theme'
const media = () => window.matchMedia('(prefers-color-scheme: dark)')

function stored(): Theme | null {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : null
  } catch {
    return null
  }
}

export function effectiveTheme(): Theme {
  const attr = document.documentElement.dataset.theme
  if (attr === 'light' || attr === 'dark') return attr
  return media().matches ? 'dark' : 'light'
}

const listeners = new Set<() => void>()
function notify() {
  listeners.forEach((l) => l())
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* storage unavailable: theme still applies for this visit */
  }
  notify()
}

/** Current effective theme + toggle. Re-renders on toggle and on OS theme change. */
export function useTheme() {
  const [theme, set] = useState<Theme>(() => effectiveTheme())
  useEffect(() => {
    const update = () => set(effectiveTheme())
    listeners.add(update)
    const m = media()
    const onOs = () => {
      if (!stored()) update()
    }
    m.addEventListener('change', onOs)
    return () => {
      listeners.delete(update)
      m.removeEventListener('change', onOs)
    }
  }, [])
  const toggle = useCallback(() => setTheme(effectiveTheme() === 'dark' ? 'light' : 'dark'), [])
  return { theme, toggle }
}

/**
 * Resolved colour tokens for code that needs literal values (canvas, three.js, chart libs).
 * Values update when the theme changes. CSS/SVG code should prefer var(--color-*) directly.
 */
export function useThemeColors() {
  const { theme } = useTheme()
  const [colors, setColors] = useState(() => readColors())
  useEffect(() => {
    setColors(readColors())
  }, [theme])
  return colors
}

function readColors() {
  const s = getComputedStyle(document.documentElement)
  const v = (n: string) => s.getPropertyValue(`--color-${n}`).trim()
  return {
    bg: v('bg'), surface: v('surface'), surface2: v('surface-2'), border: v('border'),
    text: v('text'), muted: v('muted'), f1: v('f1'), accent: v('accent'),
    warn: v('warn'), ok: v('ok'), info: v('info'),
  }
}
