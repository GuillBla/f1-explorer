import { format } from 'date-fns'
import { fr } from 'date-fns/locale'
import type { JRace } from '@/lib/api'
import { parseUtc } from '../models/weather'

const RACE_DURATION = 3 * 3_600_000

export const raceStart = (r: JRace) => parseUtc(r.date, r.time)

/** Races not finished yet (start + 3 h in the future). */
export function upcomingRaces(races: JRace[], now = Date.now()) {
  return races.filter((r) => raceStart(r) + RACE_DURATION > now)
}

export function nextRace(races: JRace[], now = Date.now()) {
  return upcomingRaces(races, now)[0] ?? null
}

export const fmtDay = (ms: number) => format(ms, 'EEE d MMM', { locale: fr })
export const fmtDateTime = (ms: number) => format(ms, "EEE d MMM 'à' HH'h'mm", { locale: fr })
export const fmtHour = (ms: number) => format(ms, "EEE HH'h'", { locale: fr })
export const fmtTime = (ms: number) => format(ms, "HH'h'mm", { locale: fr })
