import { create } from 'zustand'

/* ------------------------------------------------------------------ */
/* UI settings                                                         */
/* ------------------------------------------------------------------ */

export type SuspLayout = 'push' | 'pull'
export type RoadProfile = 'bosse' | 'vibreur'

interface SuspSettings {
  layout: SuspLayout
  profile: RoadProfile
  /** Bump height, mm. */
  bumpMm: number
  /** Car speed, km/h. */
  speedKmh: number
  inerter: boolean
  set: (p: Partial<Omit<SuspSettings, 'set'>>) => void
}

export const useSuspStore = create<SuspSettings>((set) => ({
  layout: 'push',
  profile: 'bosse',
  bumpMm: 25,
  speedKmh: 180,
  inerter: true,
  set: (p) => set(p),
}))

/* ------------------------------------------------------------------ */
/* Quarter-car model (illustrative values, not team data)              */
/* ------------------------------------------------------------------ */

/** Sprung mass carried by one front corner, kg (≈ 800 kg car incl. driver / 4, rounded). */
export const MS = 190
/** Unsprung mass of a corner (wheel, tyre, upright, brake, half the arms), kg — uncertain. */
export const MU = 35
/** Wheel rate (spring rate seen at the wheel), N/m — uncertain, F1 cars are very stiff. */
export const KS = 160_000
/** Tyre vertical stiffness, N/m — uncertain. */
export const KT = 300_000
/** Damping at the wheel, N·s/m. */
export const C = 6_500
/** Inertance seen at the wheel, kg — purely illustrative. */
export const B = 90

/** Bump spacing on the road, m. */
const PERIOD = 9

/** Road height (m) at road coordinate xi (m). */
export function road(xi: number, profile: RoadProfile, hMm: number): number {
  const h = hMm / 1000
  const x = ((xi % PERIOD) + PERIOD) % PERIOD
  if (profile === 'bosse') {
    const w = 0.7
    return x < w ? h * Math.sin((Math.PI * x) / w) ** 2 : 0
  }
  // kerb: a run of saw-tooth ribs (8 ribs of 0.2 m)
  const w = 1.6
  if (x >= w) return 0
  const k = (x % 0.2) / 0.2
  const rib = k < 0.6 ? k / 0.6 : (1 - k) / 0.4
  const env = Math.min(1, x / 0.15, (w - x) / 0.15)
  return h * rib * env
}

export const sim = {
  t: 0,
  /** Distance travelled, m. */
  s: 0,
  zs: 0,
  vs: 0,
  zu: 0,
  vu: 0,
  as: 0,
  au: 0,
  /** Road height under the tyre, m. */
  h: 0,
  /** Suspension force (spring + damper + inerter), N. */
  F: 0,
  Fdamper: 0,
  Finerter: 0,
  /** Tyre load variation, N (negative = unloaded); tyre off the ground if contact = false. */
  Ft: 0,
  contact: true,
  /** Max compression over the last bump, mm. */
  peak: 0,
}

/** Wheel travel relative to the chassis (m, + = bump / compression). */
export const travel = () => sim.zu - sim.zs
export const travelV = () => sim.vu - sim.vs

export function step(dt: number) {
  const st = useSuspStore.getState()
  const v = st.speedKmh / 3.6
  const b = st.inerter ? B : 0
  const n = Math.max(1, Math.ceil(dt / 0.0004))
  const h = dt / n
  for (let i = 0; i < n; i++) {
    sim.s += v * h
    sim.h = road(sim.s, st.profile, st.bumpMm)
    const rel = sim.zu - sim.zs
    const relv = sim.vu - sim.vs
    const Fk = KS * rel + C * relv
    // model written around static equilibrium; the tyre only pushes, so it unloads then leaves
    // the ground once the dynamic load exceeds the static load (MS+MU)·g
    const Ft = KT * (sim.h - sim.zu)
    const static_ = (MS + MU) * 9.81
    const FtTotal = Math.max(0, static_ + Ft)
    const FtDyn = FtTotal - static_
    // (ms + b) as - b au = Fk ; (mu + b) au - b as = FtDyn - Fk
    const a11 = MS + b
    const a12 = -b
    const a21 = -b
    const a22 = MU + b
    const r1 = Fk
    const r2 = FtDyn - Fk
    const det = a11 * a22 - a12 * a21
    const as = (r1 * a22 - a12 * r2) / det
    const au = (a11 * r2 - a21 * r1) / det
    sim.vs += as * h
    sim.vu += au * h
    sim.zs += sim.vs * h
    sim.zu += sim.vu * h
    sim.as = as
    sim.au = au
    sim.F = Fk + b * (au - as)
    sim.Fdamper = C * relv
    sim.Finerter = b * (au - as)
    sim.Ft = FtDyn
    sim.contact = FtTotal > 0
  }
  sim.t += dt
  const tr = (sim.zu - sim.zs) * 1000
  sim.peak = Math.max(sim.peak * Math.exp(-dt * 2), tr)
}

/* ------------------------------------------------------------------ */
/* Kinematics of the corner (mm, chassis frame)                         */
/* X outboard, Y up, Z forward (+Z towards the camera).                */
/* ------------------------------------------------------------------ */

export type P2 = [number, number]

export interface CornerGeo {
  lowerPivot: P2
  upperPivot: P2
  lbj: P2
  ubj: P2
  wheel: P2
  /** Rod (push/pull) outer and inner points. */
  rodOut: P2
  rodIn: P2
  rockerPivot: P2
  /** Rocker angle, rad. */
  phi: number
  armB: P2
  armC: P2
  damperAnchor: P2
  inerterAnchor: P2
  damperLen: number
  inerterLen: number
  lowerAngle: number
  upperAngle: number
}

const LOWER_PIVOT: P2 = [230, 180]
const UPPER_PIVOT: P2 = [240, 470]
const L_LOWER = 420
const L_UPPER = 360

interface LayoutDef {
  pivot: P2
  A: P2
  Bv: P2
  Cv: P2
  damperAnchor: P2
  inerterAnchor: P2
  /** Fraction along the wishbone and lift of the outer rod point. */
  onUpper: boolean
}

export const LAYOUTS: Record<SuspLayout, LayoutDef> = {
  push: { pivot: [110, 690], A: [72, 18], Bv: [-20, 62], Cv: [-36, -38], damperAnchor: [-230, 752], inerterAnchor: [-230, 652], onUpper: false },
  pull: { pivot: [110, 80], A: [72, -18], Bv: [-20, -62], Cv: [-36, 38], damperAnchor: [-230, 18], inerterAnchor: [-230, 118], onUpper: true },
}

const rot = (p: P2, a: number): P2 => [p[0] * Math.cos(a) - p[1] * Math.sin(a), p[0] * Math.sin(a) + p[1] * Math.cos(a)]
const add = (a: P2, b: P2): P2 => [a[0] + b[0], a[1] + b[1]]
const dist = (a: P2, b: P2) => Math.hypot(a[0] - b[0], a[1] - b[1])

function arms(dv: number) {
  const la = Math.asin(Math.max(-0.9, Math.min(0.9, dv / L_LOWER)))
  const ua = Math.asin(Math.max(-0.9, Math.min(0.9, dv / L_UPPER)))
  const lbj: P2 = [LOWER_PIVOT[0] + L_LOWER * Math.cos(la), LOWER_PIVOT[1] + L_LOWER * Math.sin(la)]
  const ubj: P2 = [UPPER_PIVOT[0] + L_UPPER * Math.cos(ua), UPPER_PIVOT[1] + L_UPPER * Math.sin(ua)]
  return { la, ua, lbj, ubj }
}

function rodOuter(layout: SuspLayout, dv: number): P2 {
  const { lbj, ubj } = arms(dv)
  if (LAYOUTS[layout].onUpper) {
    const f = 0.9
    return [UPPER_PIVOT[0] + (ubj[0] - UPPER_PIVOT[0]) * f, UPPER_PIVOT[1] + (ubj[1] - UPPER_PIVOT[1]) * f - 10]
  }
  const f = 0.88
  return [LOWER_PIVOT[0] + (lbj[0] - LOWER_PIVOT[0]) * f, LOWER_PIVOT[1] + (lbj[1] - LOWER_PIVOT[1]) * f + 22]
}

const rodLen: Record<SuspLayout, number> = {
  push: dist(rodOuter('push', 0), add(LAYOUTS.push.pivot, LAYOUTS.push.A)),
  pull: dist(rodOuter('pull', 0), add(LAYOUTS.pull.pivot, LAYOUTS.pull.A)),
}

/** Rocker angle that keeps the rod length constant (bisection). */
function solvePhi(layout: SuspLayout, q: P2): number {
  const L = LAYOUTS[layout]
  const f = (phi: number) => dist(add(L.pivot, rot(L.A, phi)), q) - rodLen[layout]
  let a = -1.2
  let b = 1.2
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

export function corner(layout: SuspLayout, dv: number): CornerGeo {
  const L = LAYOUTS[layout]
  const { la, ua, lbj, ubj } = arms(dv)
  const rodOut = rodOuter(layout, dv)
  const phi = solvePhi(layout, rodOut)
  const rodIn = add(L.pivot, rot(L.A, phi))
  const armB = add(L.pivot, rot(L.Bv, phi))
  const armC = add(L.pivot, rot(L.Cv, phi))
  return {
    lowerPivot: LOWER_PIVOT,
    upperPivot: UPPER_PIVOT,
    lbj,
    ubj,
    wheel: [(lbj[0] + ubj[0]) / 2 + 140, (lbj[1] + ubj[1]) / 2],
    rodOut,
    rodIn,
    rockerPivot: L.pivot,
    phi,
    armB,
    armC,
    damperAnchor: L.damperAnchor,
    inerterAnchor: L.inerterAnchor,
    damperLen: dist(armB, L.damperAnchor),
    inerterLen: dist(armC, L.inerterAnchor),
    lowerAngle: la,
    upperAngle: ua,
  }
}

const REST: Record<SuspLayout, CornerGeo> = { push: corner('push', 0), pull: corner('pull', 0) }
export const restOf = (layout: SuspLayout) => REST[layout]

/** Motion ratio = damper stroke / wheel travel, around the travel dv (mm). */
export function motionRatio(layout: SuspLayout, dv: number) {
  const e = 0.5
  const a = corner(layout, dv - e)
  const b = corner(layout, dv + e)
  return Math.abs(b.damperLen - a.damperLen) / (2 * e)
}

/** Lead of the inerter ball screw, mm per turn (illustrative). */
export const INERTER_LEAD = 10
/** Visual amplification of the wheel travel in the 3D scene. */
export const VIS = 2.5
