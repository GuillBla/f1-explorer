/**
 * Jolpica-F1 client (Ergast-compatible successor) — https://github.com/jolpica/jolpica-f1
 * Coverage: 1950 → today. Limit max 100 per page; use `offset` for pagination.
 */
import { fetchJson } from './http'

const BASE = 'https://api.jolpi.ca/ergast/f1'

export interface MRData<T> { MRData: { total: string; limit: string; offset: string } & T }

export interface JCircuit {
  circuitId: string; circuitName: string; url: string
  Location: { lat: string; long: string; locality: string; country: string }
}
export interface JDriver {
  driverId: string; permanentNumber?: string; code?: string; givenName: string; familyName: string
  dateOfBirth: string; nationality: string; url: string
}
export interface JConstructor { constructorId: string; name: string; nationality: string; url: string }
export interface JResult {
  number: string; position: string; positionText: string; points: string; grid: string; laps: string; status: string
  Driver: JDriver; Constructor: JConstructor; Time?: { time: string; millis: string }
  FastestLap?: { rank: string; lap: string; Time: { time: string } }
}
export interface JRace {
  season: string; round: string; raceName: string; date: string; time?: string; url: string; Circuit: JCircuit
  Results?: JResult[]; QualifyingResults?: unknown[]
  FirstPractice?: { date: string; time?: string }; SecondPractice?: { date: string; time?: string }
  ThirdPractice?: { date: string; time?: string }; Qualifying?: { date: string; time?: string }
  Sprint?: { date: string; time?: string }; SprintQualifying?: { date: string; time?: string }
}
export interface JDriverStanding { position: string; points: string; wins: string; Driver: JDriver; Constructors: JConstructor[] }
export interface JConstructorStanding { position: string; points: string; wins: string; Constructor: JConstructor }

const DAY = 86_400_000

/** path example: "2024/results", "current", "drivers/hamilton/results" */
export function jolpica<T>(path: string, params: { limit?: number; offset?: number } = {}, ttlMs = DAY) {
  const search = new URLSearchParams()
  if (params.limit) search.set('limit', String(params.limit))
  if (params.offset) search.set('offset', String(params.offset))
  const q = search.toString()
  return fetchJson<MRData<T>>(`${BASE}/${path}.json${q ? `?${q}` : ''}`, { ttlMs }).then((r) => r.MRData)
}

export const ergast = {
  schedule: (season: string | number = 'current') =>
    jolpica<{ RaceTable: { Races: JRace[] } }>(`${season}`, { limit: 100 }, 3_600_000).then((d) => d.RaceTable.Races),
  results: (season: string | number, round: string | number) =>
    jolpica<{ RaceTable: { Races: JRace[] } }>(`${season}/${round}/results`, { limit: 100 }).then((d) => d.RaceTable.Races[0]),
  driverStandings: (season: string | number = 'current') =>
    jolpica<{ StandingsTable: { StandingsLists: { DriverStandings: JDriverStanding[] }[] } }>(`${season}/driverstandings`, { limit: 100 }, 3_600_000)
      .then((d) => d.StandingsTable.StandingsLists[0]?.DriverStandings ?? []),
  constructorStandings: (season: string | number = 'current') =>
    jolpica<{ StandingsTable: { StandingsLists: { ConstructorStandings: JConstructorStanding[] }[] } }>(`${season}/constructorstandings`, { limit: 100 }, 3_600_000)
      .then((d) => d.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []),
  circuits: () =>
    jolpica<{ CircuitTable: { Circuits: JCircuit[] } }>('circuits', { limit: 100 }).then((d) => d.CircuitTable.Circuits),
  circuitResults: (circuitId: string, offset = 0) =>
    jolpica<{ RaceTable: { Races: JRace[] } }>(`circuits/${circuitId}/results/1`, { limit: 100, offset }).then((d) => d.RaceTable.Races),
}
