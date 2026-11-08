/**
 * Pre-race prediction model — transparent, position-based.
 *
 * 1. Each driver gets an "expected finishing position" μ, a weighted blend of:
 *    - recent form   : exponentially-weighted mean finishing position over the last N races (DNFs excluded,
 *                      shrunk towards mid-field when few races are available),
 *    - grid          : starting / qualifying position, when known,
 *    - circuit       : mean finishing position of the team at this circuit in previous seasons.
 * 2. A race is simulated by adding Gaussian noise (σ positions) to μ and sorting. Rain inflates σ.
 * 3. Each driver can retire with probability p_DNF (Beta prior on the season's DNF rate, × rain factor).
 * 4. Repeated ~10 000 times (Monte Carlo) → probabilities of win / podium / points.
 */
import { mulberry32, normal, type Rng } from './stats'

export interface RaceRecord {
  round: number
  driverId: string
  constructorId: string
  position: number
  grid: number
  finished: boolean
}

export interface EntryDriver {
  driverId: string
  code: string
  name: string
  constructorId: string
  team: string
}

export interface ModelParams {
  formRaces: number
  decay: number
  sigma: number
  rainSigmaBoost: number
  rainDnfBoost: number
  weights: { form: number; grid: number; circuit: number }
  shrinkK: number
}

export const DEFAULT_PARAMS: ModelParams = {
  formRaces: 6,
  decay: 0.8,
  sigma: 2.5,
  rainSigmaBoost: 0.8,
  rainDnfBoost: 0.5,
  weights: { form: 0.5, grid: 0.7, circuit: 0.15 },
  shrinkK: 0.6,
}

export interface DriverStrength extends EntryDriver {
  formPos: number
  formRaces: number
  gridPos: number | null
  circuitPos: number | null
  expectedPos: number
  dnfProb: number
}

export interface StrengthInput {
  drivers: EntryDriver[]
  history: RaceRecord[] // races before the predicted one
  grid?: Record<string, number>
  circuitTeam?: Record<string, number>
  rainProb: number // 0..1
  params?: Partial<ModelParams>
}

/** Is a Jolpica status a classified finish? ("Finished", "+1 Lap", "Lapped"…) */
export function isFinished(status: string): boolean {
  return status === 'Finished' || status === 'Lapped' || /^\+\d+ Laps?$/.test(status)
}

export function computeStrengths(input: StrengthInput): DriverStrength[] {
  const p = { ...DEFAULT_PARAMS, ...input.params, weights: { ...DEFAULT_PARAMS.weights, ...input.params?.weights } }
  const fieldSize = Math.max(input.drivers.length, 2)
  const mid = (fieldSize + 1) / 2
  const rounds = [...new Set(input.history.map((r) => r.round))].sort((a, b) => b - a)
  const recent = new Set(rounds.slice(0, p.formRaces))
  const roundRank = new Map(rounds.map((r, i) => [r, i]))

  const base = input.drivers.map((d) => {
    const mine = input.history.filter((r) => r.driverId === d.driverId)
    let sw = 0
    let s = 0
    let n = 0
    for (const r of mine) {
      if (!recent.has(r.round) || !r.finished) continue
      const w = Math.pow(p.decay, roundRank.get(r.round) ?? 0)
      sw += w
      s += w * r.position
      n++
    }
    const formPos = sw > 0 ? (s + p.shrinkK * mid) / (sw + p.shrinkK) : NaN
    const dnfs = mine.filter((r) => !r.finished).length
    const dnfRate = (dnfs + 1) / (mine.length + 12) // Beta(1, 11) prior ≈ 8 %
    return { d, formPos, n, dnfRate }
  })

  // Drivers without history: team-mate's form + 1, else back of the midfield.
  const byTeam = new Map<string, number[]>()
  for (const b of base) if (Number.isFinite(b.formPos)) byTeam.set(b.d.constructorId, [...(byTeam.get(b.d.constructorId) ?? []), b.formPos])

  return base.map(({ d, formPos, n, dnfRate }) => {
    const team = byTeam.get(d.constructorId)
    const form = Number.isFinite(formPos) ? formPos : team?.length ? team[0] + 1 : fieldSize * 0.7
    const gridPos = input.grid?.[d.driverId] ?? null
    const circuitPos = input.circuitTeam?.[d.constructorId] ?? null
    const parts: [number, number][] = [[p.weights.form, form]]
    if (gridPos !== null) parts.push([p.weights.grid, gridPos])
    if (circuitPos !== null) parts.push([p.weights.circuit, circuitPos])
    const wSum = parts.reduce((a, [w]) => a + w, 0)
    const expectedPos = parts.reduce((a, [w, v]) => a + w * v, 0) / wSum
    const dnfProb = Math.min(0.5, dnfRate * (1 + p.rainDnfBoost * input.rainProb))
    return { ...d, formPos: form, formRaces: n, gridPos, circuitPos, expectedPos, dnfProb }
  })
}

export interface DriverOdds {
  driverId: string
  win: number
  podium: number
  points: number
  dnf: number
  meanPos: number
  /** posDist[k] = P(finishing at position k+1) */
  posDist: number[]
}

/** Simulates one race; returns driver indexes in finishing order (retired drivers last). */
export function simulateOnce(strengths: Pick<DriverStrength, 'expectedPos' | 'dnfProb'>[], sigma: number, rng: Rng): number[] {
  const scores = strengths.map((s, i) => {
    const dnf = rng() < s.dnfProb
    return { i, v: (dnf ? 1000 : 0) + s.expectedPos + sigma * normal(rng) }
  })
  scores.sort((a, b) => a.v - b.v)
  return scores.map((s) => s.i)
}

export function simulateRace(strengths: DriverStrength[], opts: { draws?: number; sigma?: number; rainProb?: number; rainSigmaBoost?: number; seed?: number } = {}): DriverOdds[] {
  const draws = opts.draws ?? 10_000
  const sigma = (opts.sigma ?? DEFAULT_PARAMS.sigma) * (1 + (opts.rainSigmaBoost ?? DEFAULT_PARAMS.rainSigmaBoost) * (opts.rainProb ?? 0))
  const rng = mulberry32(opts.seed ?? 42)
  const n = strengths.length
  const dist = strengths.map(() => new Array<number>(n).fill(0))
  const dnf = new Array<number>(n).fill(0)
  for (let k = 0; k < draws; k++) {
    // inline DNF tracking
    const scores = strengths.map((s, i) => {
      const out = rng() < s.dnfProb
      if (out) dnf[i]++
      return { i, v: (out ? 1000 : 0) + s.expectedPos + sigma * normal(rng), out }
    })
    scores.sort((a, b) => a.v - b.v)
    scores.forEach((s, pos) => {
      if (!s.out) dist[s.i][pos]++
    })
  }
  return strengths.map((s, i) => {
    const pd = dist[i].map((c) => c / draws)
    const finishP = pd.reduce((a, b) => a + b, 0)
    return {
      driverId: s.driverId,
      win: pd[0],
      podium: pd[0] + (pd[1] ?? 0) + (pd[2] ?? 0),
      points: pd.slice(0, 10).reduce((a, b) => a + b, 0),
      dnf: dnf[i] / draws,
      meanPos: finishP > 0 ? pd.reduce((a, p, k) => a + p * (k + 1), 0) / finishP : n,
      posDist: pd,
    }
  })
}

/* ---------------- Backtest ---------------- */

export interface BacktestRace {
  round: number
  winnerId: string
  predictedId: string
  predictedWinProb: number
  actualWinnerProb: number
  poleWon: boolean
  podiumHits: number // actual podium finishers among predicted top 3
  brierWin: number
}

export interface BacktestResult {
  sigma: number
  gridWeight: number
  races: BacktestRace[]
  hitRate: number
  poleBaseline: number
  meanPodiumHits: number
  brierWin: number
  brierUniform: number
}

/** Rebuilds predictions for each past round using only earlier rounds + the actual grid. */
export function backtest(history: RaceRecord[], drivers: Map<string, EntryDriver>, sigma: number, opts: { minRound?: number; draws?: number; params?: Partial<ModelParams> } = {}): BacktestResult {
  const rounds = [...new Set(history.map((r) => r.round))].sort((a, b) => a - b)
  const minRound = opts.minRound ?? 4
  const races: BacktestRace[] = []
  let brierUniform = 0
  for (const round of rounds) {
    if (round < minRound) continue
    const rows = history.filter((r) => r.round === round)
    const entries = rows.map((r) => drivers.get(r.driverId) ?? { driverId: r.driverId, code: r.driverId, name: r.driverId, constructorId: r.constructorId, team: r.constructorId })
    const grid = Object.fromEntries(rows.map((r) => [r.driverId, r.grid > 0 ? r.grid : rows.length]))
    const strengths = computeStrengths({ drivers: entries, history: history.filter((r) => r.round < round), grid, rainProb: 0, params: { ...opts.params, sigma } })
    const odds = simulateRace(strengths, { draws: opts.draws ?? 2000, sigma, seed: round })
    const winner = rows.find((r) => r.position === 1)
    if (!winner) continue
    const sorted = [...odds].sort((a, b) => b.win - a.win)
    const top3 = new Set([...odds].sort((a, b) => b.podium - a.podium).slice(0, 3).map((o) => o.driverId))
    const podium = rows.filter((r) => r.position <= 3).map((r) => r.driverId)
    const brier = odds.reduce((a, o) => a + (o.win - (o.driverId === winner.driverId ? 1 : 0)) ** 2, 0)
    const u = 1 / odds.length
    brierUniform += (odds.length - 1) * u * u + (1 - u) ** 2
    races.push({
      round,
      winnerId: winner.driverId,
      predictedId: sorted[0].driverId,
      predictedWinProb: sorted[0].win,
      actualWinnerProb: odds.find((o) => o.driverId === winner.driverId)?.win ?? 0,
      poleWon: winner.grid === 1,
      podiumHits: podium.filter((d) => top3.has(d)).length,
      brierWin: brier,
    })
  }
  const n = races.length || 1
  return {
    sigma,
    gridWeight: opts.params?.weights?.grid ?? DEFAULT_PARAMS.weights.grid,
    races,
    hitRate: races.filter((r) => r.predictedId === r.winnerId).length / n,
    poleBaseline: races.filter((r) => r.poleWon).length / n,
    meanPodiumHits: races.reduce((a, r) => a + r.podiumHits, 0) / n,
    brierWin: races.reduce((a, r) => a + r.brierWin, 0) / n,
    brierUniform: brierUniform / n,
  }
}

/**
 * Grid search on (σ, grid weight): keeps the pair with the lowest Brier score (win) over the
 * season so far. The form weight stays at 0.5 and the circuit factor is not backtested.
 * `formOnly` is the best σ when the grid is ignored (used for future races, e.g. the championship).
 */
export function calibrate(
  history: RaceRecord[],
  drivers: Map<string, EntryDriver>,
  sigmas = [1, 1.5, 2, 2.75, 3.5],
  gridWeights = [0.35, 0.7, 1, 1.5],
): { best: BacktestResult; formOnly: BacktestResult; all: BacktestResult[] } {
  const run = (g: number, s: number) => backtest(history, drivers, s, { draws: 1000, params: { weights: { ...DEFAULT_PARAMS.weights, grid: g } } })
  const pick = (xs: BacktestResult[]) => xs.reduce((a, b) => (b.races.length && b.brierWin < a.brierWin ? b : a))
  const all: BacktestResult[] = []
  for (const g of gridWeights) for (const s of sigmas) all.push(run(g, s))
  const noGrid = sigmas.map((s) => run(0, s))
  return { best: pick(all), formOnly: pick(noGrid), all }
}
