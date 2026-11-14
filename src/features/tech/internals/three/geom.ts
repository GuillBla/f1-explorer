import * as THREE from 'three'

/* ------------------------------------------------------------------ */
/* Involute spur gears                                                 */
/* ------------------------------------------------------------------ */

export interface GearSpec {
  teeth: number
  /** Module (pitch diameter / teeth), in scene units. */
  module: number
  /** Pressure angle, degrees (20° standard). */
  pressureDeg?: number
  /** Bore radius (0 = none). */
  bore?: number
  /** Number of lightening holes in the web. */
  holes?: number
}

const inv = (a: number) => Math.tan(a) - a

/** Pitch radius of a gear. */
export const pitchRadius = (teeth: number, module: number) => (teeth * module) / 2

/**
 * 2D outline of a spur gear with a true involute flank profile (generated from the base circle),
 * root arcs at the dedendum circle, optional bore and lightening holes.
 */
export function gearShape({ teeth: z, module: m, pressureDeg = 20, bore = 0, holes = 0 }: GearSpec): THREE.Shape {
  const alpha = (pressureDeg * Math.PI) / 180
  const r = (m * z) / 2
  const rb = r * Math.cos(alpha)
  const ra = r + m
  const rf = Math.max(r - 1.25 * m, m * 0.5)
  // half angular thickness of the tooth at radius rho
  const halfAt = (rho: number) => {
    const ar = Math.acos(Math.min(1, rb / rho))
    return Math.PI / (2 * z) + inv(alpha) - inv(ar)
  }
  const flankStart = Math.max(rb, rf)
  const N = 6
  const pts: THREE.Vector2[] = []
  const polar = (rho: number, a: number) => new THREE.Vector2(rho * Math.cos(a), rho * Math.sin(a))
  for (let i = 0; i < z; i++) {
    const c = (2 * Math.PI * i) / z
    const hStart = halfAt(flankStart)
    // root (radial segment below the base circle)
    if (rf < flankStart) pts.push(polar(rf, c - hStart))
    // right flank (lower angle) going out
    for (let k = 0; k <= N; k++) {
      const rho = flankStart + ((ra - flankStart) * k) / N
      pts.push(polar(rho, c - halfAt(rho)))
    }
    // tip land
    pts.push(polar(ra, c))
    // left flank going in
    for (let k = N; k >= 0; k--) {
      const rho = flankStart + ((ra - flankStart) * k) / N
      pts.push(polar(rho, c + halfAt(rho)))
    }
    if (rf < flankStart) pts.push(polar(rf, c + hStart))
    // root arc to the next tooth
    const next = (2 * Math.PI * (i + 1)) / z - hStart
    const from = c + hStart
    for (let k = 1; k < 3; k++) pts.push(polar(rf, from + ((next - from) * k) / 3))
  }
  const shape = new THREE.Shape(pts)
  if (bore > 0) {
    const h = new THREE.Path()
    h.absarc(0, 0, bore, 0, Math.PI * 2, true)
    shape.holes.push(h)
  }
  if (holes > 0 && rf - bore > m * 4) {
    const rr = (rf + bore) / 2
    const hr = Math.min((rf - bore) * 0.3, (Math.PI * rr) / holes * 0.55)
    for (let i = 0; i < holes; i++) {
      const a = (2 * Math.PI * (i + 0.5)) / holes
      const h = new THREE.Path()
      h.absarc(rr * Math.cos(a), rr * Math.sin(a), hr, 0, Math.PI * 2, true)
      shape.holes.push(h)
    }
  }
  return shape
}

/** Extruded spur gear, centred on z = 0, axis along z. */
export function gearGeometry(spec: GearSpec, width: number) {
  const g = new THREE.ExtrudeGeometry(gearShape(spec), {
    depth: width,
    bevelEnabled: true,
    bevelThickness: Math.min(width * 0.08, spec.module * 0.25),
    bevelSize: spec.module * 0.12,
    bevelSegments: 1,
    curveSegments: 10,
  })
  g.translate(0, 0, -width / 2)
  g.computeVertexNormals()
  return g
}

/** Angular offset that makes gear B mesh with gear A (A at angle aA, B to the +x side of A). */
export function meshPhase(teethA: number, teethB: number, aA: number) {
  // B rotates opposite to A at ratio zA/zB; half a tooth offset so a tooth meets a gap.
  return -aA * (teethA / teethB) + Math.PI / teethB + Math.PI
}

/* ------------------------------------------------------------------ */
/* Generic helpers                                                     */
/* ------------------------------------------------------------------ */

/** Cylinder geometry whose axis is along z (three's default is y). */
export function cylZ(rTop: number, rBottom: number, len: number, seg = 24, open = false) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, len, seg, 1, open)
  g.rotateX(Math.PI / 2)
  return g
}

/** Cylinder geometry whose axis is along x. */
export function cylX(rTop: number, rBottom: number, len: number, seg = 24, open = false) {
  const g = new THREE.CylinderGeometry(rTop, rBottom, len, seg, 1, open)
  g.rotateZ(-Math.PI / 2)
  return g
}

/** Hollow tube (annulus extruded), axis along z, centred. */
export function tubeZ(rOut: number, rIn: number, len: number, seg = 32) {
  const s = new THREE.Shape()
  s.absarc(0, 0, rOut, 0, Math.PI * 2, false)
  const h = new THREE.Path()
  h.absarc(0, 0, rIn, 0, Math.PI * 2, true)
  s.holes.push(h)
  const g = new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, curveSegments: seg })
  g.translate(0, 0, -len / 2)
  return g
}

/** Coil spring along y, from y=0 to y=height. */
export function coilSpringGeometry(radius: number, wire: number, height: number, turns: number) {
  const pts: THREE.Vector3[] = []
  const n = Math.ceil(turns * 24)
  for (let i = 0; i <= n; i++) {
    const t = i / n
    const a = t * turns * Math.PI * 2
    pts.push(new THREE.Vector3(radius * Math.cos(a), t * height, radius * Math.sin(a)))
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), n, wire, 6, false)
}

/** Aligns `obj` so that its local +Y axis goes from a to b (and scales Y to the distance if asked). */
const _up = new THREE.Vector3(0, 1, 0)
const _d = new THREE.Vector3()
export function alignY(obj: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, stretch = false) {
  _d.subVectors(b, a)
  const len = _d.length()
  obj.position.copy(a)
  if (len > 1e-9) obj.quaternion.setFromUnitVectors(_up, _d.multiplyScalar(1 / len))
  if (stretch) obj.scale.set(1, len, 1)
}
