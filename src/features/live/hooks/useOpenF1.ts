/**
 * TanStack Query hooks for the Live module.
 * Heavy endpoints (`location`, `car_data`, `intervals`) are ALWAYS bounded by a time window.
 */
import { keepPreviousData, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import {
  isRestricted, of1, type CarData, type Driver, type Interval, type Lap, type Location, type MeetingX, type PitX,
  type Position, type RaceControlX, type SessionX, type Stint, type TeamRadio, type Weather,
} from '../lib/api'
import { iso } from '../lib/format'
import { useLive } from '../context'

const LIVE_TTL = 3_000
const DONE_TTL = 30 * 60_000
const POLL_MS = 5_000

/** OpenF1 throttles hard (429): retry a few times with backoff, but not on 401/403 (paid real time). */
const retry = {
  retry: (count: number, err: Error) => !isRestricted(err) && count < 4,
  retryDelay: (attempt: number) => Math.min(20_000, 2_000 * 2 ** attempt),
}

export function useSessionsOfYear(year: number) {
  return useQuery({
    ...retry,
    queryKey: ['live', 'sessions', year],
    queryFn: () => of1<SessionX>('sessions', { year }, 10 * 60_000),
    staleTime: 10 * 60_000,
  })
}

export function useMeetingsOfYear(year: number) {
  return useQuery({
    ...retry,
    queryKey: ['live', 'meetings', year],
    queryFn: () => of1<MeetingX>('meetings', { year }, 60 * 60_000),
    staleTime: 60 * 60_000,
  })
}

export function useDrivers(sessionKey: number | undefined, polling: boolean) {
  return useQuery({
    ...retry,
    queryKey: ['live', 'drivers', sessionKey],
    queryFn: () => of1<Driver>('drivers', { session_key: sessionKey }, polling ? 60_000 : DONE_TTL),
    enabled: sessionKey != null,
    staleTime: polling ? 60_000 : Infinity,
    refetchInterval: polling ? 60_000 : false,
  })
}

/** Whole-session series (small enough: laps ≈ 600 KB for a race, the others < 100 KB). */
function useSeries<T>(endpoint: string, sessionKey: number, polling: boolean) {
  return useQuery({
    ...retry,
    queryKey: ['live', endpoint, sessionKey],
    queryFn: () => of1<T>(endpoint, { session_key: sessionKey }, polling ? LIVE_TTL : DONE_TTL),
    staleTime: polling ? 0 : Infinity,
    refetchInterval: polling ? POLL_MS : false,
  })
}

/** Laps are also needed before the context exists (to compute the session range). */
export function useLapsRaw(sessionKey: number | undefined, polling: boolean) {
  return useQuery({
    ...retry,
    queryKey: ['live', 'laps', sessionKey],
    queryFn: () => of1<Lap>('laps', { session_key: sessionKey }, polling ? LIVE_TTL : DONE_TTL),
    enabled: sessionKey != null,
    staleTime: polling ? 0 : Infinity,
    refetchInterval: polling ? POLL_MS : false,
  })
}

export function useLaps() {
  const { session, polling } = useLive()
  return useLapsRaw(session.session_key, polling)
}
export const usePositions = () => { const c = useLive(); return useSeries<Position>('position', c.session.session_key, c.polling) }
export const useStints = () => { const c = useLive(); return useSeries<Stint>('stints', c.session.session_key, c.polling) }
export const usePits = () => { const c = useLive(); return useSeries<PitX>('pit', c.session.session_key, c.polling) }
export const useRaceControl = () => { const c = useLive(); return useSeries<RaceControlX>('race_control', c.session.session_key, c.polling) }
export const useWeather = () => { const c = useLive(); return useSeries<Weather>('weather', c.session.session_key, c.polling) }
export const useTeamRadio = () => { const c = useLive(); return useSeries<TeamRadio>('team_radio', c.session.session_key, c.polling) }

/**
 * Intervals around time t (race only). Bucketed per minute: window [b − 2 min, b + 1 min]
 * always contains at least 2 minutes of history before t (≈ 90 KB instead of 4 MB for the session).
 */
export function useIntervalsAt(t: number, enabled: boolean) {
  const { session, polling } = useLive()
  const b = Math.floor(t / 60_000) * 60_000
  return useQuery({
    ...retry,
    queryKey: ['live', 'intervals', session.session_key, b],
    queryFn: () =>
      of1<Interval>('intervals', {
        session_key: session.session_key, 'date>': iso(b - 120_000), 'date<': iso(b + 60_000),
      }, polling ? LIVE_TTL : DONE_TTL),
    enabled,
    staleTime: polling ? 0 : Infinity,
    refetchInterval: polling ? POLL_MS : false,
    placeholderData: keepPreviousData,
  })
}

export const LOCATION_WINDOW = 20_000

/** Bucket used by the map: 20 s windows; at high replay speed the buckets are spaced out (sampling). */
export function locationBucket(t: number, speed: number) {
  const step = LOCATION_WINDOW * Math.max(1, speed / 5)
  return Math.floor(t / step) * step
}

function fetchLocations(sessionKey: number, b: number, ttl: number) {
  return of1<Location>('location', {
    session_key: sessionKey, 'date>': iso(b - 4_000), 'date<': iso(b + LOCATION_WINDOW),
  }, ttl)
}

/** Car positions on track for the window containing t (all drivers, ≈ 250 KB per window). */
export function useLocationsAt(t: number, speed: number, enabled: boolean) {
  const { session, polling } = useLive()
  const qc = useQueryClient()
  const b = locationBucket(t, speed)
  const ttl = polling ? LIVE_TTL : DONE_TTL
  const q = useQuery({
    ...retry,
    queryKey: ['live', 'location', session.session_key, b],
    queryFn: () => fetchLocations(session.session_key, b, ttl),
    enabled,
    staleTime: polling ? 0 : Infinity,
    refetchInterval: polling ? POLL_MS : false,
    placeholderData: keepPreviousData,
  })
  // Prefetch the next window so that replay does not stall.
  useEffect(() => {
    if (!enabled || polling) return
    const next = locationBucket(b + LOCATION_WINDOW * Math.max(1, speed / 5), speed)
    qc.prefetchQuery({
      queryKey: ['live', 'location', session.session_key, next],
      queryFn: () => fetchLocations(session.session_key, next, ttl),
      staleTime: Infinity,
    })
  }, [b, enabled, polling, qc, session.session_key, speed, ttl])
  return q
}

/** x/y points of one lap of one driver: used to draw the circuit outline. */
export function useLapLocations(lap: Lap | undefined) {
  const { session } = useLive()
  const start = lap?.date_start ? Date.parse(lap.date_start) : NaN
  const end = start + (lap?.lap_duration ?? 0) * 1000
  return useQuery({
    ...retry,
    queryKey: ['live', 'outline', session.session_key, lap?.driver_number, lap?.lap_number],
    queryFn: () => of1<Location>('location', {
      session_key: session.session_key, driver_number: lap!.driver_number,
      'date>': iso(start), 'date<': iso(end),
    }, DONE_TTL),
    enabled: !!lap && Number.isFinite(start) && end > start,
    staleTime: Infinity,
  })
}

/** Telemetry of one lap, bounded by the lap dates. */
export function useCarData(lap: Lap | undefined) {
  const { session } = useLive()
  const start = lap?.date_start ? Date.parse(lap.date_start) : NaN
  const end = start + (lap?.lap_duration ?? 0) * 1000
  return useQuery({
    ...retry,
    queryKey: ['live', 'car_data', session.session_key, lap?.driver_number, lap?.lap_number],
    queryFn: () => of1<CarData>('car_data', {
      session_key: session.session_key, driver_number: lap!.driver_number,
      'date>': iso(start), 'date<': iso(end),
    }, DONE_TTL),
    enabled: !!lap && Number.isFinite(start) && end > start,
    staleTime: Infinity,
  })
}

export interface RadioTranscripts {
  session_key: number; model: string; generated_at: string
  items: Record<string, { text: string; lang: string }>
}

/**
 * Whisper transcripts produced by the "Transcribe team radios" GitHub Action
 * (public/data/live/radio/<session_key>.json). Missing file → null (not transcribed yet).
 */
export function useRadioTranscripts() {
  const { session, polling } = useLive()
  return useQuery({
    queryKey: ['live', 'radio-transcripts', session.session_key],
    queryFn: async (): Promise<RadioTranscripts | null> => {
      const res = await fetch(`./data/live/radio/${session.session_key}.json`)
      if (!res.ok) return null
      try { return (await res.json()) as RadioTranscripts } catch { return null }
    },
    staleTime: Infinity,
    retry: false,
    enabled: !polling,
  })
}
