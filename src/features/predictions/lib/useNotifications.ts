import { useCallback, useEffect, useRef, useState } from 'react'
import { LEVEL_RANK, type WeatherAlert } from '../models/weather'

const KEY = 'f1x-pred-notifications'
const supported = typeof window !== 'undefined' && 'Notification' in window

function readOptIn() {
  try {
    return localStorage.getItem(KEY) === '1'
  } catch {
    return false
  }
}

/**
 * Opt-in browser notifications: fires when a new alert (vigilance or above) appears while the page is open.
 * Alerts present when the page loads are considered "seen" (they are already shown in the banner).
 */
export function useAlertNotifications(alerts: WeatherAlert[] | undefined, context: string) {
  const [enabled, setEnabled] = useState(() => supported && readOptIn() && Notification.permission === 'granted')
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported'>(supported ? Notification.permission : 'unsupported')
  const seen = useRef<Set<string> | null>(null)
  const ctx = useRef(context)

  useEffect(() => {
    // Changing Grand Prix resets the baseline.
    if (ctx.current !== context) {
      ctx.current = context
      seen.current = null
    }
    if (!alerts) return
    const relevant = alerts.filter((a) => LEVEL_RANK[a.level] >= LEVEL_RANK.vigilance)
    if (seen.current === null) {
      seen.current = new Set(relevant.map((a) => a.id))
      return
    }
    const fresh = relevant.filter((a) => !seen.current!.has(a.id))
    fresh.forEach((a) => seen.current!.add(a.id))
    if (!enabled || !fresh.length) return
    for (const a of fresh.slice(0, 3)) {
      try {
        new Notification(`${a.level === 'alerte' ? '⚠ Alerte' : 'Vigilance'} météo – ${context}`, { body: `${a.sessionLabel} : ${a.title}. ${a.detail}`, tag: a.id })
      } catch {
        /* some mobile browsers only allow notifications from a service worker */
      }
    }
  }, [alerts, enabled, context])

  const toggle = useCallback(async () => {
    if (!supported) return
    if (enabled) {
      setEnabled(false)
      try { localStorage.setItem(KEY, '0') } catch { /* ignore */ }
      return
    }
    const p = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    setPermission(p)
    if (p === 'granted') {
      setEnabled(true)
      try { localStorage.setItem(KEY, '1') } catch { /* ignore */ }
      try {
        new Notification('Alertes météo activées', { body: `Vous serez prévenu si une nouvelle alerte apparaît pour ${context}.` })
      } catch { /* ignore */ }
    }
  }, [enabled, context])

  return { supported, enabled, permission, toggle }
}
