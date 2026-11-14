import * as THREE from 'three'

/* Turbocharger geometry, millimetres, shaft along x. Compressor towards +x, turbine towards −x. */

export interface WheelSpec {
  /** +1: eye faces +x (compressor), −1: exducer faces −x (turbine). */
  dir: 1 | -1
  blades: number
  /** Exit (compressor) / inlet (turbine) tip radius. */
  r2: number
  /** Eye shroud radius. */
  rEye: number
  hubR: number
  /** Axial length. */
  len: number
  /** Blade height at the tip. */
  tipH: number
  /** Blade wrap angle (rad) from eye to tip (backsweep). */
  wrap: number
}

const hubCurve = (w: WheelSpec, s: number) => {
  const q = (s * Math.PI) / 2
  return { x: w.len * (1 - Math.sin(q)), r: w.hubR + (w.r2 - w.hubR) * (1 - Math.cos(q)) }
}
const shroudCurve = (w: WheelSpec, s: number) => {
  const q = (s * Math.PI) / 2
  return { x: w.tipH + (w.len - w.tipH) * (1 - Math.sin(q)), r: w.rEye + (w.r2 - w.rEye) * (1 - Math.cos(q)) }
}

/** Hub body (lathe of the hub curve), axis x. */
export function hubGeometry(w: WheelSpec) {
  const pts: THREE.Vector2[] = [new THREE.Vector2(0, w.len + 6)]
  pts.push(new THREE.Vector2(w.hubR * 0.7, w.len + 6))
  for (let i = 0; i <= 20; i++) {
    const h = hubCurve(w, i / 20)
    pts.push(new THREE.Vector2(h.r, h.x))
  }
  pts.push(new THREE.Vector2(w.r2, -3), new THREE.Vector2(10, -6), new THREE.Vector2(0, -6))
  const g = new THREE.LatheGeometry(pts.reverse(), 48)
  g.rotateZ(-Math.PI / 2) // y axis -> x axis
  if (w.dir < 0) g.scale(-1, 1, 1)
  g.computeVertexNormals()
  return g
}

/** All blades of a radial wheel as one geometry (thin double-sided surfaces with a small thickness). */
export function bladesGeometry(w: WheelSpec, splitters = false) {
  const NS = 18
  const NH = 4
  const pos: number[] = []
  const idx: number[] = []
  const addBlade = (theta0: number, sStart: number) => {
    for (const side of [-1, 1]) {
      const base = pos.length / 3
      for (let i = 0; i <= NS; i++) {
        const s = sStart + ((1 - sStart) * i) / NS
        const h0 = hubCurve(w, s)
        const h1 = shroudCurve(w, s)
        for (let j = 0; j <= NH; j++) {
          const t = j / NH
          const x = h0.x + (h1.x - h0.x) * t
          const r = h0.r + (h1.r - h0.r) * t
          const th = theta0 + w.wrap * (1 - s) * (1 - s) + (side * 0.9) / r
          pos.push(w.dir * x, r * Math.cos(th), r * Math.sin(th))
        }
      }
      for (let i = 0; i < NS; i++)
        for (let j = 0; j < NH; j++) {
          const a = base + i * (NH + 1) + j
          const b = a + NH + 1
          if (side > 0) idx.push(a, b, a + 1, b, b + 1, a + 1)
          else idx.push(a, a + 1, b, b, a + 1, b + 1)
        }
    }
  }
  for (let k = 0; k < w.blades; k++) {
    const th = (k / w.blades) * Math.PI * 2
    addBlade(th, 0)
    if (splitters) addBlade(th + Math.PI / w.blades, 0.4)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/**
 * Volute (snail housing): a tube wrapped around the x axis whose section grows with the angle,
 * ending in a tangential pipe. `x0`: axial position, `rc0`: centreline radius at the tongue.
 */
export function voluteGeometry(x0: number, rc0: number, rt0: number, rt1: number, exitLen: number) {
  const NT = 64
  const NP = 20
  const pos: number[] = []
  const idx: number[] = []
  const ring = (c: THREE.Vector3, e1: THREE.Vector3, e2: THREE.Vector3, rt: number) => {
    for (let j = 0; j <= NP; j++) {
      const p = (j / NP) * Math.PI * 2
      pos.push(c.x + rt * (Math.cos(p) * e1.x + Math.sin(p) * e2.x), c.y + rt * (Math.cos(p) * e1.y + Math.sin(p) * e2.y), c.z + rt * (Math.cos(p) * e1.z + Math.sin(p) * e2.z))
    }
  }
  const ex = new THREE.Vector3(1, 0, 0)
  let rings = 0
  for (let i = 0; i <= NT; i++) {
    const t = (i / NT) * Math.PI * 2
    const rt = rt0 + (rt1 - rt0) * (i / NT)
    const rc = rc0 + rt
    const er = new THREE.Vector3(0, Math.cos(t), Math.sin(t))
    ring(new THREE.Vector3(x0, rc * Math.cos(t), rc * Math.sin(t)), er, ex, rt)
    rings++
  }
  // tangential exit pipe (continues along the tangent at t = 2π, i.e. +z direction)
  const rcEnd = rc0 + rt1
  for (let i = 1; i <= 6; i++) {
    const z = (exitLen * i) / 6
    ring(new THREE.Vector3(x0, rcEnd, z), new THREE.Vector3(0, 1, 0), ex, rt1)
    rings++
  }
  for (let i = 0; i < rings - 1; i++)
    for (let j = 0; j < NP; j++) {
      const a = i * (NP + 1) + j
      const b = a + NP + 1
      idx.push(a, a + 1, b, b, a + 1, b + 1)
    }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Centreline points of a volute (for particle paths): eye → spiral → exit (compressor) or reverse. */
export function voluteCurve(x0: number, rc0: number, rt0: number, rt1: number, exitLen: number, eyeX: number, eyeR: number, jitter = 0) {
  const pts: THREE.Vector3[] = []
  const jr = (Math.random() - 0.5) * jitter
  const jx = (Math.random() - 0.5) * jitter
  const t0 = Math.random() * Math.PI * 2
  pts.push(new THREE.Vector3(eyeX + 60 * Math.sign(eyeX), Math.cos(t0) * eyeR * 0.5, Math.sin(t0) * eyeR * 0.5))
  pts.push(new THREE.Vector3(eyeX, Math.cos(t0) * eyeR * 0.6, Math.sin(t0) * eyeR * 0.6))
  // through the wheel (radially outwards, swirling)
  for (let k = 1; k <= 3; k++) {
    const a = t0 + k * 0.5
    const r = eyeR * 0.6 + (rc0 - eyeR * 0.6) * (k / 3)
    pts.push(new THREE.Vector3(x0 + (eyeX - x0) * (1 - k / 3) * 0.6, r * Math.cos(a), r * Math.sin(a)))
  }
  // spiral to the tongue (t = 2π)
  const aStart = t0 + 1.5
  const N = 16
  for (let k = 0; k <= N; k++) {
    const a = aStart + ((2 * Math.PI - (aStart % (2 * Math.PI))) * k) / N
    const f = (a % (2 * Math.PI)) / (2 * Math.PI)
    const rc = rc0 + rt0 + (rt1 - rt0) * f + jr
    pts.push(new THREE.Vector3(x0 + jx, rc * Math.cos(a), rc * Math.sin(a)))
  }
  pts.push(new THREE.Vector3(x0 + jx, rc0 + rt1 + jr, exitLen * 0.5), new THREE.Vector3(x0 + jx, rc0 + rt1 + jr, exitLen))
  return pts
}
