/** Data access for the predictions module (local extensions of the shared API clients). */
import { ergast, fetchJson, jolpica, type JDriverStanding, type JRace, type JResult, type Lap, type Stint, type Pit, type Driver, type Session } from '@/lib/api'
import type { HourPoint } from '../models/weather'
import { isFinished, type EntryDriver, type RaceRecord } from '../models/racePrediction'

/* ---------------- Weather (16-day horizon, Open-Meteo) ---------------- */

interface OMHourly {
  time: string[]
  temperature_2m: number[]
  precipitation_probability: (number | null)[]
  precipitation: (number | null)[]
  wind_speed_10m: number[]
  wind_gusts_10m: number[]
  cloud_cover: number[]
  weather_code: number[]
}

export async function forecast16(lat: number, lon: number): Promise<HourPoint[]> {
  const hourly = 'temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,cloud_cover,weather_code'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourly}&forecast_days=16&timezone=UTC`
  const r = await fetchJson<{ hourly: OMHourly }>(url, { ttlMs: 900_000 })
  const h = r.hourly
  return h.time.map((t, i) => ({
    time: Date.parse(`${t}:00Z`),
    temp: h.temperature_2m[i],
    precipProb: h.precipitation_probability[i] ?? 0,
    precip: h.precipitation[i] ?? 0,
    wind: h.wind_speed_10m[i],
    gust: h.wind_gusts_10m[i],
    cloud: h.cloud_cover[i],
    code: h.weather_code[i],
  })).filter((p) => Number.isFinite(p.temp))
}

/* ---------------- Jolpica ---------------- */

export const schedule = (season: string | number = 'current') => ergast.schedule(season)

export interface SeasonData {
  races: JRace[]
  records: RaceRecord[]
  drivers: Map<string, EntryDriver>
}

export function driverName(d: JResult['Driver']) {
  return `${d.givenName} ${d.familyName}`
}
export function driverCode(d: JResult['Driver']) {
  return d.code ?? d.familyName.slice(0, 3).toUpperCase()
}

export function toEntry(r: Pick<JResult, 'Driver' | 'Constructor'>): EntryDriver {
  return { driverId: r.Driver.driverId, code: driverCode(r.Driver), name: driverName(r.Driver), constructorId: r.Constructor.constructorId, team: r.Constructor.name }
}

/** All race results of a season (paginated: Jolpica pages by result rows, max 100). */
export async function seasonResults(season: string | number = 'current'): Promise<SeasonData> {
  const byRound = new Map<string, JRace>()
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const d = await jolpica<{ RaceTable: { Races: JRace[] } }>(`${season}/results`, { limit: 100, offset }, 1_800_000)
    total = Number(d.total)
    for (const race of d.RaceTable.Races) {
      const prev = byRound.get(race.round)
      byRound.set(race.round, prev ? { ...prev, Results: [...(prev.Results ?? []), ...(race.Results ?? [])] } : race)
    }
    offset += 100
    if (!d.RaceTable.Races.length) break
  }
  const races = [...byRound.values()].sort((a, b) => Number(a.round) - Number(b.round))
  const records: RaceRecord[] = []
  const drivers = new Map<string, EntryDriver>()
  for (const race of races) {
    for (const r of race.Results ?? []) {
      drivers.set(r.Driver.driverId, toEntry(r))
      records.push({
        round: Number(race.round),
        driverId: r.Driver.driverId,
        constructorId: r.Constructor.constructorId,
        position: Number(r.position),
        grid: Number(r.grid),
        finished: isFinished(r.status),
      })
    }
  }
  return { races, records, drivers }
}

interface QualiRow { position: string; Driver: JResult['Driver']; Constructor: JResult['Constructor'] }

export async function qualifying(season: string | number, round: string | number) {
  const d = await jolpica<{ RaceTable: { Races: (JRace & { QualifyingResults?: QualiRow[] })[] } }>(`${season}/${round}/qualifying`, { limit: 100 }, 600_000)
  return (d.RaceTable.Races[0]?.QualifyingResults ?? []) as QualiRow[]
}

/** Constructor id aliases across rebrands, so that circuit history follows the team. */
const TEAM_ALIAS: Record<string, string> = { sauber: 'audi', alfa: 'audi', alphatauri: 'rb', toro_rosso: 'rb', racing_point: 'aston_martin', renault: 'alpine' }

/** Mean finishing position of each team at a circuit over the previous `years` seasons. */
export async function teamCircuitHistory(circuitId: string, season: number, years = 3): Promise<{ avg: Record<string, number>; seasons: number[] }> {
  const acc = new Map<string, number[]>()
  const seasons: number[] = []
  for (let y = season - 1; y >= season - years; y--) {
    try {
      const d = await jolpica<{ RaceTable: { Races: JRace[] } }>(`${y}/circuits/${circuitId}/results`, { limit: 100 })
      const race = d.RaceTable.Races[0]
      if (!race?.Results?.length) continue
      seasons.push(y)
      for (const r of race.Results) {
        const id = TEAM_ALIAS[r.Constructor.constructorId] ?? r.Constructor.constructorId
        acc.set(id, [...(acc.get(id) ?? []), Number(r.position)])
      }
    } catch {
      /* missing season: ignore */
    }
  }
  return { avg: Object.fromEntries([...acc].map(([k, v]) => [k, v.reduce((a, b) => a + b, 0) / v.length])), seasons }
}

/* ---------------- OpenF1 ---------------- */

const OF1 = 'https://api.openf1.org/v1'

/**
 * OpenF1 sometimes answers 429 without CORS headers: the browser then reports a network error
 * (TypeError) that `fetchJson` cannot recognise as a 429. Retry those with a back-off.
 */
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await fn()
    } catch (e) {
      if (!(e instanceof TypeError) || i >= attempts - 1) throw e
      await new Promise((r) => setTimeout(r, 1500 * (i + 1)))
    }
  }
}

export async function raceSessions(year: number): Promise<Session[]> {
  const all = await withRetry(() => fetchJson<(Session & { is_cancelled?: boolean })[]>(`${OF1}/sessions?year=${year}&session_type=Race`, { ttlMs: 600_000 }))
  return all.filter((s) => !s.is_cancelled && Date.parse(s.date_start) < Date.now()).sort((a, b) => Date.parse(b.date_start) - Date.parse(a.date_start))
}

export interface SessionBundle { laps: Lap[]; stints: Stint[]; pits: (Pit & { lane_duration?: number | null })[]; drivers: Driver[] }

export async function sessionBundle(sessionKey: number, live: boolean): Promise<SessionBundle> {
  const ttlMs = live ? 8_000 : 3_600_000
  const get = <T>(e: string) => withRetry(() => fetchJson<T[]>(`${OF1}/${e}?session_key=${sessionKey}`, { ttlMs }))
  const laps = await get<Lap>('laps')
  const stints = await get<Stint>('stints')
  const pits = await get<Pit & { lane_duration?: number | null }>('pit')
  const drivers = await withRetry(() => fetchJson<Driver[]>(`${OF1}/drivers?session_key=${sessionKey}`, { ttlMs: 3_600_000 }))
  return { laps, stints, pits, drivers }
}

/** Scheduled race distance (laps) by OpenF1 circuit short name. Sprints ≈ 100 km. */
export const RACE_LAPS: Record<string, number> = {
  Melbourne: 58, Shanghai: 56, Suzuka: 53, Sakhir: 57, Jeddah: 50, Miami: 57, Montreal: 70, 'Monte Carlo': 78,
  Catalunya: 66, Spielberg: 71, Silverstone: 52, 'Spa-Francorchamps': 44, Hungaroring: 70, Zandvoort: 72, Monza: 53,
  Madring: 57, Baku: 51, 'Kuala Lumpur': 56, Singapore: 62, Austin: 56, 'Mexico City': 71, Interlagos: 71,
  'Las Vegas': 50, Lusail: 57, 'Yas Marina Circuit': 58, Imola: 63,
}

export function scheduledLaps(session: Session, maxLapSeen: number, finished: boolean): number {
  if (finished && maxLapSeen > 0) return maxLapSeen
  const race = RACE_LAPS[session.circuit_short_name]
  const planned = race ? (session.session_name === 'Sprint' ? Math.round((race * 100) / 305) : race) : 0
  return Math.max(planned, maxLapSeen)
}

/** Driver standings with the round they refer to (needed to know which races remain). */
export async function driverStandingsWithRound(season: string | number = 'current') {
  const d = await jolpica<{ StandingsTable: { StandingsLists: { round: string; season: string; DriverStandings: JDriverStanding[] }[] } }>(`${season}/driverstandings`, { limit: 100 }, 1_800_000)
  const list = d.StandingsTable.StandingsLists[0]
  return { round: Number(list?.round ?? 0), season: list?.season ?? String(season), standings: list?.DriverStandings ?? [] }
}
