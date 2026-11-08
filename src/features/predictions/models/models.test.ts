import { describe, expect, it } from 'vitest'
import { linearRegression, mulberry32, normal } from './stats'
import { enrichHour, irradiance, projectSession, reliabilityFor, sessionAlerts, solarElevation, trackTemperature, weekendSessions, type HourPoint } from './weather'
import { computeStrengths, isFinished, simulateRace, backtest, type RaceRecord, type EntryDriver } from './racePrediction'
import { simulateChampionship } from './championship'
import { analyseCut, cleanLaps, estimatePitLoss, fitDegradation, planPit, projectFinish, raceState, type LapIn, type PitIn, type StintIn } from './raceProjection'

const H = 3_600_000

describe('stats', () => {
  it('fits a line exactly', () => {
    const f = linearRegression([0, 1, 2, 3], [1, 3, 5, 7])
    expect(f.slope).toBeCloseTo(2)
    expect(f.intercept).toBeCloseTo(1)
    expect(f.r2).toBeCloseTo(1)
  })
  it('normal samples have ~0 mean and ~1 sd', () => {
    const rng = mulberry32(1)
    const xs = Array.from({ length: 20000 }, () => normal(rng))
    const m = xs.reduce((a, b) => a + b, 0) / xs.length
    const sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / xs.length)
    expect(Math.abs(m)).toBeLessThan(0.03)
    expect(sd).toBeCloseTo(1, 1)
  })
})

describe('weather', () => {
  it('sun is high at noon on the equator at the equinox and below horizon at midnight', () => {
    expect(solarElevation(0, 0, Date.UTC(2026, 2, 20, 12))).toBeGreaterThan(80)
    expect(solarElevation(0, 0, Date.UTC(2026, 2, 20, 0))).toBeLessThan(0)
  })
  it('clouds reduce irradiance, track is warmer in the sun and close to air when wet', () => {
    expect(irradiance(60, 100)).toBeLessThan(irradiance(60, 0) * 0.3)
    expect(trackTemperature(25, 900, 5, 0)).toBeGreaterThan(40)
    expect(trackTemperature(25, 900, 5, 2)).toBe(26)
    expect(trackTemperature(25, 0, 5, 0)).toBeCloseTo(26.5)
  })
  it('builds sprint weekends and reliability levels', () => {
    const s = weekendSessions({ date: '2026-03-15', time: '07:00:00Z', FirstPractice: { date: '2026-03-13', time: '03:30:00Z' }, SprintQualifying: { date: '2026-03-13', time: '07:30:00Z' }, Sprint: { date: '2026-03-14', time: '03:00:00Z' }, Qualifying: { date: '2026-03-14', time: '07:00:00Z' } })
    expect(s.map((x) => x.key)).toEqual(['FP1', 'SQ', 'SPRINT', 'Q', 'RACE'])
    expect(reliabilityFor(2 * 24 * H, true)).toBe('haute')
    expect(reliabilityFor(10 * 24 * H, true)).toBe('tendance')
    expect(reliabilityFor(1, false)).toBe('indisponible')
  })
  it('raises rain + changing-conditions alerts, capped to info beyond 7 days', () => {
    const start = Date.UTC(2026, 5, 1, 13)
    const mk = (i: number, p: number, mm: number): HourPoint => ({ time: start + i * H, temp: 20, precipProb: p, precip: mm, wind: 10, gust: 20, cloud: 80, code: 61 })
    const hours = [mk(0, 10, 0), mk(1, 80, 2.5)].map((h) => enrichHour(h, 45, 7))
    const session = { key: 'RACE' as const, label: 'Course', start, end: start + 2 * H }
    const near = sessionAlerts(projectSession(session, hours, start - 24 * H))
    expect(near.find((a) => a.kind === 'pluie')?.level).toBe('alerte')
    expect(near.find((a) => a.kind === 'changement')?.level).toBe('alerte')
    const far = sessionAlerts(projectSession(session, hours, start - 10 * 24 * H))
    expect(far.every((a) => a.level === 'info' && a.trend)).toBe(true)
  })
})

const teams = ['a', 'a', 'b', 'b', 'c', 'c']
const drivers: EntryDriver[] = teams.map((t, i) => ({ driverId: `d${i}`, code: `D${i}`, name: `Driver ${i}`, constructorId: t, team: t }))
function history(rounds: number): RaceRecord[] {
  const out: RaceRecord[] = []
  for (let r = 1; r <= rounds; r++) drivers.forEach((d, i) => out.push({ round: r, driverId: d.driverId, constructorId: d.constructorId, position: i + 1, grid: i + 1, finished: true }))
  return out
}

describe('race prediction', () => {
  it('recognises classified statuses', () => {
    expect(isFinished('Finished')).toBe(true)
    expect(isFinished('+1 Lap')).toBe(true)
    expect(isFinished('Engine')).toBe(false)
  })
  it('orders strengths by form and produces coherent probabilities', () => {
    const s = computeStrengths({ drivers, history: history(5), rainProb: 0 })
    expect(s[0].expectedPos).toBeLessThan(s[5].expectedPos)
    const odds = simulateRace(s, { draws: 4000, sigma: 2 })
    expect(odds.reduce((a, o) => a + o.win, 0)).toBeCloseTo(1 - 0, 0)
    expect(odds[0].win).toBeGreaterThan(odds[5].win)
    for (const o of odds) expect(o.podium).toBeGreaterThanOrEqual(o.win)
  })
  it('rain spreads the probabilities', () => {
    const s = computeStrengths({ drivers, history: history(5), rainProb: 0 })
    const dry = simulateRace(s, { draws: 4000, sigma: 2, rainProb: 0 })
    const wet = simulateRace(s, { draws: 4000, sigma: 2, rainProb: 1 })
    expect(wet[0].win).toBeLessThan(dry[0].win)
  })
  it('backtests on a deterministic season', () => {
    const bt = backtest(history(8), new Map(drivers.map((d) => [d.driverId, d])), 2, { draws: 500 })
    expect(bt.races.length).toBe(5)
    expect(bt.hitRate).toBe(1)
    expect(bt.brierWin).toBeLessThan(bt.brierUniform)
  })
})

describe('championship', () => {
  it('flags eliminated drivers and sums title odds to 1', () => {
    const s = computeStrengths({ drivers, history: history(5), rainProb: 0 })
    const standings = drivers.map((d, i) => ({ driverId: d.driverId, points: 200 - i * 40, wins: 5 - i }))
    const odds = simulateChampionship({ standings, strengths: s, races: 2, sprints: 0, sigma: 3, draws: 3000 })
    expect(odds.reduce((a, o) => a + o.title, 0)).toBeCloseTo(1, 5)
    expect(odds[5].eliminated).toBe(true)
    expect(odds[5].title).toBe(0)
    expect(odds[0].title).toBeGreaterThan(0.5)
  })
})

describe('race projection', () => {
  // Two drivers, 20 laps done of a 40-lap race. Driver 1 on SOFT (deg 0.1 s/lap), driver 2 on HARD (0.03).
  const t0 = Date.UTC(2026, 0, 1, 14)
  const laps: LapIn[] = []
  const stints: StintIn[] = [
    { driver_number: 1, stint_number: 1, compound: 'SOFT', lap_start: 1, lap_end: 20, tyre_age_at_start: 0 },
    { driver_number: 2, stint_number: 1, compound: 'HARD', lap_start: 1, lap_end: 20, tyre_age_at_start: 0 },
  ]
  const pits: PitIn[] = []
  for (const d of [1, 2]) {
    let t = t0 + (d - 1) * 2000
    for (let lap = 1; lap <= 20; lap++) {
      const dur = 90 - 0.03 * lap + (d === 1 ? 0.1 * lap : 0.4 + 0.03 * lap) + (lap === 1 ? 5 : 0)
      laps.push({ driver_number: d, lap_number: lap, lap_duration: dur, is_pit_out_lap: lap === 1, date_start: new Date(t).toISOString() })
      t += dur * 1000
    }
  }
  const clean = cleanLaps(laps, stints, pits)
  it('recovers the degradation slope per compound', () => {
    const deg = fitDegradation(clean)
    expect(deg.SOFT.slope).toBeCloseTo(0.1, 1)
    expect(deg.HARD.slope).toBeCloseTo(0.03, 1)
    expect(deg.MEDIUM.fallback).toBe(true)
  })
  it('computes state, pit plan and projection', () => {
    const deg = fitDegradation(clean)
    const st = raceState(laps, stints, pits, deg, clean)
    expect(st[0].elapsed).toBeLessThan(st[1].elapsed) // soft degraded more: driver 2 leads
    expect(st[0].lapsDone).toBe(20)
    const { loss } = estimatePitLoss(laps, pits, clean)
    expect(loss).toBe(22)
    const soft = st.find((s) => s.driver === 1)!
    const plan = planPit(soft, deg, 40, loss)
    expect(plan.needed).toBe(true)
    expect(plan.bestLap).toBeGreaterThan(20)
    expect(plan.window![0]).toBeLessThanOrEqual(plan.bestLap!)
    const proj = projectFinish(st, deg, 40, loss)
    expect(proj).toHaveLength(2)
    const cut = analyseCut(st[0], st[1], st[1].gapToLeader ?? 0, deg, 'MEDIUM')
    expect(cut.options).toHaveLength(3)
  })
})
