import { create } from 'zustand'
import { clamp, smooth } from '../store'

/* ------------------------------------------------------------------ */
/* Layout and ratios (mm, plausible values: real ones are confidential) */
/* ------------------------------------------------------------------ */

/** Gear pairs, index 0 = 1st gear. a = teeth on the primary (input) shaft, b = on the secondary (output). Constant sum (60) → same centre distance. */
export const GEARS = [
  { a: 14, b: 46 },
  { a: 17, b: 43 },
  { a: 19, b: 41 },
  { a: 21, b: 39 },
  { a: 23, b: 37 },
  { a: 25, b: 35 },
  { a: 26, b: 34 },
  { a: 27, b: 33 },
]
export const MODULE = 3
/** Distance between the two shafts = m (a+b) / 2. */
export const CENTER = (MODULE * 60) / 2
/**
 * Dog ring serving each gear. Consecutive gears are always on different rings: this is what makes
 * a "seamless" shift possible (the next gear engages before the previous one is released).
 */
export const RING_OF = [0, 1, 0, 1, 2, 3, 2, 3]
/** Side of the gear relative to its ring (-1 = towards the clutch / -z). */
export const SIDE_OF = [-1, -1, 1, 1, -1, -1, 1, 1]
export const RING_Z = [-120, -40, 40, 120]
export const RING_NAMES = ['A', 'B', 'C', 'D']
export const GEAR_GAP = 20
export const gearZ = (g: number) => RING_Z[RING_OF[g]] + SIDE_OF[g] * GEAR_GAP
/** Axial travel of a dog ring, mm. */
export const TRAVEL = 7
/** Barrel rotation per gear, degrees (N + 8 gears). */
export const STEP_DEG = 36
/** Final drive (bevel pinion / crown wheel). */
export const FINAL = { pinion: 10, crown: 40, module: 3.5 }
/** Wheel radius (m), 18" rims, 2026 tyres ≈ 0,72 m diameter (approx.). */
export const WHEEL_R = 0.36
/** Simulated time for one full gear step of the barrel (s). Uncertain: "a few ms" to a few tens of ms. */
export const SHIFT_TIME = 0.04
export const ratio = (g: number) => GEARS[g].a / GEARS[g].b

/** Normalised axial offset (-1..1) of each dog ring for a (continuous) barrel position 0 (N) .. 8. */
export function ringOffsets(pos: number, out: number[] = [0, 0, 0, 0]) {
  out.fill(0)
  const p = clamp(pos, 0, 8)
  const a = Math.floor(p + 1e-9)
  const t = p - a
  if (t < 1e-6 || a >= 8) {
    if (a > 0) out[RING_OF[a - 1]] = SIDE_OF[a - 1]
    return out
  }
  const b = a + 1
  // groove shape: the next ring starts moving first, the previous one is released later → overlap
  const eNew = smooth(t / 0.6)
  const eOld = 1 - smooth((t - 0.4) / 0.6)
  if (a > 0) out[RING_OF[a - 1]] += SIDE_OF[a - 1] * eOld
  out[RING_OF[b - 1]] += SIDE_OF[b - 1] * eNew
  return out
}

export const ENGAGE = 0.7

/** Gears (0-based) whose dogs are engaged at this barrel position. */
export function engagedGears(pos: number) {
  const off = ringOffsets(pos)
  const res: number[] = []
  for (let g = 0; g < 8; g++) if (off[RING_OF[g]] * SIDE_OF[g] > ENGAGE) res.push(g)
  return res
}

/* ------------------------------------------------------------------ */
/* UI store + mutable simulation                                       */
/* ------------------------------------------------------------------ */

export type GbMode = 'auto' | 'manuel'

interface GbState {
  mode: GbMode
  /** Engine speed requested in manual mode (rpm). */
  rpm: number
  corner: boolean
  message: string | null
  set: (p: Partial<Pick<GbState, 'mode' | 'rpm' | 'corner' | 'message'>>) => void
}

export const useGearboxStore = create<GbState>((set) => ({
  mode: 'auto',
  rpm: 10500,
  corner: false,
  message: null,
  set: (p) => set(p),
}))

const RPM2RAD = (2 * Math.PI) / 60
export const RPM_UP = 11800
export const RPM_DOWN = 8200

export const sim = {
  /** Primary (input) shaft angle and speed (rad, rad/s). */
  thetaP: 0,
  wP: 9000 * RPM2RAD,
  /** Secondary (output) shaft angle and speed. */
  thetaS: 0,
  wS: 9000 * RPM2RAD * ratio(0),
  /** Barrel position 0 (N) .. 8 and target. */
  pos: 1,
  target: 1,
  /** Gear before the current shift (1-based, 0 = N). */
  from: 1,
  phase: 'accel' as 'accel' | 'brake',
  /** Differential: relative rotation of the side gears (rad). */
  diff: 0,
  /** Engine speed just before / after the last shift (rpm). */
  lastDrop: null as null | { from: number; to: number; up: boolean },
  /** Time spent with two gears engaged during the last shift (s). */
  overlap: 0,
}

export const rpmOf = (w: number) => w / RPM2RAD
export const shifting = () => Math.abs(sim.pos - sim.target) > 1e-6
export const currentGear = () => Math.round(sim.pos)

/** Requests a shift (1-based gear, 0 = N). Returns an error message if refused. */
export function requestShift(dir: 1 | -1): string | null {
  if (shifting()) return null
  const g = sim.target + dir
  if (g < 0 || g > 8) return null
  if (g > 0) {
    // over-rev protection on downshifts
    const rpm = rpmOf(sim.wS / ratio(g - 1))
    if (dir < 0 && rpm > 15000) return `Rétrogradage refusé : le moteur passerait à ${Math.round(rpm).toLocaleString('fr-FR')} tr/min (limite 15 000).`
  }
  const to = g > 0 ? rpmOf(sim.wS / ratio(g - 1)) : 4000
  sim.lastDrop = { from: rpmOf(sim.wP), to, up: dir > 0 }
  sim.from = sim.target
  sim.target = g
  sim.overlap = 0
  if (g > 0 && useGearboxStore.getState().mode === 'manuel') useGearboxStore.getState().set({ rpm: Math.round(to / 50) * 50 })
  return null
}

const HOLD = 0.22

export function step(dt: number) {
  const st = useGearboxStore.getState()
  // barrel
  if (shifting()) {
    const d = dt / SHIFT_TIME
    sim.pos = sim.target > sim.pos ? Math.min(sim.target, sim.pos + d) : Math.max(sim.target, sim.pos - d)
    if (engagedGears(sim.pos).length > 1) sim.overlap += dt
  }
  const eng = engagedGears(sim.pos)
  // gear that drives: the engaged one closest to the target
  let drive = -1
  for (const g of eng) if (drive < 0 || Math.abs(g + 1 - sim.target) < Math.abs(drive + 1 - sim.target)) drive = g

  if (st.mode === 'auto') {
    if (!shifting()) {
      const g = sim.target
      if (sim.phase === 'accel') {
        if (g === 0) requestShift(1)
        else {
          // in-gear acceleration, compressed in time (≈ HOLD s per gear)
          sim.wS += (ratio(g - 1) * (RPM_UP - 8500) * RPM2RAD * dt) / HOLD
          if (rpmOf(sim.wP) >= RPM_UP) {
            if (g < 8) requestShift(1)
            else sim.phase = 'brake'
          }
        }
      } else {
        sim.wS -= (ratio(Math.max(0, g - 1)) * (12000 - RPM_DOWN) * RPM2RAD * dt) / (HOLD * 0.8)
        if (rpmOf(sim.wP) <= RPM_DOWN) {
          if (g > 1) requestShift(-1)
          else sim.phase = 'accel'
        }
      }
    }
  } else if (!shifting() && drive >= 0) {
    sim.wS = st.rpm * RPM2RAD * ratio(drive)
  }
  sim.wS = Math.max(0, sim.wS)

  // engine speed: imposed by the driving gear (fast dog engagement), otherwise free
  if (drive >= 0) {
    const target = sim.wS / ratio(drive)
    sim.wP += (target - sim.wP) * (1 - Math.exp(-dt / 0.004))
  } else {
    sim.wP += (4000 * RPM2RAD - sim.wP) * (1 - Math.exp(-dt / 0.2))
  }

  sim.thetaP += sim.wP * dt
  sim.thetaS += sim.wS * dt
  const wCage = sim.wS * (FINAL.pinion / FINAL.crown)
  if (st.corner) sim.diff += wCage * 0.12 * dt
}

/** Car speed (km/h) from the output shaft speed. Approximate (wheel radius). */
export const carSpeed = () => (sim.wS * (FINAL.pinion / FINAL.crown) * WHEEL_R * 3.6)
