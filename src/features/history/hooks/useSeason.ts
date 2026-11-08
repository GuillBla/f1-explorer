import { useQuery } from '@tanstack/react-query'
import { ergast, jolpica, type JConstructorStanding, type JDriverStanding, type JRace, type JResult } from '@/lib/api'

type RacesResp = { RaceTable: { Races: (JRace & { SprintResults?: JResult[] })[] } }

/** Récupère toutes les pages d'un endpoint de résultats en fusionnant les courses coupées entre deux pages. */
async function fetchAllResults(path: string, key: 'Results' | 'SprintResults') {
  const races: (JRace & { SprintResults?: JResult[] })[] = []
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const d = await jolpica<RacesResp>(path, { limit: 100, offset })
    total = Number(d.total)
    for (const r of d.RaceTable.Races) {
      const last = races[races.length - 1]
      if (last && last.round === r.round) last[key] = [...(last[key] ?? []), ...(r[key] ?? [])]
      else races.push(r)
    }
    offset += 100
    if (offset > 2000) break
  }
  return races
}

export interface SeasonRace {
  round: number
  name: string
  date: string
  circuit: string
  locality: string
  country: string
  winner?: { id: string; name: string; team: string }
  pole?: { id: string; name: string }
  hasSprint: boolean
}

export interface SeasonData {
  year: number
  races: SeasonRace[]
  completedRounds: number
  driverStandings: JDriverStanding[]
  constructorStandings: JConstructorStanding[]
  /** Points cumulés par manche (top 10 du classement final / actuel). */
  progression: { round: number; label: string; [driverId: string]: number | string }[]
  top10: { id: string; name: string; code: string }[]
}

const short = (r: JResult) => `${r.Driver.givenName} ${r.Driver.familyName}`

async function fetchSeason(year: number): Promise<SeasonData> {
  const isRecent = year >= 2021
  const [schedule, results, sprints, ds, cs] = await Promise.all([
    ergast.schedule(year),
    fetchAllResults(`${year}/results`, 'Results'),
    isRecent ? fetchAllResults(`${year}/sprint`, 'SprintResults') : Promise.resolve([]),
    ergast.driverStandings(year),
    year >= 1958 ? ergast.constructorStandings(year) : Promise.resolve([]),
  ])

  const byRound = new Map(results.map((r) => [Number(r.round), r]))
  const sprintByRound = new Map(sprints.map((r) => [Number(r.round), r]))

  const races: SeasonRace[] = schedule.map((r) => {
    const res = byRound.get(Number(r.round))?.Results ?? []
    const win = res.find((x) => x.position === '1')
    const pole = res.find((x) => x.grid === '1')
    return {
      round: Number(r.round),
      name: r.raceName,
      date: r.date,
      circuit: r.Circuit.circuitName,
      locality: r.Circuit.Location.locality,
      country: r.Circuit.Location.country,
      winner: win ? { id: win.Driver.driverId, name: short(win), team: win.Constructor.name } : undefined,
      pole: pole ? { id: pole.Driver.driverId, name: short(pole) } : undefined,
      hasSprint: !!r.Sprint || sprintByRound.has(Number(r.round)),
    }
  })

  const top10 = ds.slice(0, 10).map((s) => ({
    id: s.Driver.driverId,
    name: `${s.Driver.givenName} ${s.Driver.familyName}`,
    code: s.Driver.code ?? s.Driver.familyName.slice(0, 3).toUpperCase(),
  }))
  const ids = new Set(top10.map((t) => t.id))
  const totals: Record<string, number> = Object.fromEntries(top10.map((t) => [t.id, 0]))
  const progression: SeasonData['progression'] = []
  const rounds = [...byRound.keys()].sort((a, b) => a - b)
  for (const round of rounds) {
    for (const res of byRound.get(round)?.Results ?? []) {
      if (ids.has(res.Driver.driverId)) totals[res.Driver.driverId] += Number(res.points)
    }
    for (const res of sprintByRound.get(round)?.SprintResults ?? []) {
      if (ids.has(res.Driver.driverId)) totals[res.Driver.driverId] += Number(res.points)
    }
    const race = races.find((r) => r.round === round)
    progression.push({
      round,
      label: race ? race.locality : `M${round}`,
      ...Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, Math.round(v * 100) / 100])),
    })
  }

  return {
    year,
    races,
    completedRounds: rounds.length,
    driverStandings: ds,
    constructorStandings: cs,
    progression,
    top10,
  }
}

export function useSeason(year: number) {
  return useQuery({
    queryKey: ['history', 'season', year],
    queryFn: () => fetchSeason(year),
    enabled: Number.isFinite(year) && year >= 1950,
    staleTime: 3_600_000,
  })
}
