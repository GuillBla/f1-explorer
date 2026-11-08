import * as THREE from 'three'

/**
 * Procedural geometry helpers used to model the car.
 * Conventions: metres, car pointing to +X, Y up, Z lateral (right = +Z), ground at y = 0.
 */

export interface Station {
  x: number
  /** Bottom and top of the section (y). */
  bottom: number
  top: number
  /** Total width (z). */
  w: number
  /** Lateral centre (default 0). */
  z?: number
  /** Super-ellipse exponent: 2 = ellipse, higher = boxier. */
  n?: number
}

function catmull(p0: number, p1: number, p2: number, p3: number, t: number) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}

function interpStations(st: Station[], subdiv: number): Required<Station>[] {
  const full = st.map((s) => ({ z: 0, n: 2.5, ...s }))
  const out: Required<Station>[] = []
  const keys: (keyof Required<Station>)[] = ['x', 'bottom', 'top', 'w', 'z', 'n']
  for (let i = 0; i < full.length - 1; i++) {
    const p0 = full[Math.max(0, i - 1)]
    const p1 = full[i]
    const p2 = full[i + 1]
    const p3 = full[Math.min(full.length - 1, i + 2)]
    for (let k = 0; k < subdiv; k++) {
      const t = k / subdiv
      const s = {} as Required<Station>
      for (const key of keys) s[key] = catmull(p0[key], p1[key], p2[key], p3[key], t)
      s.w = Math.max(0.001, s.w)
      out.push(s)
    }
  }
  out.push(full[full.length - 1])
  return out
}

/**
 * Lofts super-elliptic cross sections along X. Produces a closed, smooth mesh
 * (flat caps at both ends). Ideal for noses, chassis, sidepods, engine covers.
 */
export function loft(stations: Station[], radial = 36, subdiv = 6): THREE.BufferGeometry {
  const rings = interpStations(stations, subdiv)
  const pos: number[] = []
  const idx: number[] = []
  for (const r of rings) {
    const yc = (r.top + r.bottom) / 2
    const hh = Math.max(0.001, (r.top - r.bottom) / 2)
    const hw = r.w / 2
    const e = 2 / r.n
    for (let j = 0; j < radial; j++) {
      const a = (j / radial) * Math.PI * 2
      const c = Math.cos(a)
      const s = Math.sin(a)
      const z = r.z + Math.sign(c) * Math.pow(Math.abs(c), e) * hw
      const y = yc + Math.sign(s) * Math.pow(Math.abs(s), e) * hh
      pos.push(r.x, y, z)
    }
  }
  const nr = rings.length
  for (let i = 0; i < nr - 1; i++) {
    for (let j = 0; j < radial; j++) {
      const a = i * radial + j
      const b = i * radial + ((j + 1) % radial)
      const c = (i + 1) * radial + j
      const d = (i + 1) * radial + ((j + 1) % radial)
      // winding: stations go along -X or +X; normals fixed below
      idx.push(a, c, b, b, c, d)
    }
  }
  // caps (separate vertices so the normals stay flat)
  const addCap = (ring: number, flip: boolean) => {
    const base = pos.length / 3
    const r = rings[ring]
    pos.push(r.x, (r.top + r.bottom) / 2, r.z)
    for (let j = 0; j < radial; j++) {
      const k = (ring * radial + j) * 3
      pos.push(pos[k], pos[k + 1], pos[k + 2])
    }
    for (let j = 0; j < radial; j++) {
      const a = base + 1 + j
      const b = base + 1 + ((j + 1) % radial)
      if (flip) idx.push(base, b, a)
      else idx.push(base, a, b)
    }
  }
  addCap(0, false)
  addCap(nr - 1, true)

  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  // ensure outward winding regardless of station direction
  if (rings[0].x > rings[nr - 1].x) {
    const ix = g.index!.array as Uint32Array | Uint16Array
    for (let i = 0; i < ix.length; i += 3) {
      const t = ix[i + 1]
      ix[i + 1] = ix[i + 2]
      ix[i + 2] = t
    }
  }
  g.computeVertexNormals()
  return g
}

/** NACA-4-like airfoil, inverted (camber downwards) for downforce. Leading edge at origin, chord towards -X. */
export function airfoilShape(chord: number, thickness = 0.12, camber = 0.06, aoaDeg = 0, n = 24): THREE.Shape {
  const pts: THREE.Vector2[] = []
  const p = 0.4
  const upper: THREE.Vector2[] = []
  const lower: THREE.Vector2[] = []
  for (let i = 0; i <= n; i++) {
    const beta = (i / n) * Math.PI
    const xc = (1 - Math.cos(beta)) / 2 // cosine spacing
    const yt = 5 * thickness * (0.2969 * Math.sqrt(xc) - 0.126 * xc - 0.3516 * xc ** 2 + 0.2843 * xc ** 3 - 0.1036 * xc ** 4)
    const yc = xc < p ? (camber / p ** 2) * (2 * p * xc - xc ** 2) : (camber / (1 - p) ** 2) * (1 - 2 * p + 2 * p * xc - xc ** 2)
    // inverted: camber pointing down
    upper.push(new THREE.Vector2(xc, -yc + yt))
    lower.push(new THREE.Vector2(xc, -yc - yt))
  }
  for (const v of upper) pts.push(v)
  for (let i = lower.length - 2; i > 0; i--) pts.push(lower[i])
  // inverted wing: positive aoa raises the trailing edge
  const a = THREE.MathUtils.degToRad(aoaDeg)
  const ca = Math.cos(a)
  const sa = Math.sin(a)
  const shape = new THREE.Shape(
    pts.map((v) => {
      const x = -v.x * chord
      const y = v.y * chord
      // rotate around leading edge; trailing edge (negative x) goes up for positive aoa
      return new THREE.Vector2(x * ca + y * sa, -x * sa + y * ca)
    }),
  )
  return shape
}

/** Extruded wing element spanning z ∈ [-span/2, span/2]. */
export function wingElement(chord: number, span: number, opts: { thickness?: number; camber?: number; aoa?: number } = {}) {
  const shape = airfoilShape(chord, opts.thickness ?? 0.12, opts.camber ?? 0.07, opts.aoa ?? 0)
  const g = new THREE.ExtrudeGeometry(shape, { depth: span, bevelEnabled: false, curveSegments: 4 })
  g.translate(0, 0, -span / 2)
  g.computeVertexNormals()
  return g
}

/** Thin plate from a 2D outline in the XY plane, extruded along Z by `thickness` (centred). */
export function plateXY(outline: [number, number][], thickness: number, bevel = 0) {
  const shape = new THREE.Shape(outline.map(([x, y]) => new THREE.Vector2(x, y)))
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 8,
  })
  g.translate(0, 0, -thickness / 2)
  return g
}

/** Thin plate from a 2D outline in the XZ plane (top view), thickness along Y, bottom at y = 0. */
export function plateXZ(outline: [number, number][], thickness: number) {
  const shape = new THREE.Shape(outline.map(([x, z]) => new THREE.Vector2(x, -z)))
  const g = new THREE.ExtrudeGeometry(shape, { depth: thickness, bevelEnabled: false, curveSegments: 8 })
  g.rotateX(-Math.PI / 2)
  return g
}

/** Tyre: lathe of a rounded rectangle profile, axis along Z. */
export function tyreGeometry(outerR: number, innerR: number, width: number, seg = 48) {
  const pts: THREE.Vector2[] = []
  const hw = width / 2
  const corner = Math.min(0.06, (outerR - innerR) * 0.45)
  pts.push(new THREE.Vector2(innerR, -hw * 0.92))
  pts.push(new THREE.Vector2(innerR + 0.02, -hw))
  // sidewall up to shoulder
  pts.push(new THREE.Vector2(outerR - corner, -hw))
  for (let i = 1; i <= 6; i++) {
    const a = -Math.PI / 2 + (i / 6) * (Math.PI / 2)
    pts.push(new THREE.Vector2(outerR - corner + Math.cos(a) * corner, -hw + corner + Math.sin(a) * corner))
  }
  for (let i = 0; i <= 6; i++) {
    const a = (i / 6) * (Math.PI / 2)
    pts.push(new THREE.Vector2(outerR - corner + Math.cos(a) * corner, hw - corner + Math.sin(a) * corner))
  }
  pts.push(new THREE.Vector2(innerR + 0.02, hw))
  pts.push(new THREE.Vector2(innerR, hw * 0.92))
  const g = new THREE.LatheGeometry(pts, seg)
  g.rotateX(Math.PI / 2)
  return g
}

/** Smooth tube following points. */
export function tube(points: [number, number, number][], radius: number, segments = 64, closed = false) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)), closed, 'catmullrom', 0.5)
  return new THREE.TubeGeometry(curve, segments, radius, 10, closed)
}

/** Position + quaternion + scale for a unit cylinder (radius 1, height 1, axis Y) between two points. */
export function strutTransform(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, radius: number) {
  const va = new THREE.Vector3(...a)
  const vb = new THREE.Vector3(...b)
  const dir = vb.clone().sub(va)
  const len = dir.length()
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize())
  const mid = va.add(vb).multiplyScalar(0.5)
  return {
    position: mid.toArray() as THREE.Vector3Tuple,
    quaternion: q,
    scale: [radius, len, radius] as THREE.Vector3Tuple,
  }
}
