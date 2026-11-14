import { create } from 'zustand'
import { DEG } from '../store'

/**
 * Exact slider-crank kinematics of a 90° V6 with a 3-throw crankshaft (pins at 120°, two side-by-side
 * rods per pin). Units: millimetres and crank degrees.
 *
 * Firing order 1-4-2-5-3-6 with uneven intervals 90° / 150° (consequence of a 90° V with shared
 * pins). Bank A (cylinders 1-3) is on the left (−x), bank B (4-6) on the right (+x).
 */
export const BORE = 80
export const STROKE = 53
export const R = STROKE / 2
/** Connecting rod length (centre to centre). Not published: plausible value. */
export const ROD = 110
/** Bore spacing along the crank. Not published: plausible value. */
export const PITCH = 106
/** Pin centre to crown top (compression height). */
export const COMP_H = 24
/** Cylinder head deck (from the crank axis, along the bore axis). */
export const DECK = R + ROD + COMP_H + 1.5
/** Lateral offset of the two rods sharing a pin. */
export const ROD_OFFSET = 11
export const BANK_HALF = 45

export interface Cyl {
  /** 1..6 */
  n: number
  bank: 'A' | 'B'
  /** Bore axis angle from vertical (deg, + towards +x). */
  axis: number
  /** Throw index 0..2 */
  throw: number
  /** Crank angle (0..720) of the firing TDC. */
  fire: number
  /** z of the bore axis (mm). */
  z: number
}

const FIRE_A = [0, 240, 480]
export const PIN_Z = [-PITCH, 0, PITCH]
/** Angular position of each crank pin at θ = 0 (deg), derived from the firing order. */
export const PIN_PHASE = FIRE_A.map((f) => -BANK_HALF - f)

export const CYLS: Cyl[] = [0, 1, 2].flatMap((k) => [
  { n: k + 1, bank: 'A' as const, axis: -BANK_HALF, throw: k, fire: FIRE_A[k], z: PIN_Z[k] - ROD_OFFSET },
  { n: k + 4, bank: 'B' as const, axis: BANK_HALF, throw: k, fire: FIRE_A[k] + 90, z: PIN_Z[k] + ROD_OFFSET },
]).sort((a, b) => a.n - b.n)

export const FIRING_ORDER = [...CYLS].sort((a, b) => a.fire - b.fire).map((c) => c.n)

/** Phase of a cylinder in its 4-stroke cycle (0 = firing TDC), degrees 0..720. */
export function cylPhase(theta: number, c: Cyl) {
  return (((theta - c.fire) % 720) + 720) % 720
}

/**
 * Slider-crank: angle β between the crank pin and the bore axis →
 * piston pin height y = r cos β + √(L² − r² sin² β) and pin position (x, y) in the bore frame.
 */
export function slider(theta: number, c: Cyl) {
  const gamma = theta + PIN_PHASE[c.throw]
  const beta = (gamma - c.axis) * DEG
  const sx = R * Math.sin(beta)
  const sy = R * Math.cos(beta)
  const y = sy + Math.sqrt(ROD * ROD - sx * sx)
  return { pinX: sx, pinY: sy, y, rodAngle: Math.atan2(sx, y - sy) }
}

export type Stroke = 'detente' | 'echappement' | 'admission' | 'compression'

export function strokeOf(phase: number): Stroke {
  if (phase < 180) return 'detente'
  if (phase < 360) return 'echappement'
  if (phase < 540) return 'admission'
  return 'compression'
}

export const STROKE_LABEL: Record<Stroke, string> = {
  admission: 'Admission',
  compression: 'Compression',
  detente: 'Combustion · détente',
  echappement: 'Échappement',
}

/** CSS colour tokens of each stroke (UI) and their 3D equivalent. */
export const STROKE_TOKEN: Record<Stroke, string> = {
  admission: 'var(--color-info)',
  compression: 'var(--color-accent)',
  detente: 'var(--color-f1)',
  echappement: 'var(--color-warn)',
}

/* Valve timing (crank degrees from firing TDC). Plausible values, real ones are confidential. */
export const VALVE = {
  exhaust: { open: 130, close: 385, lift: 11 },
  intake: { open: 335, close: 610, lift: 12 },
}

/** Valve lift (mm) at a cycle phase, cos² lobe profile. */
export function valveLift(phase: number, v: { open: number; close: number; lift: number }) {
  const dur = v.close - v.open
  let p = phase - v.open
  if (p < 0) p += 720
  if (p > dur) return 0
  const x = (p / dur) * 2 - 1 // −1..1
  const c = Math.cos((x * Math.PI) / 2)
  return v.lift * c * c
}

/** Spark (pre-chamber) at 18° BTDC. */
export const SPARK = 702

/** 0..1 combustion light intensity (pre-chamber then main chamber). */
export function combustion(phase: number) {
  const p = phase >= SPARK ? phase - 720 : phase // −18..
  if (p < -18 || p > 90) return { pre: 0, jets: 0, main: 0 }
  const pre = p < 4 ? Math.exp(-Math.pow((p + 12) / 7, 2)) : 0
  const jets = Math.max(0, Math.exp(-Math.pow((p + 4) / 7, 2)))
  const main = p < -4 ? 0 : Math.exp(-(p + 4) / 32) * Math.min(1, (p + 4) / 8)
  return { pre, jets, main }
}

/* ------------------------------------------------------------------ */
/* Simulation state                                                    */
/* ------------------------------------------------------------------ */

export const RPM_MIN = 4000
export const RPM_MAX = 15000

export type EngineView = 'dessus' | 'face'

interface EngineUi {
  rpm: number
  /** Cylinder followed by the explanation panel. */
  focus: number
  /** Cut-away: along the banks seen from above, or transverse section seen from the front. */
  view: EngineView
  set: (p: Partial<Pick<EngineUi, 'rpm' | 'focus' | 'view'>>) => void
}

export const useEngineUi = create<EngineUi>((set) => ({ rpm: 10500, focus: 3, view: 'face', set: (p) => set(p) }))

/** Mutable state advanced by the shell loop and read by the scene / panel. */
export const engineSim = { theta: 690, rpm: 10500 }

export function stepEngine(dt: number) {
  const rpm = useEngineUi.getState().rpm
  engineSim.rpm = rpm
  engineSim.theta = (engineSim.theta + (rpm / 60) * 360 * dt) % 720
}

export function nudgeEngine() {
  engineSim.theta = (engineSim.theta + 10) % 720
}
