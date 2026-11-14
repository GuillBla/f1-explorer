/**
 * OpenF1 client — https://openf1.org/  (historical data free, CORS enabled)
 * Real-time data during live sessions requires a paid OpenF1 account; without it the
 * latest session becomes available shortly after it ends. Modules must handle both.
 */
import { fetchJson, qs } from './http'

const BASE = 'https://api.openf1.org/v1'
type Params = Record<string, string | number | boolean | undefined | null>

function get<T>(endpoint: string, params: Params = {}, ttlMs?: number) {
  return fetchJson<T[]>(`${BASE}/${endpoint}${qs(params)}`, { ttlMs })
}

export interface Meeting {
  meeting_key: number; meeting_name: string; meeting_official_name: string
  country_name: string; country_code: string; circuit_key: number; circuit_short_name: string
  location: string; date_start: string; year: number; gmt_offset: string
}
export interface Session {
  session_key: number; meeting_key: number; session_name: string; session_type: string
  date_start: string; date_end: string; circuit_short_name: string; country_name: string
  location: string; year: number; gmt_offset: string
}
export interface Driver {
  driver_number: number; broadcast_name: string; full_name: string; name_acronym: string
  team_name: string; team_colour: string; headshot_url: string | null; country_code: string | null
  session_key: number
}
export interface Lap {
  driver_number: number; lap_number: number; lap_duration: number | null
  duration_sector_1: number | null; duration_sector_2: number | null; duration_sector_3: number | null
  i1_speed: number | null; i2_speed: number | null; st_speed: number | null
  is_pit_out_lap: boolean; date_start: string | null; segments_sector_1?: number[]
}
export interface Position { driver_number: number; position: number; date: string }
export interface Interval { driver_number: number; gap_to_leader: number | string | null; interval: number | string | null; date: string }
export interface Stint {
  driver_number: number; stint_number: number; compound: string
  lap_start: number; lap_end: number; tyre_age_at_start: number
}
export interface Pit { driver_number: number; lap_number: number; pit_duration: number | null; date: string }
export interface Location { driver_number: number; x: number; y: number; z: number; date: string }
export interface CarData {
  driver_number: number; speed: number; rpm: number; n_gear: number
  throttle: number; brake: number; drs: number; date: string
}
export interface Weather {
  air_temperature: number; track_temperature: number; humidity: number; pressure: number
  rainfall: number; wind_direction: number; wind_speed: number; date: string
}
export interface RaceControl { category: string; flag: string | null; message: string; lap_number: number | null; date: string; driver_number: number | null }
export interface TeamRadio { driver_number: number; recording_url: string; date: string }

export const openf1 = {
  meetings: (p: Params = {}) => get<Meeting>('meetings', p, 3_600_000),
  sessions: (p: Params = {}) => get<Session>('sessions', p, 600_000),
  drivers: (session_key: number | 'latest') => get<Driver>('drivers', { session_key }, 3_600_000),
  laps: (p: Params) => get<Lap>('laps', p),
  position: (p: Params) => get<Position>('position', p),
  intervals: (p: Params) => get<Interval>('intervals', p),
  stints: (p: Params) => get<Stint>('stints', p),
  pit: (p: Params) => get<Pit>('pit', p),
  location: (p: Params) => get<Location>('location', p),
  carData: (p: Params) => get<CarData>('car_data', p),
  weather: (p: Params) => get<Weather>('weather', p),
  raceControl: (p: Params) => get<RaceControl>('race_control', p),
  teamRadio: (p: Params) => get<TeamRadio>('team_radio', p),
}

export const TYRE_COLORS: Record<string, string> = {
  SOFT: '#ff3333', MEDIUM: '#ffd700', HARD: 'var(--color-tyre-hard)', INTERMEDIATE: '#39b54a', WET: '#0072c6',
}
