import * as THREE from 'three'

/** Incandescence of carbon vs temperature (approximate colours of a glowing disc). */
export const TEMP_STOPS: [number, THREE.Color, number][] = [
  [300, new THREE.Color('#200400'), 0],
  [450, new THREE.Color('#6a0a00'), 0.35],
  [600, new THREE.Color('#c41a00'), 0.7],
  [750, new THREE.Color('#ff3c00'), 0.95],
  [900, new THREE.Color('#ff8a10'), 1.2],
  [1050, new THREE.Color('#ffd76a'), 1.5],
]
const _c = new THREE.Color()
/** Incandescence colour + intensity for a disc temperature. */
export function glowFor(t: number): [THREE.Color, number] {
  if (t <= TEMP_STOPS[0][0]) return [_c.copy(TEMP_STOPS[0][1]), 0]
  for (let i = 1; i < TEMP_STOPS.length; i++) {
    const [t1, c1, i1] = TEMP_STOPS[i]
    const [t0, c0, i0] = TEMP_STOPS[i - 1]
    if (t <= t1) {
      const k = (t - t0) / (t1 - t0)
      return [_c.copy(c0).lerp(c1, k), i0 + (i1 - i0) * k]
    }
  }
  const last = TEMP_STOPS[TEMP_STOPS.length - 1]
  return [_c.copy(last[1]), last[2]]
}

