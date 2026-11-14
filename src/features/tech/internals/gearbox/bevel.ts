import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { gearGeometry } from '../three/geom'

/**
 * Straight bevel gear: an involute spur gear wrapped onto its pitch cone. The cone apex is at the
 * origin, the gear axis is +Z and the teeth sit at distance L (cone distance) from the apex, the
 * face width going towards the apex. `delta` = pitch cone half angle.
 */
export function bevelGeometry(teeth: number, module: number, width: number, delta: number, bore = 0) {
  const R = (teeth * module) / 2
  const L = R / Math.sin(delta)
  const g = gearGeometry({ teeth, module, bore }, width)
  const pos = g.attributes.position as THREE.BufferAttribute
  const sd = Math.sin(delta)
  const cd = Math.cos(delta)
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i)
    const y = pos.getY(i)
    const z = pos.getZ(i) + width / 2 // 0 = outer end … width = towards the apex
    const rho = Math.hypot(x, y)
    const phi = Math.atan2(y, x)
    const k = (L - z) / L
    const h = (rho - R) * k
    const rr = R * k + h * cd
    pos.setXYZ(i, rr * Math.cos(phi), rr * Math.sin(phi), (L - z) * cd - h * sd)
  }
  pos.needsUpdate = true
  g.computeVertexNormals()
  return g
}

/** Cone distance (apex → pitch circle) of a bevel gear. */
export const coneDistance = (teeth: number, module: number, delta: number) => (teeth * module) / 2 / Math.sin(delta)

/** Merges geometries after converting them to non-indexed (attributes position/normal/uv). */
export function merge(geos: THREE.BufferGeometry[]) {
  const list = geos.map((g) => {
    const n = g.index ? g.toNonIndexed() : g
    if (!n.attributes.uv) n.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(n.attributes.position.count * 2), 2))
    for (const k of Object.keys(n.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') n.deleteAttribute(k)
    return n
  })
  const out = mergeGeometries(list, false)
  for (const g of geos) g.dispose()
  for (const g of list) g.dispose()
  return out ?? new THREE.BufferGeometry()
}

/** Dog teeth (crabots) arranged on a face: `n` blocks at radius r, from z0 extending dz (signed). */
export function dogs(n: number, r: number, z0: number, dz: number, w = 8, h = 7) {
  const out: THREE.BufferGeometry[] = []
  for (let i = 0; i < n; i++) {
    const a = (2 * Math.PI * i) / n
    const b = new THREE.BoxGeometry(h, w, Math.abs(dz))
    b.translate(r, 0, z0 + dz / 2)
    b.rotateZ(a)
    out.push(b)
  }
  return out
}
