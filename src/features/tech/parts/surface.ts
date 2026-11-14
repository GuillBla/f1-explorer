import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * Smooth-surface toolkit of the 2026 car: lofts of cross-sections along splines, NACA wing elements,
 * streamlined struts, swept tubes and cut plates. All geometries are plain indexed BufferGeometries
 * with smooth normals and UVs in metres (so the procedural carbon weave keeps a constant scale).
 * Conventions: metres, car pointing to +X, Y up, Z lateral (right = +Z), ground at y = 0.
 */

export type P2 = [number, number]
export type P3 = [number, number, number]

/** Material index chosen for a quad from its centre (livery split into geometry groups). */
export type PaintFn = (x: number, y: number, z: number) => number

export interface RingOptions {
  /** Each ring is a closed loop (default true). */
  closed?: boolean
  capStart?: boolean
  capEnd?: boolean
  /** Livery: material index of each quad / cap (default 0). */
  paint?: PaintFn
  /** Averages the normals on the ring seam (default true). False keeps a crease (wing trailing edges). */
  smoothSeam?: boolean
}

const v3 = (p: P3) => new THREE.Vector3(p[0], p[1], p[2])

/**
 * Core surface builder: skins a sequence of rings that all have the same number of points.
 * Side normals are smooth, caps are flat, winding is fixed automatically.
 */
export function ringsGeometry(rings: P3[][], opts: RingOptions = {}): THREE.BufferGeometry {
  const closed = opts.closed ?? true
  const n = rings[0].length
  const m = closed ? n + 1 : n
  const nr = rings.length
  const pos: number[] = []
  const uv: number[] = []
  const cents: P3[] = rings.map((r) => {
    let x = 0
    let y = 0
    let z = 0
    for (const p of r) {
      x += p[0]
      y += p[1]
      z += p[2]
    }
    return [x / r.length, y / r.length, z / r.length]
  })
  let u = 0
  for (let i = 0; i < nr; i++) {
    if (i > 0) u += Math.hypot(cents[i][0] - cents[i - 1][0], cents[i][1] - cents[i - 1][1], cents[i][2] - cents[i - 1][2])
    const r = rings[i]
    let v = 0
    for (let j = 0; j < m; j++) {
      const p = r[j % n]
      if (j > 0) {
        const q = r[(j - 1) % n]
        v += Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2])
      }
      pos.push(p[0], p[1], p[2])
      uv.push(u, v)
    }
  }
  // winding: the largest face normal of a middle ring must point away from the ring centre
  const P = (i: number, j: number) => {
    const k = (i * m + j) * 3
    return new THREE.Vector3(pos[k], pos[k + 1], pos[k + 2])
  }
  let flip = false
  {
    const i0 = Math.max(0, Math.min(nr - 2, Math.floor(nr / 2)))
    let best = 0
    for (let j = 0; j < m - 1; j++) {
      const a = P(i0, j)
      const fn = P(i0 + 1, j).sub(a).cross(P(i0, j + 1).sub(a))
      const d = fn.dot(a.clone().sub(v3(cents[i0])))
      if (Math.abs(d) > Math.abs(best)) best = d
    }
    flip = best < 0
  }
  const paint = opts.paint
  const buckets = new Map<number, number[]>()
  const push = (mat: number, a: number, b: number, c: number) => {
    let l = buckets.get(mat)
    if (!l) buckets.set(mat, (l = []))
    l.push(a, b, c)
  }
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < m - 1; j++) {
      const a = i * m + j
      const b = a + 1
      const c = a + m
      const d = c + 1
      let mat = 0
      if (paint) {
        const k1 = a * 3
        const k2 = d * 3
        mat = paint((pos[k1] + pos[k2]) / 2, (pos[k1 + 1] + pos[k2 + 1]) / 2, (pos[k1 + 2] + pos[k2 + 2]) / 2)
      }
      if (flip) {
        push(mat, a, b, c)
        push(mat, b, d, c)
      } else {
        push(mat, a, c, b)
        push(mat, b, c, d)
      }
    }
  }
  const addCap = (ri: number, outward: THREE.Vector3) => {
    const r = rings[ri]
    const c = cents[ri]
    const C = v3(c)
    const base = pos.length / 3
    pos.push(c[0], c[1], c[2])
    uv.push(c[2], c[1])
    for (const p of r) {
      pos.push(p[0], p[1], p[2])
      uv.push(p[2], p[1])
    }
    const mat = paint ? paint(c[0], c[1], c[2]) : 0
    let acc = 0
    for (let j = 0; j < n; j++) {
      const a = v3(r[j]).sub(C)
      const b = v3(r[(j + 1) % n]).sub(C)
      acc += a.cross(b).dot(outward)
    }
    const lim = closed ? n : n - 1
    for (let j = 0; j < lim; j++) {
      const a = base + 1 + j
      const b = base + 1 + ((j + 1) % n)
      if (acc >= 0) push(mat, base, a, b)
      else push(mat, base, b, a)
    }
  }
  if (opts.capStart && nr > 1) addCap(0, v3(cents[0]).sub(v3(cents[1])))
  if (opts.capEnd && nr > 1) addCap(nr - 1, v3(cents[nr - 1]).sub(v3(cents[nr - 2])))

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2))
  const idx: number[] = []
  const keys = [...buckets.keys()].sort((a, b) => a - b)
  for (const k of keys) {
    const l = buckets.get(k)!
    g.addGroup(idx.length, l.length, k)
    for (const v of l) idx.push(v)
  }
  g.setIndex(idx)
  g.computeVertexNormals()
  if (closed && (opts.smoothSeam ?? true)) {
    const nrm = g.getAttribute('normal') as THREE.BufferAttribute
    for (let i = 0; i < nr; i++) {
      const a = i * m
      const b = i * m + n
      const x = nrm.getX(a) + nrm.getX(b)
      const y = nrm.getY(a) + nrm.getY(b)
      const z = nrm.getZ(a) + nrm.getZ(b)
      const l = Math.hypot(x, y, z) || 1
      nrm.setXYZ(a, x / l, y / l, z / l)
      nrm.setXYZ(b, x / l, y / l, z / l)
    }
  }
  g.computeBoundingSphere()
  return g
}

/** Non-uniform (Barry–Goldman) Catmull-Rom between p1 and p2, knots t0..t3. */
function bg(p0: number, p1: number, p2: number, p3: number, t0: number, t1: number, t2: number, t3: number, t: number) {
  const a1 = ((t1 - t) * p0 + (t - t0) * p1) / (t1 - t0)
  const a2 = ((t2 - t) * p1 + (t - t1) * p2) / (t2 - t1)
  const a3 = ((t3 - t) * p2 + (t - t2) * p3) / (t3 - t2)
  const b1 = ((t2 - t) * a1 + (t - t0) * a2) / (t2 - t0)
  const b2 = ((t3 - t) * a2 + (t - t1) * a3) / (t3 - t1)
  return ((t2 - t) * b1 + (t - t1) * b2) / (t2 - t1)
}

/**
 * Smoothly interpolates numeric "stations" along one of their keys (spline through every station,
 * knots = position along `axis`, so the axis itself stays monotonic: no folding).
 */
export function interpParams<T extends Record<string, number>>(st: T[], axis: keyof T & string, step: number): T[] {
  const keys = Object.keys(st[0]) as (keyof T & string)[]
  const n = st.length
  const knots: number[] = [0]
  for (let i = 1; i < n; i++) knots.push(knots[i - 1] + Math.max(1e-4, Math.abs(st[i][axis] - st[i - 1][axis])))
  const out: T[] = []
  for (let i = 0; i < n - 1; i++) {
    const i0 = i - 1
    const i3 = i + 2
    const t1 = knots[i]
    const t2 = knots[i + 1]
    const t0 = i0 >= 0 ? knots[i0] : t1 - (t2 - t1)
    const t3 = i3 < n ? knots[i3] : t2 + (t2 - t1)
    const steps = Math.max(1, Math.ceil((t2 - t1) / step))
    for (let k = 0; k < steps; k++) {
      const t = t1 + ((t2 - t1) * k) / steps
      const s = {} as Record<string, number>
      for (const key of keys) {
        const p1 = st[i][key]
        const p2 = st[i + 1][key]
        const p0 = i0 >= 0 ? st[i0][key] : 2 * p1 - p2
        const p3 = i3 < n ? st[i3][key] : 2 * p2 - p1
        s[key] = bg(p0, p1, p2, p3, t0, t1, t2, t3, t)
      }
      out.push(s as T)
    }
  }
  out.push({ ...st[n - 1] })
  return out
}

/** Closed centripetal Catmull-Rom through a 2D control polygon, `perSeg` points per segment. */
export function smoothClosed(ctrl: P2[], perSeg: number): P2[] {
  const n = ctrl.length
  const out: P2[] = []
  const kn = (a: P2, b: P2) => Math.max(1e-5, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1])))
  for (let i = 0; i < n; i++) {
    const p0 = ctrl[(i - 1 + n) % n]
    const p1 = ctrl[i]
    const p2 = ctrl[(i + 1) % n]
    const p3 = ctrl[(i + 2) % n]
    const t1 = kn(p0, p1)
    const t2 = t1 + kn(p1, p2)
    const t3 = t2 + kn(p2, p3)
    for (let k = 0; k < perSeg; k++) {
      const t = t1 + ((t2 - t1) * k) / perSeg
      out.push([bg(p0[0], p1[0], p2[0], p3[0], 0, t1, t2, t3, t), bg(p0[1], p1[1], p2[1], p3[1], 0, t1, t2, t3, t)])
    }
  }
  return out
}

/** Open centripetal Catmull-Rom through 3D points (end tangents extrapolated). */
export function smoothOpen3(ctrl: P3[], perSeg: number): P3[] {
  const n = ctrl.length
  const kn = (a: P3, b: P3) => Math.max(1e-5, Math.sqrt(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2])))
  const ext = (a: P3, b: P3): P3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]]
  const out: P3[] = []
  for (let i = 0; i < n - 1; i++) {
    const p0 = i > 0 ? ctrl[i - 1] : ext(ctrl[0], ctrl[1])
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = i + 2 < n ? ctrl[i + 2] : ext(ctrl[n - 1], ctrl[n - 2])
    const t1 = kn(p0, p1)
    const t2 = t1 + kn(p1, p2)
    const t3 = t2 + kn(p2, p3)
    for (let k = 0; k < perSeg; k++) {
      const t = t1 + ((t2 - t1) * k) / perSeg
      out.push([
        bg(p0[0], p1[0], p2[0], p3[0], 0, t1, t2, t3, t),
        bg(p0[1], p1[1], p2[1], p3[1], 0, t1, t2, t3, t),
        bg(p0[2], p1[2], p2[2], p3[2], 0, t1, t2, t3, t),
      ])
    }
  }
  out.push([...ctrl[n - 1]])
  return out
}

/**
 * Lofts cross-sections along X: `stations` are interpolated with a spline, then `section` turns each
 * interpolated station into a closed (z, y) profile (all profiles must have the same point count).
 */
export function loftX<T extends Record<string, number> & { x: number }>(
  stations: T[],
  section: (s: T) => P2[],
  opts: RingOptions & { step?: number } = {},
): THREE.BufferGeometry {
  const st = interpParams(stations, 'x', opts.step ?? 0.04)
  const rings = st.map((s) => section(s).map(([z, y]) => [s.x, y, z] as P3))
  return ringsGeometry(rings, opts)
}

/** Symmetric closed profile from the right half (z ≥ 0), listed from top centre to bottom centre. */
export function mirrorHalf(half: P2[]): P2[] {
  const out = half.slice()
  for (let i = half.length - 2; i >= 1; i--) out.push([-half[i][0], half[i][1]])
  return out
}

/**
 * NACA 4-digit airfoil ring (inverted camber for downforce). Leading edge at the origin, chord towards −X.
 * Positive `aoa` raises the trailing edge (more downforce). The ring starts at the trailing edge.
 */
export function airfoilRing(chord: number, thickness: number, camber: number, aoaDeg: number, n = 16, camberPos = 0.4): P2[] {
  const upper: P2[] = []
  const lower: P2[] = []
  const p = camberPos
  for (let i = 0; i <= n; i++) {
    const beta = (i / n) * Math.PI
    const xc = (1 - Math.cos(beta)) / 2
    const yt = 5 * thickness * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc ** 2 + 0.2843 * xc ** 3 - 0.1036 * xc ** 4)
    const yc = camber === 0 ? 0 : xc < p ? (camber / p ** 2) * (2 * p * xc - xc ** 2) : (camber / (1 - p) ** 2) * (1 - 2 * p + 2 * p * xc - xc ** 2)
    upper.push([xc, -yc + yt])
    lower.push([xc, -yc - yt])
  }
  const pts: P2[] = []
  for (let i = n; i >= 0; i--) pts.push(upper[i])
  for (let i = 1; i < n; i++) pts.push(lower[i])
  const a = THREE.MathUtils.degToRad(aoaDeg)
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  return pts.map(([uu, vv]) => {
    const x = -uu * chord
    const y = vv * chord
    return [x * ca + y * sa, -x * sa + y * ca]
  })
}

export interface WingStation {
  [k: string]: number
  /** Spanwise position. */
  z: number
  /** Leading edge position. */
  x: number
  y: number
  chord: number
  /** Angle of attack, degrees (positive = trailing edge up). */
  aoa: number
  camber: number
  thick: number
}

/** Wing element lofted along the span (taper, sweep, dihedral, twist), closed at both tips. */
export function wingLoft(stations: WingStation[], opts: { step?: number; n?: number; paint?: PaintFn; origin?: P2 } = {}) {
  const st = interpParams(stations, 'z', opts.step ?? 0.05)
  const [ox, oy] = opts.origin ?? [0, 0]
  const rings = st.map((s) =>
    airfoilRing(s.chord, s.thick, s.camber, s.aoa, opts.n ?? 14).map(([x, y]) => [s.x + x - ox, s.y + y - oy, s.z] as P3),
  )
  return ringsGeometry(rings, { capStart: true, capEnd: true, smoothSeam: false, paint: opts.paint })
}

/**
 * Streamlined strut between two points (wishbone leg, push-rod…): symmetric airfoil section whose
 * chord stays aligned with the air flow (X axis) as much as the strut direction allows.
 */
export function strutGeometry(a: P3, b: P3, chord: number, thickness: number, n = 8) {
  const A = v3(a)
  const B = v3(b)
  const dir = B.clone().sub(A).normalize()
  let cdir = new THREE.Vector3(1, 0, 0).addScaledVector(dir, -dir.x)
  if (cdir.lengthSq() < 0.05) cdir = new THREE.Vector3(0, 1, 0).addScaledVector(dir, -dir.y)
  cdir.normalize()
  const tdir = new THREE.Vector3().crossVectors(dir, cdir).normalize()
  const sec = airfoilRing(1, Math.min(0.9, thickness / chord), 0, 0, n).map(([x, y]) => [-(x + 0.45) * chord, y * chord] as P2)
  const ring = (c: THREE.Vector3): P3[] =>
    sec.map(([uu, vv]) => {
      const p = c.clone().addScaledVector(cdir, uu).addScaledVector(tdir, vv)
      return [p.x, p.y, p.z]
    })
  return ringsGeometry([ring(A), ring(A.clone().lerp(B, 0.5)), ring(B)], { capStart: true, capEnd: true, smoothSeam: false })
}

/** Unit-length round rod along +Y (for parts updated every frame, e.g. the steering track rod). */
export function rodGeometry(radius: number, seg = 8) {
  const g = new THREE.CylinderGeometry(radius, radius, 1, seg, 1)
  g.translate(0, 0.5, 0)
  return g
}

/**
 * Sweeps a section along a 3D path. The section (u, v) is placed in the plane normal to the path,
 * u along the horizontal side vector, v along the "up" side (constant roll, unlike Frenet frames).
 */
export function sweepPath(path: P3[], section: (t: number) => P2[], opts: RingOptions & { up?: P3 } = {}) {
  const up = v3(opts.up ?? [0, 1, 0])
  const pts = path.map(v3)
  const rings: P3[][] = []
  let prevSide = new THREE.Vector3(0, 0, 1)
  for (let i = 0; i < pts.length; i++) {
    const t = pts[Math.min(i + 1, pts.length - 1)].clone().sub(pts[Math.max(i - 1, 0)]).normalize()
    let side = new THREE.Vector3().crossVectors(t, up)
    if (side.lengthSq() < 1e-6) side = prevSide.clone()
    side.normalize()
    if (i > 0 && side.dot(prevSide) < 0) side.negate()
    prevSide = side
    const nrm = new THREE.Vector3().crossVectors(side, t).normalize()
    if (nrm.dot(up) < 0) nrm.negate()
    const sec = section(i / (pts.length - 1))
    rings.push(
      sec.map(([uu, vv]) => {
        const p = pts[i].clone().addScaledVector(side, uu).addScaledVector(nrm, vv)
        return [p.x, p.y, p.z] as P3
      }),
    )
  }
  return ringsGeometry(rings, opts)
}

/** Ellipse section helper (n points), starting at the bottom so the UV seam stays hidden. */
export function ellipse(a: number, b: number, n = 16, offset: P2 = [0, 0]): P2[] {
  const out: P2[] = []
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2
    out.push([offset[0] + Math.cos(t) * a, offset[1] + Math.sin(t) * b])
  }
  return out
}

/** Super-ellipse section (rounded rectangle), n points, starting at the bottom. e = 2 ellipse, higher = boxier. */
export function superEllipse(a: number, b: number, e: number, n = 24, offset: P2 = [0, 0]): P2[] {
  const out: P2[] = []
  const k = 2 / e
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI / 2
    const c = Math.cos(t)
    const s = Math.sin(t)
    out.push([offset[0] + Math.sign(c) * Math.abs(c) ** k * a, offset[1] + Math.sign(s) * Math.abs(s) ** k * b])
  }
  return out
}

/** Flat plate (outline + optional cut-outs, smoothed) in the XY plane, extruded along Z (centred), bevelled. */
export function cutPlate(outline: P2[], holes: P2[][], thickness: number, bevel = 0.002, smooth = true) {
  const toVec = (pts: P2[]) => (smooth ? smoothClosed(pts, 5) : pts).map(([x, y]) => new THREE.Vector2(x, y))
  const shape = new THREE.Shape(toVec(outline))
  for (const h of holes) shape.holes.push(new THREE.Path(toVec(h)))
  const depth = Math.max(0.0005, thickness - 2 * bevel)
  const g = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  })
  g.translate(0, 0, -depth / 2)
  g.computeVertexNormals()
  return g
}

/** Lathe of a (radius, axial) profile around the Z axis (wheels, discs, rims). */
export function latheZ(profile: P2[], seg = 48) {
  const g = new THREE.LatheGeometry(
    profile.map(([r, a]) => new THREE.Vector2(r, a)),
    seg,
  )
  g.rotateX(Math.PI / 2)
  return g
}

/** Bakes a rotation/translation into a geometry and returns it (chainable helper). */
export function place(g: THREE.BufferGeometry, pos: P3 = [0, 0, 0], rot: P3 = [0, 0, 0], scale: P3 = [1, 1, 1]) {
  const m = new THREE.Matrix4().compose(v3(pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), v3(scale))
  g.applyMatrix4(m)
  return g
}

/**
 * Merges geometries into one (fewer draw calls). Mixed indexed / non-indexed inputs are converted,
 * groups and extra attributes are dropped; inputs are disposed.
 */
export function merge(geos: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const nonIndexed = geos.some((g) => !g.index)
  const list = geos.map((g) => {
    const h = nonIndexed && g.index ? g.toNonIndexed() : g
    h.clearGroups()
    for (const name of Object.keys(h.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') h.deleteAttribute(name)
    if (!h.getAttribute('uv')) {
      const c = h.getAttribute('position').count
      h.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(c * 2), 2))
    }
    if (!h.getAttribute('normal')) h.computeVertexNormals()
    return h
  })
  const out = mergeGeometries(list, false) ?? new THREE.BufferGeometry()
  for (const g of geos) g.dispose()
  for (const g of list) g.dispose()
  out.computeBoundingSphere()
  return out
}
