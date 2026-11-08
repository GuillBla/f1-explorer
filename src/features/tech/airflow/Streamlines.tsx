import { useEffect, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useTunnelStore, type ColorBy } from '../store'
import { lutIndex, scalar, TURBO_LUT } from './colormap'
import { FlowField, OUT_SIZE } from './field'
import { visualSpeed, X_INLET } from './Particles'
import { createStreamlineMaterial } from './shaders'

const STEP = 0.045
const MAX_STEPS = 520

/** Seeds of the smoke rake: a grid upstream of the car plus a few lines aimed under the floor. */
function seeds(): [number, number, number][] {
  const out: [number, number, number][] = []
  const ys = [0.05, 0.16, 0.3, 0.48, 0.7, 0.95]
  for (const y of ys) for (let i = 0; i < 13; i++) out.push([X_INLET, y, -1.2 + (i * 2.4) / 12])
  for (const z of [-0.6, -0.45, -0.3, 0.3, 0.45, 0.6]) out.push([X_INLET, 0.035, z])
  return out
}

/** Integrates steady streamlines (RK2) and packs them into one LineSegments geometry. */
function buildStreamlines(rideHeight: number, open: boolean, colorBy: ColorBy, xEnd: number) {
  const field = new FlowField({ rideHeight, open })
  const out = new Float32Array(OUT_SIZE)
  const pos: number[] = []
  const col: number[] = []
  const arc: number[] = []
  for (const s of seeds()) {
    let [x, y, z] = s
    if (y < 0.06) y += Math.max(0, rideHeight - 0.03) * 0.6
    let len = Math.random() * 0.6 // random phase so dashes do not march in lockstep
    let prev: [number, number, number, number] | null = null
    for (let k = 0; k < MAX_STEPS; k++) {
      field.sample(x, y, z, out)
      const u1 = out[0]
      const v1 = out[1]
      const w1 = out[2]
      const sp2 = u1 * u1 + v1 * v1 + w1 * w1
      const loss = out[8]
      const n1 = Math.sqrt(sp2) || 1
      // midpoint
      field.sample(x + (u1 / n1) * STEP * 0.5, y + (v1 / n1) * STEP * 0.5, z + (w1 / n1) * STEP * 0.5, out)
      const n2 = Math.hypot(out[0], out[1], out[2]) || 1
      const nx = x + (out[0] / n2) * STEP
      let ny = y + (out[1] / n2) * STEP
      const nz = z + (out[2] / n2) * STEP
      if (ny < 0.003) ny = 0.003
      const li = lutIndex(scalar(colorBy, sp2, loss))
      const cur: [number, number, number, number] = [x, y, z, li]
      if (prev) {
        pos.push(prev[0], prev[1], prev[2], cur[0], cur[1], cur[2])
        col.push(TURBO_LUT[prev[3]], TURBO_LUT[prev[3] + 1], TURBO_LUT[prev[3] + 2], TURBO_LUT[li], TURBO_LUT[li + 1], TURBO_LUT[li + 2])
        arc.push(len - STEP, len)
      }
      prev = cur
      x = nx
      y = ny
      z = nz
      len += STEP
      if (x < xEnd || Math.abs(z) > 2.4 || y > 2.4) break
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.setAttribute('aColor', new THREE.Float32BufferAttribute(col, 3))
  g.setAttribute('aS', new THREE.Float32BufferAttribute(arc, 1))
  return g
}

export function Streamlines({ xEnd }: { xEnd: number }) {
  const rideHeight = useDebounced(useTunnelStore((s) => s.rideHeight), 180)
  const open = useTunnelStore((s) => s.drs)
  const colorBy = useTunnelStore((s) => s.colorBy)
  const display = useTunnelStore((s) => s.display)
  const visible = display !== 'particles'

  const geometry = useMemo(
    () => (visible ? buildStreamlines(rideHeight / 1000, open, colorBy, xEnd) : null),
    [rideHeight, open, colorBy, xEnd, visible],
  )
  useEffect(() => () => geometry?.dispose(), [geometry])
  const material = useMemo(() => createStreamlineMaterial(), [])
  useEffect(() => () => material.dispose(), [material])

  useFrame((state) => {
    const st = useTunnelStore.getState()
    if (!st.paused) material.uniforms.uTime.value = state.clock.elapsedTime
    material.uniforms.uSpeed.value = visualSpeed(st.speed) * 0.25
    material.uniforms.uOpacity.value = st.display === 'both' ? 0.55 : 0.9
  })

  if (!geometry) return null
  return <lineSegments geometry={geometry} material={material} frustumCulled={false} />
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}
