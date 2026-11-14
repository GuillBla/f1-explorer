import * as THREE from 'three'
import { BORE, COMP_H, CYLS, DECK, PITCH, R, ROD, VALVE } from './kinematics'

/* All dimensions in millimetres (the scene group is scaled by 0.01). */

export const VALVE_ANGLE = 14 // degrees from the bore axis
export const STEM = 82
export const TAPPET = 10
export const CAM_BASE = 15
export const VALVE_X = 16 // seat offset from the bore axis
export const VALVE_Z = 17 // half spacing of the two valves of a pair
export const SEAT_Y = DECK + 2
export const INTAKE_R = 15
export const EXHAUST_R = 13
export const HEAD_TOP = DECK + 132
export const BLOCK_BOTTOM = 62

/** Piston: domed crown, three ring grooves, short skirt, hollow underside (lathe around y, origin at the pin). */
export function pistonGeometry() {
  const p: [number, number][] = [
    [0, COMP_H + 0.8],
    [18, COMP_H + 0.6],
    [30, COMP_H],
    [37, COMP_H - 0.8],
    [39.6, COMP_H - 1.8],
    [39.6, 20.5],
    [37.6, 20.5],
    [37.6, 19],
    [39.6, 19],
    [39.6, 17],
    [37.6, 17],
    [37.6, 15.6],
    [39.6, 15.6],
    [39.6, 13.4],
    [37.2, 13.4],
    [37.2, 10.4],
    [39.6, 10.4],
    [39.6, 2],
    [39.3, -13],
    [38.4, -16],
    [35.2, -16],
    [35.2, 6],
    [14, 11],
    [0, 11],
  ]
  const g = new THREE.LatheGeometry(
    p.reverse().map(([x, y]) => new THREE.Vector2(x, y)),
    48,
  )
  g.computeVertexNormals()
  return g
}

/** Piston rings (two compression rings + oil ring), sitting in the grooves. */
export function ringGeometries() {
  const mk = (y: number, tube: number) => {
    const g = new THREE.TorusGeometry(BORE / 2 - 1.3, tube, 6, 48)
    g.rotateX(Math.PI / 2)
    g.translate(0, y, 0)
    return g
  }
  return [mk(19.75, 0.85), mk(16.3, 0.8), mk(11.9, 1.4)]
}

/**
 * I-section connecting rod: an outer frame (big end, small end, flanges) with a pocket in the beam,
 * plus a thinner central web. Big end at the origin, small end at (0, ROD); thickness along z.
 */
export function conrodGeometries() {
  const outline = () => {
    const s = new THREE.Shape()
    s.absarc(0, 0, 28, Math.PI * 0.62, Math.PI * 0.38 + Math.PI * 2, false)
    s.absarc(0, ROD, 13, -0.35, Math.PI + 0.35, false)
    s.closePath()
    return s
  }
  const pocket = (shrink: number) => {
    const p = new THREE.Path()
    p.moveTo(-8 + shrink, 36)
    p.lineTo(8 - shrink, 36)
    p.lineTo(4.6 - shrink, ROD - 20)
    p.lineTo(-4.6 + shrink, ROD - 20)
    p.closePath()
    return p
  }
  const frame = outline()
  const big = new THREE.Path()
  big.absarc(0, 0, 20.5, 0, Math.PI * 2, true)
  const small = new THREE.Path()
  small.absarc(0, ROD, 9, 0, Math.PI * 2, true)
  frame.holes.push(big, small, pocket(0))
  const T = 18
  const frameGeo = new THREE.ExtrudeGeometry(frame, { depth: T, bevelEnabled: true, bevelThickness: 0.8, bevelSize: 0.8, bevelSegments: 1, curveSegments: 24 })
  frameGeo.translate(0, 0, -T / 2)
  const webShape = new THREE.Shape()
  webShape.moveTo(-8.5, 35)
  webShape.lineTo(8.5, 35)
  webShape.lineTo(5, ROD - 19)
  webShape.lineTo(-5, ROD - 19)
  webShape.closePath()
  const W = 5
  const webGeo = new THREE.ExtrudeGeometry(webShape, { depth: W, bevelEnabled: false })
  webGeo.translate(0, 0, -W / 2)
  // big-end bearing shell + cap bolts
  const shell = new THREE.CylinderGeometry(20.5, 20.5, T - 1, 32, 1, true)
  shell.rotateX(Math.PI / 2)
  const bolt = new THREE.CylinderGeometry(3.2, 3.2, 26, 10)
  return { frameGeo, webGeo, shell, bolt }
}

/** Crank web with counterweight, extruded along z; pin centre at (0, R), journal at the origin. */
export function crankWebGeometry(thickness: number) {
  const s = new THREE.Shape()
  s.absarc(0, R, 27, (10 * Math.PI) / 180, (170 * Math.PI) / 180, false)
  s.absarc(0, 0, 60, (205 * Math.PI) / 180, (335 * Math.PI) / 180, false)
  s.closePath()
  const g = new THREE.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: true, bevelThickness: 1.2, bevelSize: 1.2, bevelSegments: 2, curveSegments: 20 })
  g.translate(0, 0, -thickness / 2)
  return g
}

/** Valve: tulip head + stem along +y (head face at y = 0). */
export function valveGeometry(headR: number) {
  const p: [number, number][] = [
    [0, 0],
    [headR, 0],
    [headR, 1.4],
    [headR - 2.5, 2.8],
    [5, 8],
    [3, 12],
    [3, STEM - 4],
    [3.6, STEM - 3],
    [3.6, STEM],
    [0, STEM],
  ]
  return new THREE.LatheGeometry(
    p.map(([x, y]) => new THREE.Vector2(x, y)),
    24,
  )
}

/** Cam lobe profile (cos² flank), nose towards +y, extruded along z. */
export function camLobeGeometry(v: { open: number; close: number; lift: number }, width: number) {
  const halfWidth = (((v.close - v.open) / 4) * Math.PI) / 180 // cam half-width (rad)
  const s = new THREE.Shape()
  const N = 72
  for (let i = 0; i <= N; i++) {
    const phi = (i / N) * Math.PI * 2 - Math.PI
    const a = Math.abs(phi)
    const lift = a < halfWidth ? v.lift * Math.pow(Math.cos(((a / halfWidth) * Math.PI) / 2), 2) : 0
    const r = CAM_BASE + lift
    const x = -r * Math.sin(phi)
    const y = r * Math.cos(phi)
    if (i === 0) s.moveTo(x, y)
    else s.lineTo(x, y)
  }
  const g = new THREE.ExtrudeGeometry(s, { depth: width, bevelEnabled: true, bevelThickness: 0.6, bevelSize: 0.6, bevelSegments: 1 })
  g.translate(0, 0, -width / 2)
  return g
}

export const INTAKE_LOBE = VALVE.intake
export const EXHAUST_LOBE = VALVE.exhaust

/** z extent of a bank's cylinders. */
export function bankZ(bank: 'A' | 'B') {
  const zs = CYLS.filter((c) => c.bank === bank).map((c) => c.z)
  return { min: Math.min(...zs) - PITCH / 2 - 4, max: Math.max(...zs) + PITCH / 2 + 4, zs }
}

/** Shape in the (x, −z) plane, extruded along +y after rotation. */
function extrudeY(shape: THREE.Shape, y0: number, height: number, curveSegments = 32) {
  const g = new THREE.ExtrudeGeometry(shape, { depth: height, bevelEnabled: false, curveSegments })
  g.rotateX(-Math.PI / 2)
  g.translate(0, y0, 0)
  return g
}

function rect(x0: number, x1: number, z0: number, z1: number, hole = false) {
  const p = hole ? new THREE.Path() : new THREE.Shape()
  // shape y = −z (see extrudeY)
  p.moveTo(x0, -z0)
  if (hole) {
    p.lineTo(x0, -z1)
    p.lineTo(x1, -z1)
    p.lineTo(x1, -z0)
  } else {
    p.lineTo(x1, -z0)
    p.lineTo(x1, -z1)
    p.lineTo(x0, -z1)
  }
  p.closePath()
  return p
}

function circle(x: number, z: number, r: number) {
  const h = new THREE.Path()
  h.absarc(x, -z, r, 0, Math.PI * 2, true)
  return h
}

/** Cylinder block of one bank (bank frame): bores through, from BLOCK_BOTTOM to DECK. */
export function bankBlockGeometry(bank: 'A' | 'B') {
  const { min, max, zs } = bankZ(bank)
  const s = rect(-56, 56, min, max) as THREE.Shape
  for (const z of zs) s.holes.push(circle(0, z, BORE / 2 + 0.6))
  // coolant passages between the bores
  for (let i = 0; i < zs.length - 1; i++) {
    const zm = (zs[i] + zs[i + 1]) / 2
    s.holes.push(circle(-44, zm, 5), circle(44, zm, 5))
  }
  return extrudeY(s, BLOCK_BOTTOM, DECK - BLOCK_BOTTOM, 40)
}

/** Fire deck (head gasket face) with the valve ports and the pre-chamber / spark plug hole. */
export function deckGeometry(bank: 'A' | 'B') {
  const { min, max, zs } = bankZ(bank)
  const s = rect(-80, 80, min, max) as THREE.Shape
  for (const z of zs) {
    s.holes.push(circle(VALVE_X, z - VALVE_Z, INTAKE_R - 1), circle(VALVE_X, z + VALVE_Z, INTAKE_R - 1))
    s.holes.push(circle(-VALVE_X, z - VALVE_Z, EXHAUST_R - 1), circle(-VALVE_X, z + VALVE_Z, EXHAUST_R - 1))
  }
  return extrudeY(s, DECK, 10, 24)
}

/** Hollow cam box (walls only) above the deck. */
export function headWallsGeometry(bank: 'A' | 'B') {
  const { min, max } = bankZ(bank)
  const s = rect(-82, 82, min, max) as THREE.Shape
  s.holes.push(rect(-74, 74, min + 8, max - 8, true) as THREE.Path)
  return extrudeY(s, DECK + 10, HEAD_TOP - DECK - 10)
}

/** Cam cover plate on top of the head. */
export function camCoverGeometry(bank: 'A' | 'B') {
  const { min, max } = bankZ(bank)
  const g = new THREE.BoxGeometry(164, 8, max - min)
  g.translate(0, HEAD_TOP + 4, (min + max) / 2)
  return g
}

/** Crankcase: U channel (open top) along z + main bearing bulkheads. */
export function crankcaseGeometries() {
  const zMin = -PITCH * 1.5 - 30
  const zMax = PITCH * 1.5 + 30
  const len = zMax - zMin
  const u = (inner: number) => {
    const s = new THREE.Shape()
    s.moveTo(-82, 6)
    s.lineTo(-88, -40)
    s.lineTo(-60, -84)
    s.lineTo(60, -84)
    s.lineTo(88, -40)
    s.lineTo(82, 6)
    const a0 = Math.asin(6 / inner)
    s.lineTo(inner * Math.cos(a0), 6)
    s.absarc(0, 0, inner, a0, -Math.PI - a0, true)
    s.closePath()
    return s
  }
  const channel = new THREE.ExtrudeGeometry(u(72), { depth: len, bevelEnabled: false, curveSegments: 40 })
  channel.translate(0, 0, zMin)
  const bulk = new THREE.ExtrudeGeometry(u(24), { depth: 16, bevelEnabled: false, curveSegments: 24 })
  bulk.translate(0, 0, -8)
  return { channel, bulk, zMin, zMax }
}

/** Combustion gas volume (unit height, scaled per frame). */
export function gasGeometry() {
  const g = new THREE.CylinderGeometry(BORE / 2 - 0.8, BORE / 2 - 0.8, 1, 32)
  g.translate(0, 0.5, 0)
  return g
}

/** Flame jet leaving the pre-chamber (cone pointing along −y, apex at origin). */
export function jetGeometry() {
  const g = new THREE.ConeGeometry(2.6, 24, 10, 1, true)
  g.translate(0, -12, 0) // apex at the origin, widening downwards
  return g
}
