/**
 * In-race / post-race model built on OpenF1 laps, stints and pit stops — pure functions.
 *
 * - Tyre degradation: per-compound linear regression of (fuel-corrected, driver-normalised) lap time
 *   against tyre age.
 * - Pit loss: (in-lap + out-lap) − 2 × driver's typical lap, median over all stops.
 * - Projection: each driver's remaining laps are simulated with his recent pace, his tyre's
 *   degradation, the fuel burn, and a pit stop if still needed (mandatory 2nd dry compound or
 *   tyre beyond its usable life), placed at the optimal lap.
 * - Undercut / overcut: compares the next laps of both drivers on old vs new tyres.
 */
import { linearRegression, median, clamp } from './stats'

export interface LapIn { driver_number: number; lap_number: number; lap_duration: number | null; is_pit_out_lap: boolean; date_start: string | null }
export interface StintIn { driver_number: number; stint_number: number; compound: string; lap_start: number; lap_end: number; tyre_age_at_start: number }
export interface PitIn { driver_number: number; lap_number: number; pit_duration: number | null; lane_duration?: number | null }

export const DRY = ['SOFT', 'MEDIUM', 'HARD'] as const
export const FUEL_EFFECT = 0.03 // s/lap gained as fuel burns (≈ 1.5 kg/lap × 0.02-0.035 s/kg)
export const OUTLAP_WARMUP = 0.8 // s lost on the first lap of a cold set (vs. the linear model)
export const DEFAULT_DEG: Record<string, number> = { SOFT: 0.09, MEDIUM: 0.055, HARD: 0.035, INTERMEDIATE: 0.07, WET: 0.05 }
export const DEFAULT_OFFSET: Record<string, number> = { SOFT: -0.6, MEDIUM: 0, HARD: 0.4, INTERMEDIATE: 0, WET: 0 }
/** Default usable life before the "cliff" (laps); extended by the longest stint observed. Beyond, +1 s per extra lap. */
export const MAX_STINT: Record<string, number> = { SOFT: 22, MEDIUM: 32, HARD: 44, INTERMEDIATE: 35, WET: 40 }
export const DEFAULT_PIT_LOSS = 22

export function stintAt(stints: StintIn[], driver: number, lap: number): { compound: string; age: number; stint: number } | null {
  const s = stints.find((x) => x.driver_number === driver && lap >= x.lap_start && lap <= (x.lap_end ?? lap))
    ?? stints.filter((x) => x.driver_number === driver && lap >= x.lap_start).sort((a, b) => b.stint_number - a.stint_number)[0]
  if (!s) return null
  return { compound: s.compound, age: s.tyre_age_at_start + (lap - s.lap_start) + 1, stint: s.stint_number }
}

export interface CleanLap { driver: number; lap: number; time: number; compound: string; age: number }

/** Green-flag representative laps: no lap 1, no in/out laps, within 107 % of the driver's median. */
export function cleanLaps(laps: LapIn[], stints: StintIn[], pits: PitIn[]): CleanLap[] {
  const inLaps = new Set(pits.map((p) => `${p.driver_number}-${p.lap_number}`))
  const byDriver = new Map<number, LapIn[]>()
  for (const l of laps) {
    if (l.lap_duration == null || l.lap_number <= 1 || l.is_pit_out_lap || inLaps.has(`${l.driver_number}-${l.lap_number}`)) continue
    byDriver.set(l.driver_number, [...(byDriver.get(l.driver_number) ?? []), l])
  }
  const out: CleanLap[] = []
  for (const [driver, ls] of byDriver) {
    const med = median(ls.map((l) => l.lap_duration!))
    for (const l of ls) {
      if (l.lap_duration! > med * 1.07 || l.lap_duration! < med * 0.9) continue
      const st = stintAt(stints, driver, l.lap_number)
      if (!st || st.compound === 'UNKNOWN') continue
      out.push({ driver, lap: l.lap_number, time: l.lap_duration!, compound: st.compound, age: st.age })
    }
  }
  return out
}

export interface DegModel {
  compound: string
  slope: number // s per lap of tyre age (used, ≥ 0)
  rawSlope: number
  offset: number // fresh-tyre pace relative to the driver's reference (s)
  r2: number
  n: number
  fallback: boolean
  maxAge: number // usable life (laps): max(default, longest stint observed in this session)
  points: { age: number; delta: number }[]
}

export function fitDegradation(clean: CleanLap[], fuel = FUEL_EFFECT): Record<string, DegModel> {
  // Driver reference = median fuel-corrected lap.
  const ref = new Map<number, number>()
  for (const d of new Set(clean.map((c) => c.driver))) ref.set(d, median(clean.filter((c) => c.driver === d).map((c) => c.time + fuel * c.lap)))
  const out: Record<string, DegModel> = {}
  for (const compound of new Set(clean.map((c) => c.compound))) {
    const pts = clean.filter((c) => c.compound === compound).map((c) => ({ age: c.age, delta: c.time + fuel * c.lap - ref.get(c.driver)! }))
    const fit = linearRegression(pts.map((p) => p.age), pts.map((p) => p.delta))
    const fallback = fit.n < 10
    out[compound] = {
      compound,
      rawSlope: fit.slope,
      slope: fallback ? DEFAULT_DEG[compound] ?? 0.05 : clamp(fit.slope, 0, 0.4),
      offset: fallback ? DEFAULT_OFFSET[compound] ?? 0 : fit.intercept,
      r2: fit.r2,
      n: fit.n,
      fallback,
      maxAge: Math.max(MAX_STINT[compound] ?? 35, ...clean.filter((c) => c.compound === compound).map((c) => c.age + 3)),
      points: pts.filter((_, i) => pts.length < 400 || i % Math.ceil(pts.length / 400) === 0),
    }
  }
  for (const c of DRY) if (!out[c]) out[c] = { compound: c, slope: DEFAULT_DEG[c], rawSlope: NaN, offset: DEFAULT_OFFSET[c], r2: 0, n: 0, fallback: true, maxAge: MAX_STINT[c], points: [] }
  return out
}

/** Time lost for a stop vs. staying out, from in-lap + out-lap. */
export function estimatePitLoss(laps: LapIn[], pits: PitIn[], clean: CleanLap[]): { loss: number; samples: number[] } {
  const ref = new Map<number, number>()
  for (const d of new Set(clean.map((c) => c.driver))) ref.set(d, median(clean.filter((c) => c.driver === d).map((c) => c.time)))
  const lapTime = new Map(laps.map((l) => [`${l.driver_number}-${l.lap_number}`, l.lap_duration]))
  const samples: number[] = []
  for (const p of pits) {
    const inL = lapTime.get(`${p.driver_number}-${p.lap_number}`)
    const outL = lapTime.get(`${p.driver_number}-${p.lap_number + 1}`)
    const r = ref.get(p.driver_number)
    if (inL == null || outL == null || r == null) continue
    const loss = inL + outL - 2 * r
    if (loss > 12 && loss < 45) samples.push(loss)
  }
  return { loss: samples.length >= 2 ? median(samples) : DEFAULT_PIT_LOSS, samples }
}

export interface DriverState {
  driver: number
  lapsDone: number
  elapsed: number // s since race start at the end of the last completed lap
  compound: string
  tyreAge: number
  compoundsUsed: string[]
  stops: number
  basePace: number // fuel-free, fresh-tyre-equivalent pace (s), relative to compound model
  recentLap: number
  retired: boolean
  position: number
  gapToLeader: number | null // s (null if lapped)
  lapsDown: number
}

export function raceState(laps: LapIn[], stints: StintIn[], pits: PitIn[], deg: Record<string, DegModel>, clean: CleanLap[], fuel = FUEL_EFFECT): DriverState[] {
  const starts = laps.filter((l) => l.lap_number === 1 && l.date_start).map((l) => Date.parse(l.date_start!))
  if (!starts.length) return []
  const t0 = Math.min(...starts)
  const drivers = [...new Set(laps.map((l) => l.driver_number))]
  // end time of each lap (absolute ms)
  const ends = new Map<number, Map<number, number>>()
  for (const d of drivers) {
    const ls = laps.filter((l) => l.driver_number === d).sort((a, b) => a.lap_number - b.lap_number)
    const m = new Map<number, number>()
    ls.forEach((l, i) => {
      const next = ls[i + 1]
      if (l.date_start && l.lap_duration != null) m.set(l.lap_number, Date.parse(l.date_start) + l.lap_duration * 1000)
      else if (next?.date_start && next.lap_number === l.lap_number + 1) m.set(l.lap_number, Date.parse(next.date_start))
    })
    ends.set(d, m)
  }
  const latest = Math.max(...[...ends.values()].flatMap((m) => [...m.values()]))
  const medLap = median(clean.map((c) => c.time)) || 90

  const raw = drivers.map((d) => {
    const m = ends.get(d)!
    const lapsDone = m.size ? Math.max(...m.keys()) : 0
    const endT = m.get(lapsDone) ?? t0
    const st = stintAt(stints, d, Math.max(1, lapsDone)) ?? { compound: 'UNKNOWN', age: lapsDone, stint: 1 }
    const used = [...new Set(stints.filter((s) => s.driver_number === d && s.lap_start <= Math.max(1, lapsDone)).map((s) => s.compound))]
    const mine = clean.filter((c) => c.driver === d).sort((a, b) => b.lap - a.lap).slice(0, 5)
    const model = (c: string) => deg[c] ?? { slope: DEFAULT_DEG[c] ?? 0.05, offset: DEFAULT_OFFSET[c] ?? 0 }
    const base = mine.length ? median(mine.map((c) => c.time + fuel * c.lap - model(c.compound).offset - model(c.compound).slope * c.age)) : NaN
    return {
      driver: d,
      lapsDone,
      endT,
      elapsed: (endT - t0) / 1000,
      compound: st.compound,
      tyreAge: st.age,
      compoundsUsed: used,
      stops: pits.filter((p) => p.driver_number === d && p.lap_number > 1).length,
      basePace: base,
      recentLap: mine.length ? median(mine.map((c) => c.time)) : NaN,
      retired: latest - endT > 3 * medLap * 1000,
    }
  })
  const order = [...raw].sort((a, b) => Number(a.retired) - Number(b.retired) || b.lapsDone - a.lapsDone || a.endT - b.endT)
  const leader = order[0]
  const leaderEnds = leader ? ends.get(leader.driver)! : new Map<number, number>()
  const fallbackBase = median(raw.filter((r) => Number.isFinite(r.basePace)).map((r) => r.basePace))
  return order.map((r, i) => {
    const atLap = leaderEnds.get(r.lapsDone)
    const lapsDown = leader ? leader.lapsDone - r.lapsDone : 0
    const gap = atLap != null && !r.retired ? (r.endT - atLap) / 1000 : null
    return {
      driver: r.driver,
      lapsDone: r.lapsDone,
      elapsed: r.elapsed,
      compound: r.compound,
      tyreAge: r.tyreAge,
      compoundsUsed: r.compoundsUsed,
      stops: r.stops,
      basePace: Number.isFinite(r.basePace) ? r.basePace : fallbackBase + 1,
      recentLap: r.recentLap,
      retired: r.retired,
      position: i + 1,
      gapToLeader: gap,
      lapsDown: Math.max(0, lapsDown),
    }
  })
}

/** Predicted lap time of a driver for a given lap / compound / tyre age. */
export function lapTime(basePace: number, deg: Record<string, DegModel>, compound: string, age: number, lap: number, fuel = FUEL_EFFECT): number {
  const m = deg[compound] ?? { slope: DEFAULT_DEG[compound] ?? 0.05, offset: DEFAULT_OFFSET[compound] ?? 0, maxAge: MAX_STINT[compound] ?? 35 }
  const cliff = Math.max(0, age - m.maxAge) * 1
  return basePace - fuel * lap + m.offset + m.slope * age + cliff + (age <= 1 ? OUTLAP_WARMUP : 0)
}

export interface PitPlan {
  needed: boolean
  reason: string
  bestLap: number | null
  window: [number, number] | null
  compound: string | null
  costs: { lap: number; delta: number }[]
  totalTime: number // projected time for the remaining laps (incl. stop)
}

function isWetRace(states: DriverState[]) {
  return states.filter((s) => s.compound === 'INTERMEDIATE' || s.compound === 'WET').length > states.length / 2
}

export function planPit(s: DriverState, deg: Record<string, DegModel>, totalLaps: number, pitLoss: number, wet = false): PitPlan {
  const from = s.lapsDone + 1
  const remaining = totalLaps - s.lapsDone
  const stayOut = () => {
    let t = 0
    for (let L = from; L <= totalLaps; L++) t += lapTime(s.basePace, deg, s.compound, s.tyreAge + (L - s.lapsDone), L)
    return t
  }
  const usedDry = s.compoundsUsed.filter((c) => (DRY as readonly string[]).includes(c))
  const ruleStop = !wet && new Set(usedDry).size < 2
  const lifeStop = s.tyreAge + remaining > (deg[s.compound]?.maxAge ?? MAX_STINT[s.compound] ?? 35)
  const base: PitPlan = { needed: false, reason: '', bestLap: null, window: null, compound: null, costs: [], totalTime: stayOut() }
  if (remaining <= 2 || s.retired) return base
  if (!ruleStop && !lifeStop) return { ...base, reason: 'Pneus suffisants jusqu’à l’arrivée' }

  const candidates = wet ? [s.compound] : DRY.filter((c) => !ruleStop || !usedDry.includes(c))
  let best: { lap: number; compound: string; t: number } | null = null
  const costsByLap = new Map<number, number>()
  for (const c of candidates.length ? candidates : [...DRY]) {
    for (let p = from; p < totalLaps; p++) {
      let t = pitLoss
      for (let L = from; L <= p; L++) t += lapTime(s.basePace, deg, s.compound, s.tyreAge + (L - s.lapsDone), L)
      for (let L = p + 1; L <= totalLaps; L++) t += lapTime(s.basePace, deg, c, L - p, L)
      costsByLap.set(p, Math.min(costsByLap.get(p) ?? Infinity, t))
      if (!best || t < best.t) best = { lap: p, compound: c, t }
    }
  }
  if (!best) return base
  const costs = [...costsByLap.entries()].map(([lap, t]) => ({ lap, delta: t - best!.t }))
  const inWindow = costs.filter((c) => c.delta <= 1).map((c) => c.lap)
  return {
    needed: true,
    reason: ruleStop ? 'Deuxième composé sec obligatoire' : `Pneus ${s.compound} au-delà de leur durée de vie`,
    bestLap: best.lap,
    window: [Math.min(...inWindow), Math.max(...inWindow)],
    compound: best.compound,
    costs,
    totalTime: best.t,
  }
}

export interface ProjectedDriver extends DriverState {
  plan: PitPlan
  projectedTotal: number
  projectedPosition: number
  projectedGap: number
  uncertainty: number
  delta: number // positions gained (+) / lost (−)
}

export function projectFinish(states: DriverState[], deg: Record<string, DegModel>, totalLaps: number, pitLoss: number): ProjectedDriver[] {
  const wet = isWetRace(states)
  const proj = states.map((s) => {
    const plan = planPit(s, deg, totalLaps, pitLoss, wet)
    const remaining = Math.max(0, totalLaps - s.lapsDone)
    return {
      ...s,
      plan,
      projectedTotal: s.retired ? Infinity : s.elapsed + plan.totalTime,
      uncertainty: 0.3 * Math.sqrt(remaining) + (plan.needed ? 1.5 : 0),
    }
  })
  const sorted = [...proj].sort((a, b) => a.projectedTotal - b.projectedTotal)
  const lead = sorted[0]?.projectedTotal ?? 0
  return sorted.map((p, i) => ({ ...p, projectedPosition: i + 1, projectedGap: p.projectedTotal - lead, delta: p.position - (i + 1) }))
}

/** Φ, normal CDF (Abramowitz–Stegun). */
export function normCdf(x: number): number {
  const t = 1 / (1 + 0.2316419 * Math.abs(x))
  const d = 0.3989423 * Math.exp((-x * x) / 2)
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))))
  return x > 0 ? 1 - p : p
}

export interface CutAnalysis {
  gap: number
  options: { k: number; undercutGain: number; undercutProb: number; overcutGain: number; overcutProb: number }[]
  verdict: string
}

/**
 * Chaser B is `gap` seconds behind A. Undercut: B pits now and A pits k laps later.
 * Overcut: A pits now and B stays out k more laps. Gains are positive when they favour B.
 */
export function analyseCut(a: DriverState, b: DriverState, gap: number, deg: Record<string, DegModel>, newCompound: string, sigma = 0.7): CutAnalysis {
  const options = [1, 2, 3].map((k) => {
    let under = 0
    let over = 0
    for (let j = 1; j <= k; j++) {
      const L = b.lapsDone + j
      const aOld = lapTime(a.basePace, deg, a.compound, a.tyreAge + j, L)
      const bNew = lapTime(b.basePace, deg, newCompound, j, L)
      const aNew = lapTime(a.basePace, deg, newCompound, j, L)
      const bOld = lapTime(b.basePace, deg, b.compound, b.tyreAge + j, L)
      under += aOld - bNew
      over += aNew - bOld
    }
    return {
      k,
      undercutGain: under,
      undercutProb: normCdf((under - gap) / sigma),
      overcutGain: over,
      overcutProb: normCdf((over - gap) / sigma),
    }
  })
  const best = options[0]
  const verdict =
    gap > 30 ? 'Écart trop grand : pas d’interaction stratégique directe.'
    : best.undercutProb > 0.6 ? 'Undercut très menaçant : le pilote de tête doit couvrir en rentrant au tour suivant.'
    : best.undercutProb > 0.3 ? 'Undercut possible : tout dépendra de l’arrêt et du tour de sortie.'
    : best.overcutProb > 0.4 ? 'Overcut plus intéressant : pneus peu dégradés, rester en piste rapporte davantage.'
    : 'Ni undercut ni overcut ne suffisent : position probablement conservée.'
  return { gap, options, verdict }
}
