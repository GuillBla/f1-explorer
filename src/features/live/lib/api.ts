/**
 * Thin OpenF1 layer for the Live module.
 * - Uses the shared `fetchJson` (cache + per-host queue + 429 retry) but lets us pick the TTL
 *   (short while polling a live session, long for finished sessions).
 * - OpenF1 answers 404 `{"detail":"No results found."}` when a query matches nothing: mapped to [].
 */
import { fetchJson, HttpError, qs } from '@/lib/api'
import type {
  Driver, Lap, Meeting, Position, Interval, Stint, Location, CarData, Weather, Session, TeamRadio,
} from '@/lib/api'

const BASE = 'https://api.openf1.org/v1'
export type Params = Record<string, string | number | boolean | undefined | null>

export async function of1<T>(endpoint: string, params: Params, ttlMs: number): Promise<T[]> {
  try {
    const data = await fetchJson<unknown>(`${BASE}/${endpoint}${qs(params)}`, { ttlMs })
    return Array.isArray(data) ? (data as T[]) : []
  } catch (e) {
    if (e instanceof HttpError && e.status === 404) return []
    throw e
  }
}

/** 401/403: OpenF1 restricts data of a running session to paid accounts. */
export function isRestricted(err: unknown) {
  return err instanceof HttpError && (err.status === 401 || err.status === 403)
}

/* ---- Extended shapes (fields observed on api.openf1.org, absent from the shared types) ---- */
export interface SessionX extends Session { is_cancelled?: boolean; circuit_key?: number }
export interface MeetingX extends Meeting { is_cancelled?: boolean; date_end?: string }
export interface PitX {
  driver_number: number; lap_number: number; date: string
  pit_duration: number | null; lane_duration?: number | null; stop_duration?: number | null
}
export interface RaceControlX {
  category: string; flag: string | null; message: string; lap_number: number | null; date: string
  driver_number: number | null; scope?: string | null; sector?: number | null; qualifying_phase?: number | null
}

export type { Driver, Lap, Position, Interval, Stint, Location, CarData, Weather, TeamRadio }
