import { DIMS } from '../parts/dims'

/**
 * Analytic, "plausible" velocity field around the car (this is NOT CFD).
 *
 * Normalised units: free stream = 1, flowing towards -X (the car points to +X).
 * The field is the superposition of:
 *  1. Free stream.
 *  2. Lifting-line vortex systems (Biot–Savart on finite segments with a regularised core) for the
 *     front wing (two horseshoes whose inner legs are the Y250 vortices, following the floor edge)
 *     and the rear wing (tip vortices). Inverted wings → acceleration below, upwash behind.
 *  3. Underfloor channel: 1D mass conservation between the ground and the floor/diffuser ceiling
 *     (Venturi), damped when the gap becomes too small (stall → porpoising).
 *  4. Wake: Gaussian velocity deficits (car + rear wheels), "mushroom" upwash, turbulence intensity.
 *  5. Obstacles: signed distance field of simplified shapes; the velocity component going into the
 *     surface is removed (slip condition) and tangential flow is accelerated around the shoulders.
 */

export interface FieldConfig {
  /** Plank height above the ground, metres. */
  rideHeight: number
  /** Flaps open (DRS / straight-line mode). */
  open: boolean
}

/** Output layout of FlowField.sample(): u, v, w, turbulence, sdf, nx, ny, nz, total-pressure loss */
export const OUT_SIZE = 9

const FOUR_PI = 4 * Math.PI
const DELTA = 0.16 // obstacle influence thickness (m)

type V3 = [number, number, number]

/** Car bounding box (car-local coordinates) used to skip SDF evaluations. */
const BB = { x0: -2.75 - DELTA, x1: 3.05 + DELTA, y1: 1.15 + DELTA, z: 1.15 + DELTA }

const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v)
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/* ---------------- signed distance primitives (car-local) ---------------- */

function sdTaper(px: number, py: number, pz: number, a: V3, b: V3, r1: number, r2: number) {
  const bx = b[0] - a[0]
  const by = b[1] - a[1]
  const bz = b[2] - a[2]
  const ax = px - a[0]
  const ay = py - a[1]
  const az = pz - a[2]
  const t = clamp((ax * bx + ay * by + az * bz) / (bx * bx + by * by + bz * bz), 0, 1)
  const dx = ax - bx * t
  const dy = ay - by * t
  const dz = az - bz * t
  return Math.sqrt(dx * dx + dy * dy + dz * dz) - (r1 + (r2 - r1) * t)
}

function sdBox(px: number, py: number, pz: number, cx: number, cy: number, cz: number, hx: number, hy: number, hz: number) {
  const qx = Math.abs(px - cx) - hx
  const qy = Math.abs(py - cy) - hy
  const qz = Math.abs(pz - cz) - hz
  const ox = Math.max(qx, 0)
  const oy = Math.max(qy, 0)
  const oz = Math.max(qz, 0)
  return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, Math.max(qy, qz)), 0)
}

function sdWheel(px: number, py: number, pz: number, cx: number, cz: number, r: number, hw: number) {
  const dx = Math.hypot(px - cx, py - r) - r
  const dz = Math.abs(pz - cz) - hw
  return Math.min(Math.max(dx, dz), 0) + Math.hypot(Math.max(dx, 0), Math.max(dz, 0))
}

// diffuser ramp of the 2026 model (parts/Underbody.tsx FLOOR_ST): roof 0.078 m at x = −1.02 → 0.265 m at x = −1.95
const RAMP_ANGLE = Math.atan2(0.265 - 0.078, 1.95 - 1.02)
const RAMP_C = Math.cos(RAMP_ANGLE)
const RAMP_S = Math.sin(RAMP_ANGLE)

/* ---------------- underfloor geometry (car-local) ---------------- */

/** Height of the floor ceiling (y) above which the underfloor channel ends. NaN outside the floor. */
function floorCeiling(x: number) {
  if (x > 1.32 || x < -1.95) return NaN
  if (x > 0.5) return 0.075 + ((x - 0.5) / 0.82) * 0.125 // short 2026 inlet
  if (x > -1.02) return 0.075 // long flat throat
  return 0.078 + ((-1.02 - x) / 0.93) * 0.187 // smaller 2026 diffuser
}
function floorHalfWidth(x: number) {
  if (x > 0.8) return 0.4 + ((1.32 - x) / 0.52) * 0.355
  if (x > -1.02) return 0.765
  return 0.52
}

export class FlowField {
  private cfg: FieldConfig = { rideHeight: DIMS.refRide, open: false }
  /** Vertical offset of the car vs its modelled position. */
  private dy = 0
  /** Segments: ax ay az bx by bz gamma/4π core² (car-local) */
  private segs = new Float32Array(0)
  private nSegs = 0
  private gIn = 0.14

  constructor(cfg?: Partial<FieldConfig>) {
    this.configure(cfg ?? {})
  }

  get config(): Readonly<FieldConfig> {
    return this.cfg
  }

  configure(cfg: Partial<FieldConfig>) {
    this.cfg = { ...this.cfg, ...cfg }
    this.dy = this.cfg.rideHeight - DIMS.refRide
    this.gIn = 0.14 + this.dy
    this.buildVortices()
  }

  /* ------------------------------ vortices ------------------------------ */

  /** Polylines of the trailing vortex cores, for visualisation (world coordinates). */
  vortexPaths(): { kind: 'tip' | 'y250' | 'rear'; sign: number; points: V3[] }[] {
    const dy = this.dy
    const sh = (p: V3): V3 => [p[0], p[1] + dy, p[2]]
    const res: { kind: 'tip' | 'y250' | 'rear'; sign: number; points: V3[] }[] = []
    for (const s of [1, -1]) {
      res.push({ kind: 'tip', sign: s, points: FW_TIP.map((p) => sh([p[0], p[1], s * p[2]])) })
      res.push({ kind: 'y250', sign: -s, points: FW_INNER.map((p) => sh([p[0], p[1], s * p[2]])) })
      res.push({ kind: 'rear', sign: s, points: RW_TIP.map((p) => sh([p[0], p[1], s * p[2]])) })
    }
    return res
  }

  private buildVortices() {
    const open = this.cfg.open
    // ground effect on the front wing: more circulation when closer to the ground
    const gFw = (open ? 0.15 : 0.24) * clamp(1 + (DIMS.refRide - this.cfg.rideHeight) * 4, 0.8, 1.2)
    const gRw = open ? 0.12 : 0.36
    const list: number[] = []
    const add = (a: V3, b: V3, g: number, core: number) => {
      list.push(a[0], a[1], a[2], b[0], b[1], b[2], g / FOUR_PI, core * core)
    }
    /** Adds a polyline of segments a→b→c… */
    const poly = (pts: V3[], g: number, core: number) => {
      for (let i = 0; i < pts.length - 1; i++) add(pts[i], pts[i + 1], g, core)
    }
    const mirror = (pts: V3[]) => pts.map((p) => [p[0], p[1], -p[2]] as V3)
    const rev = (pts: V3[]) => pts.slice().reverse()

    // Front wing, right horseshoe: far → tip (z=+0.86) → bound (dir −z) → inner end (z=+0.25) → far (Y250)
    poly(rev(FW_TIP), gFw, 0.06)
    add([FW_X, FW_Y, 0.86], [FW_X, FW_Y, 0.25], gFw, 0.05)
    poly(FW_INNER, gFw, 0.05)
    // left horseshoe (mirror, with reversed orientation to keep the same rotation sense)
    poly(rev(mirror(FW_INNER)), gFw, 0.05)
    add([FW_X, FW_Y, -0.25], [FW_X, FW_Y, -0.86], gFw, 0.05)
    poly(mirror(FW_TIP), gFw, 0.06)
    // Rear wing horseshoe
    poly(rev(RW_TIP), gRw, 0.08)
    add([RW_X, RW_Y, 0.49], [RW_X, RW_Y, -0.49], gRw, 0.06)
    poly(mirror(RW_TIP), gRw, 0.08)

    this.segs = new Float32Array(list)
    this.nSegs = list.length / 8
  }

  /* ------------------------------ obstacles ------------------------------ */

  /** Union SDF of the simplified car (car-local coordinates). */
  sdf(x: number, y: number, z: number): number {
    const open = this.cfg.open
    // shapes follow the 2026 model (parts/shapes.ts, Underbody.tsx, FrontWing.tsx, RearWing.tsx)
    let d = sdTaper(x, y, z, [2.83, 0.18, 0], [2.15, 0.26, 0], 0.03, 0.12) // high, slim nose
    d = Math.min(d, sdTaper(x, y, z, [2.15, 0.26, 0], [-0.1, 0.37, 0], 0.12, 0.29)) // monocoque
    d = Math.min(d, sdTaper(x, y, z, [-0.1, 0.66, 0], [-1.95, 0.38, 0], 0.28, 0.06)) // engine cover / airbox
    d = Math.min(d, sdTaper(x, y, z, [0.13, 0.76, 0], [0.13, 0.77, 0], 0.13, 0.13)) // helmet
    const az = Math.abs(z)
    d = Math.min(d, sdTaper(x, y, az, [0.5, 0.42, 0.42], [-1.4, 0.19, 0.2], 0.17, 0.05)) // sidepods (undercut below)
    d = Math.min(d, sdBox(x, y, z, 0.15, 0.0575, 0, 1.17, 0.0175, 0.765)) // floor
    // diffuser ramp (rotated box)
    {
      const lx = x + 1.485
      const ly = y - 0.172
      const rx = lx * RAMP_C - ly * RAMP_S
      const ry = lx * RAMP_S + ly * RAMP_C
      d = Math.min(d, sdBox(rx, ry, z, 0, 0, 0, 0.475, 0.012, 0.52))
    }
    d = Math.min(d, sdWheel(x, y, az, DIMS.frontAxleX, DIMS.trackZF, DIMS.tyreRF, DIMS.tyreWF / 2))
    d = Math.min(d, sdWheel(x, y, az, DIMS.rearAxleX, DIMS.trackZR, DIMS.tyreRR, DIMS.tyreWR / 2))
    d = Math.min(d, sdBox(x, y, z, 2.685, open ? 0.12 : 0.14, 0, 0.27, open ? 0.05 : 0.07, 0.86)) // front wing (flaps flatten in X mode)
    d = Math.min(d, sdBox(x, y, z, -2.33, 0.85, 0, 0.26, open ? 0.045 : 0.09, 0.49)) // rear wing (no beam wing in 2026)
    d = Math.min(d, sdBox(x, y, az, -2.3, 0.79, 0.497, 0.31, 0.18, 0.006)) // rear endplates
    return d
  }

  /* ------------------------------ sampling ------------------------------ */

  /**
   * Samples the field at a world position. Writes into out (see OUT_SIZE):
   * [0..2] velocity (free stream = 1), [3] turbulence intensity, [4] sdf (or 1 when far), [5..7] surface normal,
   * [8] total-pressure loss (wakes).
   */
  sample(px: number, py: number, pz: number, out: Float32Array, withObstacles = true) {
    const dy = this.dy
    const y = py - dy // car-local
    let ux = -1
    let uy = 0
    let uz = 0
    let turb = 0
    let deficit = 0

    // 1) vortex systems (Biot–Savart)
    const s = this.segs
    for (let i = 0, o = 0; i < this.nSegs; i++, o += 8) {
      const r1x = px - s[o]
      const r1y = y - s[o + 1]
      const r1z = pz - s[o + 2]
      const r2x = px - s[o + 3]
      const r2y = y - s[o + 4]
      const r2z = pz - s[o + 5]
      const r0x = s[o + 3] - s[o]
      const r0y = s[o + 4] - s[o + 1]
      const r0z = s[o + 5] - s[o + 2]
      const cx = r1y * r2z - r1z * r2y
      const cy = r1z * r2x - r1x * r2z
      const cz = r1x * r2y - r1y * r2x
      const n1 = Math.sqrt(r1x * r1x + r1y * r1y + r1z * r1z) + 1e-6
      const n2 = Math.sqrt(r2x * r2x + r2y * r2y + r2z * r2z) + 1e-6
      const dot = r0x * (r1x / n1 - r2x / n2) + r0y * (r1y / n1 - r2y / n2) + r0z * (r1z / n1 - r2z / n2)
      const den = cx * cx + cy * cy + cz * cz + s[o + 7] * (r0x * r0x + r0y * r0y + r0z * r0z)
      const k = (s[o + 6] * dot) / den
      ux += k * cx
      uy += k * cy
      uz += k * cz
    }

    // 2) underfloor channel
    const ceil = floorCeiling(px)
    if (ceil === ceil && y < ceil && py > 0) {
      const hw = floorHalfWidth(px)
      const m = 1 - smooth(hw - 0.12, hw + 0.02, Math.abs(pz))
      if (m > 0) {
        const gap = ceil + dy
        const ratio = this.gIn / Math.max(gap, 0.004)
        const h = this.cfg.rideHeight
        const attached = smooth(0.009, 0.019, h)
        const gain = 1 + 0.38 * (ratio - 1) * attached - (1 - attached) * 0.35 * smooth(0.8, 0.2, px)
        const inlet = smooth(1.3, 1.0, px)
        const f = 1 + (gain - 1) * inlet
        ux = ux * (1 - m) + -Math.abs(ux) * f * m
        uy *= 1 - 0.8 * m
        uz *= 1 - 0.5 * m
        if (px < -1.0) uy += Math.abs(ux) * 0.28 * (py / Math.max(gap, 0.01)) * m // flow follows the diffuser ramp
        turb += (1 - attached) * 0.5 * m
      }
    }

    // 3) wake
    if (px < -1.9) {
      const open = this.cfg.open
      const sd = -1.9 - px
      const yc = (open ? 0.5 : 0.58) + dy + (open ? 0.06 : 0.11) * Math.sqrt(sd)
      const wy = 0.32 + 0.055 * sd
      const wz = 0.55 + 0.065 * sd
      const ey = (py - yc) / wy
      const ez = pz / wz
      const g = Math.exp(-ey * ey - ez * ez)
      const D = (open ? 0.3 : 0.45) / (1 + sd / 5)
      // rear wheel wakes
      const ww = 0.24 + 0.05 * sd
      const ewy = (py - 0.3) / ww
      const ewz = (Math.abs(pz) - DIMS.trackZ * (1 - 0.03 * Math.min(sd, 10))) / ww
      const gw = Math.exp(-ewy * ewy - ewz * ewz)
      const Dw = 0.35 / (1 + sd / 3)
      ux += D * g + Dw * gw
      deficit += D * g + Dw * gw
      uy += ((open ? 0.06 : 0.12) * g) / (1 + sd / 4)
      turb += 0.9 * D * g + Dw * gw
    }
    // front wheel wakes, flowing along the sidepods
    if (px < 1.5 && px > -2.0) {
      const sd = 1.5 - px
      const ww = 0.2 + 0.04 * sd
      const ewy = (y - 0.3) / ww
      const ewz = (Math.abs(pz) - (DIMS.trackZ + 0.02)) / ww
      const gw = Math.exp(-ewy * ewy - ewz * ewz)
      const Dw = 0.3 / (1 + sd / 1.5)
      ux += Dw * gw
      deficit += Dw * gw
      turb += 0.7 * Dw * gw
    }

    // 4) obstacles
    out[4] = 1
    out[5] = 0
    out[6] = 1
    out[7] = 0
    if (withObstacles && px > BB.x0 && px < BB.x1 && y < BB.y1 && Math.abs(pz) < BB.z) {
      const d = this.sdf(px, y, pz)
      if (d < DELTA) {
        // tetrahedral gradient (4 evaluations instead of 6)
        const e = 0.008
        const a = this.sdf(px + e, y - e, pz - e)
        const b = this.sdf(px - e, y - e, pz + e)
        const c = this.sdf(px - e, y + e, pz - e)
        const f = this.sdf(px + e, y + e, pz + e)
        let nx = a - b - c + f
        let ny = -a - b + c + f
        let nz = -a + b - c + f
        const nl = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
        nx /= nl
        ny /= nl
        nz /= nl
        let w = 1 - Math.max(d, 0) / DELTA
        w = w * w * (3 - 2 * w)
        const vn = ux * nx + uy * ny + uz * nz
        const mag = Math.sqrt(ux * ux + uy * uy + uz * uz) || 1
        if (vn < 0) {
          ux -= w * vn * nx
          uy -= w * vn * ny
          uz -= w * vn * nz
        }
        // speed-up where the flow is tangential (shoulders), stagnation where it hits head-on
        const tang = Math.sqrt(Math.max(0, 1 - (vn / mag) ** 2))
        const boost = 1 + 0.25 * w * tang
        ux *= boost
        uy *= boost
        uz *= boost
        out[4] = d
        out[5] = nx
        out[6] = ny
        out[7] = nz
      }
    }

    // ground: no flow through it
    if (py < 0.015 && uy < 0) uy *= py / 0.015

    out[0] = ux
    out[1] = uy
    out[2] = uz
    out[3] = turb
    // wakes have lost total pressure: Bernoulli does not hold there, the static pressure stays ~ambient
    const kept = 1 - Math.min(deficit, 0.95)
    out[8] = 1 - kept * kept
  }

  /** Pressure coefficient from a sample: Cp = 1 − |u|² − total-pressure loss. */
  static cp(out: Float32Array) {
    return 1 - (out[0] * out[0] + out[1] * out[1] + out[2] * out[2]) - out[8]
  }
}

/* ---------------- vortex geometry (car-local, right side) ---------------- */

const FW_X = 2.68
const FW_Y = 0.12
/** Front wing tip vortex, from the endplate, pushed outboard around the front tyre. */
const FW_TIP: V3[] = [
  [FW_X, FW_Y + 0.02, 0.86],
  [2.1, 0.26, 1.0],
  [1.2, 0.33, 1.12],
  [-1.5, 0.4, 1.18],
  [-9, 0.5, 1.22],
]
/** Inner end of the loaded wing section (Y250 region), then running along the floor edge. */
const FW_INNER: V3[] = [
  [FW_X, FW_Y, 0.25],
  [2.0, 0.1, 0.3],
  [1.1, 0.08, 0.5],
  [-0.8, 0.06, 0.8],
  [-9, 0.12, 0.95],
]
const RW_X = -2.3
const RW_Y = 0.86
const RW_TIP: V3[] = [
  [RW_X, RW_Y + 0.06, 0.49],
  [-3.5, 1.0, 0.47],
  [-9, 1.18, 0.42],
]
