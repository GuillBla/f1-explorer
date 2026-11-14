import { create } from 'zustand'

/* ------------------------------------------------------------------ */
/* Settings                                                            */
/* ------------------------------------------------------------------ */

export type SteerMode = 'auto' | 'manuel'

export type ControlId = 'ecran' | 'palettes' | 'embrayage' | 'aero' | 'override' | 'radio' | 'limiteur' | 'neutre' | 'diff' | 'freinage' | 'moteur' | 'recharge'

interface SteerSettings {
  mode: SteerMode
  /** Steering wheel angle in manual mode, degrees (+ = right). */
  wheelDeg: number
  focus: ControlId | null
  set: (p: Partial<Omit<SteerSettings, 'set'>>) => void
}

export const useSteerStore = create<SteerSettings>((set) => ({
  mode: 'auto',
  wheelDeg: 0,
  focus: null,
  set: (p) => set(p),
}))

/* ------------------------------------------------------------------ */
/* Geometry (mm). Top view: X to the right, Z rearwards (driver side).  */
/* ------------------------------------------------------------------ */

/** Pinion: 14 teeth, module 2.5 mm (illustrative). */
export const PINION_Z = 14
export const MODULE = 2.5
export const PINION_R = (PINION_Z * MODULE) / 2
/** Max steering wheel angle used by the animation, degrees — uncertain. */
export const LOCK_DEG = 110
export const WHEELBASE = 3.4
export const KINGPIN_X = 620
export const RACK_Z = 110
export const RACK_HALF = 235
/** Steering arm, from the kingpin to the tie-rod joint (inboard and rearwards: Ackermann). */
export const ARM: [number, number] = [-26, 105]

type P2 = [number, number]
const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1])

/** Arm end (x, z) of the side (+1 right, -1 left) for an upright yaw `d` (rad, rotation about +Y). */
export function armEnd(side: 1 | -1, d: number): P2 {
  const ax = ARM[0] * side
  const az = ARM[1]
  // rotation about +Y: x' = x cos + z sin ; z' = -x sin + z cos
  return [side * KINGPIN_X + ax * Math.cos(d) + az * Math.sin(d), -ax * Math.sin(d) + az * Math.cos(d)]
}

export const innerJoint = (side: 1 | -1, rack: number): P2 => [side * RACK_HALF + rack, RACK_Z]

const TIE = dist(innerJoint(1, 0), armEnd(1, 0))

/** Upright yaw keeping the tie-rod length constant (bisection). */
export function solveYaw(side: 1 | -1, rack: number): number {
  const t = innerJoint(side, rack)
  const f = (d: number) => dist(armEnd(side, d), t) - TIE
  let a = -0.8
  let b = 0.8
  let fa = f(a)
  if (fa * f(b) > 0) return 0
  for (let i = 0; i < 40; i++) {
    const m = (a + b) / 2
    const fm = f(m)
    if (fa * fm <= 0) b = m
    else {
      a = m
      fa = fm
    }
  }
  return (a + b) / 2
}

export const sim = {
  t: 0,
  /** Steering wheel angle, degrees (+ = right). */
  wheelDeg: 0,
  /** Rack displacement, mm (+ = towards +X). */
  rack: 0,
  /** Upright yaw, rad, left and right. */
  yawL: 0,
  yawR: 0,
}

function update() {
  // steering wheel turned right -> pinion turns clockwise seen from the driver -> rack moves to -X
  sim.rack = (-sim.wheelDeg * Math.PI * PINION_R) / 180
  sim.yawL = solveYaw(-1, sim.rack)
  sim.yawR = solveYaw(1, sim.rack)
}
update()

export function step(dt: number) {
  const st = useSteerStore.getState()
  sim.t += dt
  if (st.mode === 'auto') {
    // chicane then hairpin, ~8 s loop
    const p = (sim.t % 8) / 8
    const target =
      p < 0.5 ? 55 * Math.sin(p * 4 * Math.PI) : p < 0.85 ? LOCK_DEG * Math.sin(((p - 0.5) / 0.35) * Math.PI) : 0
    sim.wheelDeg += (target - sim.wheelDeg) * Math.min(1, dt * 6)
  } else {
    sim.wheelDeg += (st.wheelDeg - sim.wheelDeg) * Math.min(1, dt * 10)
  }
  update()
}

/** Road wheel steer angles in degrees (+ = towards the right), and derived turn radius. */
export function steerAngles() {
  // yaw about +Y: positive turns the front of the wheel (-Z) towards -X (left)
  const l = (-sim.yawL * 180) / Math.PI
  const r = (-sim.yawR * 180) / Math.PI
  const mean = (l + r) / 2
  const radius = Math.abs(mean) > 0.3 ? WHEELBASE / Math.tan((Math.abs(mean) * Math.PI) / 180) : Infinity
  return { l, r, mean, radius }
}
