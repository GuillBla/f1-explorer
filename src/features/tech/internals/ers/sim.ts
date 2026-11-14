import { create } from 'zustand'
import { clamp, lerp } from '../store'

/**
 * ERS 2026 model. Values (uncertain ones flagged in the UI):
 * - MGU-K: 350 kW in deployment and recovery.
 * - Deployment tapers with speed (normal mode from ~290 km/h, Manual Override later) — shape approximate.
 * - Recovery capped per lap (≈ 8.5 MJ), usable battery window ≈ 4 MJ.
 */
export const P_MAX = 350 // kW
export const SOC_WINDOW = 4 // MJ
export const HARVEST_LAP_MAX = 8.5 // MJ
export const OVERRIDE_EXTRA = 0.5 // MJ

export type ErsMode = 'tour' | 'freinage' | 'acceleration' | 'override'

interface ErsUi {
  mode: ErsMode
  set: (p: Partial<Pick<ErsUi, 'mode'>>) => void
}
export const useErsUi = create<ErsUi>((set) => ({ mode: 'tour', set: (p) => set(p) }))

/** Deployment limit (kW) vs speed (km/h). Approximation of the 2026 taper. */
export function deployLimit(v: number, override: boolean) {
  const [a, b] = override ? [337, 355] : [290, 345]
  if (v <= a) return P_MAX
  return P_MAX * clamp(1 - (v - a) / (b - a), 0, 1)
}

/** A short fictitious lap (sim seconds). */
interface Seg {
  kind: 'accel' | 'brake' | 'corner' | 'recharge'
  dur: number
  v0: number
  v1: number
  label: string
  override?: boolean
}
export const LAP: Seg[] = [
  { kind: 'accel', dur: 7, v0: 110, v1: 300, label: 'Ligne droite principale' },
  { kind: 'accel', dur: 3, v0: 300, v1: 322, label: 'Fin de ligne droite (puissance électrique réduite)' },
  { kind: 'brake', dur: 2.4, v0: 322, v1: 95, label: 'Gros freinage virage 1' },
  { kind: 'corner', dur: 2.5, v0: 95, v1: 110, label: 'Virage 1' },
  { kind: 'accel', dur: 5, v0: 110, v1: 270, label: 'Ligne droite arrière (dépassement)', override: true },
  { kind: 'brake', dur: 2, v0: 270, v1: 130, label: 'Freinage virage 4' },
  { kind: 'corner', dur: 3, v0: 130, v1: 150, label: 'Enchaînement rapide' },
  { kind: 'recharge', dur: 4, v0: 150, v1: 250, label: 'Portion de recharge par le V6' },
  { kind: 'brake', dur: 1.8, v0: 250, v1: 110, label: 'Freinage dernier virage' },
  { kind: 'corner', dur: 2.2, v0: 110, v1: 110, label: 'Dernier virage' },
]
export const LAP_TIME = LAP.reduce((a, s) => a + s.dur, 0)

export const ersSim = {
  t: 0,
  lapT: 0,
  seg: LAP[0],
  speed: 200,
  /** MGU-K power, kW (+ deploy, − harvest). */
  power: 0,
  /** ICE power to the wheels, kW. */
  ice: 0,
  /** ICE power driving the MGU-K as a generator, kW. */
  iceCharge: 0,
  hydraulic: 0,
  soc: 2.6, // MJ in the window
  harvested: 0,
  deployed: 0,
  overrideActive: false,
  wheelAngle: 0,
  crankAngle: 0,
}

export function stepErs(dt: number) {
  const s = ersSim
  const mode = useErsUi.getState().mode
  s.t += dt
  let kind: Seg['kind']
  let override = false
  if (mode === 'tour') {
    s.lapT += dt
    if (s.lapT >= LAP_TIME) {
      s.lapT -= LAP_TIME
      s.harvested = 0
      s.deployed = 0
    }
    let acc = 0
    let seg = LAP[0]
    for (const x of LAP) {
      if (s.lapT < acc + x.dur) {
        seg = x
        break
      }
      acc += x.dur
    }
    s.seg = seg
    s.speed = lerp(seg.v0, seg.v1, (s.lapT - acc) / seg.dur)
    kind = seg.kind
    override = !!seg.override
  } else {
    kind = mode === 'freinage' ? 'brake' : 'accel'
    override = mode === 'override'
    // oscillate speed to stay in a meaningful range
    const target = kind === 'brake' ? 120 : 330
    s.speed += (target - s.speed) * (1 - Math.exp(-dt / 3))
    if (kind === 'brake' && s.speed < 125) s.speed = 300
    if (kind === 'accel' && s.speed > 325) s.speed = 150
    // keep some energy available in the demo modes
    if (kind === 'accel' && s.soc < 0.4) s.soc = SOC_WINDOW * 0.9
    if (kind === 'brake' && s.soc > SOC_WINDOW - 0.2) s.soc = 0.5
    if (s.harvested > HARVEST_LAP_MAX - 0.3) s.harvested = 0
    if (s.deployed > 9) s.deployed = 0
  }
  s.overrideActive = override
  s.iceCharge = 0
  s.hydraulic = 0
  if (kind === 'accel') {
    const lim = deployLimit(s.speed, override)
    s.power = s.soc > 0.05 ? lim : 0
    s.ice = 400
  } else if (kind === 'brake') {
    const room = s.soc < SOC_WINDOW && s.harvested < HARVEST_LAP_MAX
    s.power = room ? -P_MAX : 0
    s.ice = 0
    s.hydraulic = 1
  } else if (kind === 'recharge') {
    // part of the ICE power drives the MGU-K as a generator
    s.iceCharge = s.soc < SOC_WINDOW ? 200 : 0
    s.power = -s.iceCharge
    s.ice = 400 - s.iceCharge
  } else {
    s.power = s.soc > 0.3 ? 60 : 0
    s.ice = 250
  }
  const e = (s.power * dt) / 1000 // MJ
  if (e > 0) {
    s.soc = Math.max(0, s.soc - e)
    s.deployed += e
  } else {
    s.soc = Math.min(SOC_WINDOW + (override ? OVERRIDE_EXTRA : 0), s.soc - e)
    s.harvested -= e
  }
  // visual rotation (slowed): wheel at speed, crank geared
  const wheelRps = s.speed / 3.6 / (2 * Math.PI * 0.36)
  s.wheelAngle += wheelRps * 2 * Math.PI * dt * 0.08
  s.crankAngle += wheelRps * 2 * Math.PI * dt * 0.08 * 3
}
