import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ergast, fetchJson, jolpica, type JConstructorStanding, type JDriverStanding } from '@/lib/api'
import type { ChampionsData, CircuitPolesData, SeasonChampions } from '../data/types'
import { staticUrl } from '../lib/format'

type StandingsResp<K extends string, T> = {
  StandingsTable: { season: string; StandingsLists: ({ season: string; round: string } & Record<K, T[]>)[] }
}

/** Saison en cours, rafraîchie à la volée depuis Jolpica (3 appels). */
async function fetchLiveSeason(): Promise<{ season: SeasonChampions; drivers: ChampionsData['drivers'] }> {
  const [ds, cs, schedule] = await Promise.all([
    jolpica<StandingsResp<'DriverStandings', JDriverStanding>>('current/driverstandings', { limit: 3 }, 600_000),
    jolpica<StandingsResp<'ConstructorStandings', JConstructorStanding>>('current/constructorstandings', { limit: 3 }, 600_000),
    ergast.schedule('current'),
  ])
  const dl = ds.StandingsTable.StandingsLists[0]
  const cl = cs.StandingsTable.StandingsLists[0]
  const year = Number(ds.StandingsTable.season ?? dl?.season)
  const round = Number(dl?.round ?? 0)
  const drivers: ChampionsData['drivers'] = {}
  const season: SeasonChampions = {
    year,
    rounds: round,
    inProgress: round < schedule.length,
    drivers: (dl?.DriverStandings ?? []).map((s) => {
      drivers[s.Driver.driverId] = {
        name: `${s.Driver.givenName} ${s.Driver.familyName}`,
        nat: s.Driver.nationality,
        dob: s.Driver.dateOfBirth,
        code: s.Driver.code,
      }
      return {
        id: s.Driver.driverId,
        team: s.Constructors.map((c) => c.name).join(' / '),
        teamId: s.Constructors[0]?.constructorId ?? '',
        points: Number(s.points),
        wins: Number(s.wins),
      }
    }),
    constructors: (cl?.ConstructorStandings ?? []).map((s) => ({
      id: s.Constructor.constructorId,
      name: s.Constructor.name,
      nat: s.Constructor.nationality,
      points: Number(s.points),
      wins: Number(s.wins),
    })),
  }
  return { season, drivers }
}

/**
 * Champions de 1950 à aujourd'hui : JSON statique généré par scripts/build-champions.mjs,
 * complété par la saison en cours lue en direct (si l'API répond).
 */
export function useChampions() {
  const base = useQuery({
    queryKey: ['history', 'champions-static'],
    queryFn: () => fetchJson<ChampionsData>(staticUrl('data/history/champions.json'), { ttlMs: Infinity }),
    staleTime: Infinity,
  })
  const live = useQuery({
    queryKey: ['history', 'champions-live'],
    queryFn: fetchLiveSeason,
    enabled: !!base.data,
    staleTime: 600_000,
    retry: 1,
  })

  const data = useMemo<ChampionsData | undefined>(() => {
    if (!base.data) return undefined
    const l = live.data
    if (!l || !l.season.drivers.length) return base.data
    const others = base.data.champions.filter((c) => c.year !== l.season.year)
    if (l.season.year < base.data.currentYear) return base.data
    return {
      ...base.data,
      currentYear: Math.max(base.data.currentYear, l.season.year),
      champions: [...others, l.season].sort((a, b) => a.year - b.year),
      drivers: { ...base.data.drivers, ...l.drivers },
    }
  }, [base.data, live.data])

  return { data, isLoading: base.isLoading, error: base.error, refetch: base.refetch, liveError: live.error, liveLoading: live.isLoading }
}

export function useCircuitPoles() {
  return useQuery({
    queryKey: ['history', 'circuit-poles'],
    queryFn: () => fetchJson<CircuitPolesData>(staticUrl('data/history/circuit-poles.json'), { ttlMs: Infinity }),
    staleTime: Infinity,
  })
}

/** Saisons terminées uniquement (titres attribués). */
export const completedSeasons = (d: ChampionsData) => d.champions.filter((c) => !c.inProgress && c.drivers.length)
