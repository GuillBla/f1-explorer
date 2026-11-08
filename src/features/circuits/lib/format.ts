import { format, parseISO } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { JRace } from '@/lib/api'

export const fmtNum = (v: number | undefined, digits = 0, unit = '') =>
  v === undefined || Number.isNaN(v) ? '—' : `${v.toLocaleString('fr-FR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}${unit}`

export function raceDate(r: JRace) {
  return parseISO(r.time ? `${r.date}T${r.time}` : `${r.date}T12:00:00Z`)
}

export const fmtDate = (d: Date, pattern = 'd MMM yyyy') => format(d, pattern, { locale: fr })

export function fmtLapTime(sec: number) {
  const m = Math.floor(sec / 60)
  const s = sec - m * 60
  return `${m}:${s.toFixed(3).padStart(6, '0')}`
}

/** Sector colours (F1 TV convention: red / blue / yellow). */
export const SECTOR_COLORS = ['#e10600', '#3fa9f5', '#ffb800']
