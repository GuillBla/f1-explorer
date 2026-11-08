export const ms = (iso: string | null | undefined) => (iso ? Date.parse(iso) : NaN)

/** OpenF1 date filters accept ISO strings; we drop the trailing "Z" milliseconds noise. */
export const iso = (t: number) => new Date(t).toISOString()

/** 83.456 → "1:23.456" */
export function lapTime(s: number | null | undefined) {
  if (s == null || !Number.isFinite(s)) return '—'
  const m = Math.floor(s / 60)
  const rest = s - m * 60
  return m > 0 ? `${m}:${rest.toFixed(3).padStart(6, '0')}` : rest.toFixed(3)
}

export function gap(v: number | string | null | undefined) {
  if (v == null) return '—'
  if (typeof v === 'string') return v
  return `${v < 0 ? '−' : '+'}${Math.abs(v).toFixed(3)}`
}

/** elapsed ms → "1:02:03" */
export function clock(elapsed: number) {
  const neg = elapsed < 0
  const t = Math.floor(Math.abs(elapsed) / 1000)
  const h = Math.floor(t / 3600)
  const m = Math.floor((t % 3600) / 60)
  const s = t % 60
  const body = `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return neg ? `-${body}` : body
}

export const hhmm = (t: number) =>
  new Date(t).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

export const teamColor = (c: string | null | undefined) => (c ? (c.startsWith('#') ? c : `#${c}`) : '#888888')
