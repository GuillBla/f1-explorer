/** Pure helpers deriving "state at time T" from OpenF1 time series. */
import type { Lap, Stint, Interval } from './api'
import type { PitX } from './api'
import { ms } from './format'

export interface LapX extends Lap { start: number; end: number }

/** Group laps by driver, sorted by lap number, with start/end timestamps (ms). */
export function indexLaps(laps: Lap[]): Map<number, LapX[]> {
  const by = new Map<number, LapX[]>()
  for (const l of laps) {
    const arr = by.get(l.driver_number) ?? []
    arr.push({ ...l, start: ms(l.date_start), end: NaN })
    by.set(l.driver_number, arr)
  }
  for (const arr of by.values()) {
    arr.sort((a, b) => a.lap_number - b.lap_number)
    arr.forEach((l, i) => {
      if (Number.isFinite(l.start) && l.lap_duration != null) l.end = l.start + l.lap_duration * 1000
      else if (arr[i + 1] && Number.isFinite(arr[i + 1].start)) l.end = arr[i + 1].start
    })
  }
  return by
}

export const completed = (laps: LapX[] | undefined, t: number) =>
  (laps ?? []).filter((l) => Number.isFinite(l.end) && l.end <= t)

/** Lap currently being driven at time t (0 before the first lap). */
export function currentLapNumber(laps: LapX[] | undefined, t: number) {
  let n = 0
  for (const l of laps ?? []) if (Number.isFinite(l.start) && l.start <= t) n = Math.max(n, l.lap_number)
  return n
}

/** Items must be sorted by date ascending. Returns the latest item per driver with date ≤ t. */
export function latestPerDriver<T extends { driver_number: number; date: string }>(sorted: T[], t: number) {
  const out = new Map<number, T>()
  for (const it of sorted) {
    if (ms(it.date) > t) break
    out.set(it.driver_number, it)
  }
  return out
}

export const sortByDate = <T extends { date: string }>(items: T[]) =>
  [...items].sort((a, b) => ms(a.date) - ms(b.date))

/** Last item with date ≤ t (sorted ascending). */
export function latestAt<T extends { date: string }>(sorted: T[], t: number): T | undefined {
  let res: T | undefined
  for (const it of sorted) {
    if (ms(it.date) > t) break
    res = it
  }
  return res
}

export function stintsUpTo(stints: Stint[], driver: number, lap: number) {
  return stints
    .filter((s) => s.driver_number === driver && (lap <= 0 ? s.stint_number === 1 : s.lap_start <= lap))
    .sort((a, b) => a.stint_number - b.stint_number)
}

/** Real pit stops (OpenF1 also logs pit-lane entries before the start with null durations on lap 1). */
export const realPits = (pits: PitX[]) =>
  pits.filter((p) => !(p.lap_number <= 1 && p.pit_duration == null && p.stop_duration == null))

export function median(xs: number[]) {
  if (!xs.length) return NaN
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}

export type { Interval }

/** Start time of each qualifying phase (Q1/Q2/Q3, or SQ1…) from race_control SessionStatus messages. */
export function qualiPhaseStarts(rc: { category: string; message: string; date: string; qualifying_phase?: number | null }[]) {
  const starts = new Map<number, number>()
  for (const m of rc) {
    if (m.category !== 'SessionStatus' || !m.qualifying_phase || !/STARTED/i.test(m.message)) continue
    const t = ms(m.date)
    const prev = starts.get(m.qualifying_phase)
    if (prev == null || t < prev) starts.set(m.qualifying_phase, t)
  }
  return [...starts.entries()].sort((a, b) => a[0] - b[0])
}

export function phaseAt(starts: [number, number][], t: number) {
  let p = 0
  for (const [phase, s] of starts) if (s <= t) p = phase
  return p
}
