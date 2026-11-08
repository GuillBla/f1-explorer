/**
 * Championship simulation: plays the remaining Grands Prix (and sprints) many times with the
 * same race model as the pre-race prediction (form-based expected position + noise + DNF),
 * adds points to the current standings and counts titles.
 */
import { mulberry32, quantile } from './stats'
import { simulateOnce, type DriverStrength } from './racePrediction'

export const RACE_POINTS = [25, 18, 15, 12, 10, 8, 6, 4, 2, 1]
export const SPRINT_POINTS = [8, 7, 6, 5, 4, 3, 2, 1]

export interface StandingInput {
  driverId: string
  points: number
  wins: number
}

export interface ChampionshipOdds {
  driverId: string
  points: number
  maxPoints: number
  eliminated: boolean
  title: number
  /** posDist[k] = P(final championship position k+1) */
  posDist: number[]
  p10: number
  p50: number
  p90: number
}

export interface ChampionshipInput {
  standings: StandingInput[]
  /** Strengths of drivers still racing (missing drivers keep their points but score nothing). */
  strengths: DriverStrength[]
  races: number
  sprints: number
  sigma: number
  draws?: number
  seed?: number
}

export function maxRemainingPoints(races: number, sprints: number) {
  return races * RACE_POINTS[0] + sprints * SPRINT_POINTS[0]
}

export function simulateChampionship(input: ChampionshipInput): ChampionshipOdds[] {
  const draws = input.draws ?? 10_000
  const rng = mulberry32(input.seed ?? 7)
  const ids = input.standings.map((s) => s.driverId)
  const n = ids.length
  const idx = new Map(ids.map((id, i) => [id, i]))
  const racing = input.strengths.filter((s) => idx.has(s.driverId))
  const racingIdx = racing.map((s) => idx.get(s.driverId)!)
  const titles = new Array<number>(n).fill(0)
  const posDist = ids.map(() => new Array<number>(n).fill(0))
  const finals = ids.map(() => [] as number[])
  const maxRem = maxRemainingPoints(input.races, input.sprints)
  const leader = Math.max(...input.standings.map((s) => s.points))

  const pts = new Float64Array(n)
  const wins = new Float64Array(n)
  for (let k = 0; k < draws; k++) {
    input.standings.forEach((s, i) => {
      pts[i] = s.points
      wins[i] = s.wins
    })
    for (let r = 0; r < input.races; r++) {
      const order = simulateOnce(racing, input.sigma, rng)
      order.forEach((ri, pos) => {
        const di = racingIdx[ri]
        if (pos < RACE_POINTS.length) pts[di] += RACE_POINTS[pos]
        if (pos === 0) wins[di]++
      })
    }
    for (let r = 0; r < input.sprints; r++) {
      const order = simulateOnce(racing, input.sigma * 1.1, rng)
      order.forEach((ri, pos) => {
        if (pos < SPRINT_POINTS.length) pts[racingIdx[ri]] += SPRINT_POINTS[pos]
      })
    }
    // Rank: points, then wins, then random tie-break.
    const rank = ids.map((_, i) => ({ i, key: pts[i] * 1000 + wins[i] + rng() * 0.1 }))
    rank.sort((a, b) => b.key - a.key)
    rank.forEach((r, pos) => {
      posDist[r.i][pos]++
      if (pos === 0) titles[r.i]++
    })
    for (let i = 0; i < n; i++) finals[i].push(pts[i])
  }
  return input.standings.map((s, i) => {
    const f = finals[i].sort((a, b) => a - b)
    return {
      driverId: s.driverId,
      points: s.points,
      maxPoints: s.points + maxRem,
      eliminated: s.points + maxRem < leader,
      title: titles[i] / draws,
      posDist: posDist[i].map((c) => c / draws),
      p10: quantile(f, 0.1),
      p50: quantile(f, 0.5),
      p90: quantile(f, 0.9),
    }
  })
}
