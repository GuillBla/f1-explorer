import { create } from 'zustand'
import { clamp } from '../store'

/**
 * Simplified turbo dynamics (no MGU-H): the turbine speed follows the exhaust energy with an inertia
 * lag; boost ∝ speed²; the wastegate bypasses exhaust gas when the boost target is reached.
 * All constants are illustrative.
 */
export const N_MAX = 125_000 // tr/min (limit 2014-2025; 2026 value uncertain)
export const BOOST_TARGET = 4.8 // bar abs (2026 cap, uncertain)

export type TurboScenario = 'manuel' | 'relance'

interface TurboUi {
  throttle: number
  scenario: TurboScenario
  antiLag: boolean
  mgukFill: boolean
  set: (p: Partial<Pick<TurboUi, 'throttle' | 'scenario' | 'antiLag' | 'mgukFill'>>) => void
}

export const useTurboUi = create<TurboUi>((set) => ({ throttle: 1, scenario: 'relance', antiLag: false, mgukFill: true, set: (p) => set(p) }))

export const HIST = 240
export const turboSim = {
  t: 0,
  /** Scenario clock (s). */
  ts: 0,
  throttle: 1,
  n: 0.85 * N_MAX,
  boost: 4.5,
  wastegate: 0,
  /** Torque delivered by the ICE vs demanded (0..1). */
  iceTorque: 1,
  mguk: 0,
  angle: 0,
  history: [] as { boost: number; throttle: number; mguk: number; ice: number }[],
  histAcc: 0,
}

const boostOf = (n: number) => 1 + 4.2 * Math.pow(n / N_MAX, 2)

export function stepTurbo(dt: number) {
  const ui = useTurboUi.getState()
  const s = turboSim
  s.t += dt
  if (ui.scenario === 'relance') {
    // 4 s cycle: 1.5 s lift-off (corner), then full throttle
    s.ts = (s.ts + dt) % 4.5
    s.throttle = s.ts < 1.5 ? 0 : 1
  } else s.throttle = ui.throttle
  const thr = s.throttle
  // exhaust energy available: closed throttle -> very little, unless anti-lag keeps gas flowing
  const idle = ui.antiLag ? 0.62 : 0.28
  const nTarget = N_MAX * (idle + (1.02 - idle) * thr)
  const tau = nTarget > s.n ? 0.55 : 1.4 // spool-up vs coast-down (s)
  s.n += (nTarget - s.n) * (1 - Math.exp(-dt / tau))
  // wastegate regulates the boost to the target
  const raw = boostOf(s.n)
  s.wastegate = clamp((raw - (BOOST_TARGET - 0.25)) / 0.5, 0, 1) * (thr > 0.5 ? 1 : 0.2)
  if (raw > BOOST_TARGET) s.n = Math.min(s.n, N_MAX * Math.sqrt((BOOST_TARGET - 1) / 4.2) * 1.01)
  s.boost = Math.min(BOOST_TARGET, boostOf(s.n))
  // ICE torque follows the air mass (boost); the MGU-K can fill the hole
  const needed = thr
  s.iceTorque = thr * clamp((s.boost - 1) / (BOOST_TARGET - 1), 0, 1)
  s.mguk = ui.mgukFill ? clamp(needed - s.iceTorque, 0, 0.6) : 0
  s.histAcc += dt
  while (s.histAcc > 0.025) {
    s.histAcc -= 0.025
    s.history.push({ boost: s.boost, throttle: thr, mguk: s.mguk, ice: s.iceTorque })
    if (s.history.length > HIST) s.history.shift()
  }
}

/** Visual wheel rotation: strongly slowed down, proportional to the real speed. */
export function advanceTurboVisual(dtReal: number) {
  turboSim.angle += dtReal * Math.PI * 2 * 2.2 * (turboSim.n / N_MAX)
}
