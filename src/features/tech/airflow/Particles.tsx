import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useTunnelStore } from '../store'
import { lutIndex, scalar, TURBO_LUT } from './colormap'
import { OUT_SIZE, type FlowField } from './field'
import { createPointMaterial, createStreakMaterial } from './shaders'

export const X_INLET = 3.8

/** Visual (slowed-down) advection speed in scene metres per second for a given air speed. */
export function visualSpeed(kmh: number) {
  return 1.5 + kmh / 45
}

/** Vortex seeding points (car-local, y offset added at runtime). */
const VORTEX_SEEDS: [number, number, number][] = [
  [2.62, 0.15, 0.9],
  [2.62, 0.15, -0.9],
  [2.62, 0.12, 0.25],
  [2.62, 0.12, -0.25],
  [-2.25, 0.95, 0.5],
  [-2.25, 0.95, -0.5],
  [1.35, 0.05, 0.55],
  [1.35, 0.05, -0.55],
]

interface Props {
  field: FlowField
  count: number
  xEnd: number
  /** Ride height offset applied to the seeds (world y = local + offset). */
  rideOffset: { current: number }
}

/**
 * Thousands of particles advected through the analytic field. Each particle is drawn as a
 * glowing head (Points) and a velocity-aligned streak (LineSegments), coloured by speed or Cp.
 * All buffers are pre-allocated; the per-frame loop does not allocate.
 */
export function Particles({ field, count, xEnd, rideOffset }: Props) {
  const gl = useThree((s) => s.gl)
  const sim = useMemo(() => {
    const pos = new Float32Array(count * 3)
    const age = new Float32Array(count)
    const maxAge = new Float32Array(count)
    const seed = new Float32Array(count)
    for (let i = 0; i < count; i++) seed[i] = Math.random() * 100
    // adaptive quality: number of simulated particles, reduced if frames get too slow
    return { pos, age, maxAge, seed, active: count, frameAcc: 0, frameN: 0 }
  }, [count])

  const objects = useMemo(() => {
    const streakGeo = new THREE.BufferGeometry()
    streakGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage))
    streakGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 6), 3).setUsage(THREE.DynamicDrawUsage))
    streakGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count * 2), 1).setUsage(THREE.DynamicDrawUsage))
    const headGeo = new THREE.BufferGeometry()
    headGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage))
    headGeo.setAttribute('aColor', new THREE.BufferAttribute(new Float32Array(count * 3), 3).setUsage(THREE.DynamicDrawUsage))
    headGeo.setAttribute('aAlpha', new THREE.BufferAttribute(new Float32Array(count), 1).setUsage(THREE.DynamicDrawUsage))
    const streakMat = createStreakMaterial()
    const headMat = createPointMaterial(34)
    const lines = new THREE.LineSegments(streakGeo, streakMat)
    const points = new THREE.Points(headGeo, headMat)
    lines.frustumCulled = false
    points.frustumCulled = false
    return { streakGeo, headGeo, streakMat, headMat, lines, points }
  }, [count])

  useEffect(
    () => () => {
      objects.streakGeo.dispose()
      objects.headGeo.dispose()
      objects.streakMat.dispose()
      objects.headMat.dispose()
    },
    [objects],
  )

  // initial fill of the whole domain
  useEffect(() => {
    for (let i = 0; i < count; i++) spawn(i, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim, xEnd])

  function spawn(i: number, anywhere: boolean) {
    const { pos, age, maxAge } = sim
    const st = useTunnelStore.getState()
    const o = i * 3
    if (st.showVortices && Math.random() < 0.4) {
      const sd = VORTEX_SEEDS[(Math.random() * VORTEX_SEEDS.length) | 0]
      const a = Math.random() * Math.PI * 2
      const r = Math.random() * 0.07
      pos[o] = sd[0] + (Math.random() - 0.5) * 0.1
      pos[o + 1] = Math.max(0.01, sd[1] + rideOffset.current + Math.sin(a) * r)
      pos[o + 2] = sd[2] + Math.cos(a) * r
    } else {
      pos[o] = anywhere ? xEnd + Math.random() * (X_INLET - xEnd) : X_INLET + Math.random() * 0.3
      pos[o + 1] = 0.006 + 1.55 * Math.pow(Math.random(), 1.7)
      pos[o + 2] = (Math.random() * 2 - 1) * 1.55
    }
    age[i] = anywhere ? Math.random() * 0.3 : 0
    maxAge[i] = 6 + Math.random() * 6
  }

  const out = useMemo(() => new Float32Array(OUT_SIZE), [])

  useFrame((state, rawDt) => {
    const st = useTunnelStore.getState()
    const dt = Math.min(rawDt, 1 / 30)
    const show = st.display !== 'streamlines'
    objects.lines.visible = show
    objects.points.visible = show
    if (!show) return
    objects.headMat.uniforms.uPixelRatio.value = gl.getPixelRatio()
    // adaptive particle count: average frame time over ~1 s
    sim.frameAcc += rawDt
    sim.frameN++
    if (sim.frameAcc > 1) {
      const avg = sim.frameAcc / sim.frameN
      if (avg > 1 / 45 && sim.active > 1500) sim.active = Math.max(1500, Math.floor(sim.active * 0.8))
      else if (avg < 1 / 58 && sim.active < count) sim.active = Math.min(count, Math.ceil(sim.active * 1.1))
      sim.frameAcc = 0
      sim.frameN = 0
      objects.streakGeo.setDrawRange(0, sim.active * 2)
      objects.headGeo.setDrawRange(0, sim.active)
    }
    const active = sim.active
    const U = visualSpeed(st.speed)
    const t = state.clock.elapsedTime
    const { pos, age, maxAge, seed } = sim
    const sPos = objects.streakGeo.attributes.position.array as Float32Array
    const sCol = objects.streakGeo.attributes.aColor.array as Float32Array
    const sAl = objects.streakGeo.attributes.aAlpha.array as Float32Array
    const hPos = objects.headGeo.attributes.position.array as Float32Array
    const hCol = objects.headGeo.attributes.aColor.array as Float32Array
    const hAl = objects.headGeo.attributes.aAlpha.array as Float32Array
    const colorBy = st.colorBy
    const streak = 0.05 + U * 0.022

    for (let i = 0; i < active; i++) {
      const o = i * 3
      let x = pos[o]
      let y = pos[o + 1]
      let z = pos[o + 2]
      field.sample(x, y, z, out)
      const ux = out[0]
      const uy = out[1]
      const uz = out[2]
      if (!st.paused) {
        // turbulence: cheap pseudo-random, per-particle phase
        const tb = out[3] * 0.9
        const ph = seed[i]
        const nx = tb * Math.sin(3.1 * y + 2.3 * z + 5.0 * t + ph)
        const ny = tb * Math.sin(2.7 * z - 3.3 * x + 6.1 * t + ph * 1.3)
        const nz = tb * Math.sin(3.7 * x + 1.9 * y - 5.7 * t + ph * 0.7)
        x += (ux + nx) * U * dt
        y += (uy + ny) * U * dt
        z += (uz + nz) * U * dt
        if (out[4] < 0) {
          // pushed back outside the bodywork
          const push = -out[4] + 0.004
          x += out[5] * push
          y += out[6] * push
          z += out[7] * push
        }
        if (y < 0.003) y = 0.003
        age[i] += dt
        pos[o] = x
        pos[o + 1] = y
        pos[o + 2] = z
        if (x < xEnd || x > X_INLET + 1 || y > 2.6 || Math.abs(z) > 2.6 || age[i] > maxAge[i]) {
          spawn(i, false)
          x = pos[o]
          y = pos[o + 1]
          z = pos[o + 2]
        }
      }
      const sp2 = ux * ux + uy * uy + uz * uz
      const li = lutIndex(scalar(colorBy, sp2, out[8]))
      const r = TURBO_LUT[li]
      const g = TURBO_LUT[li + 1]
      const b = TURBO_LUT[li + 2]
      const fade = Math.min(1, age[i] * 4) * Math.min(1, (maxAge[i] - age[i]) * 2) * Math.min(1, (x - xEnd) * 0.8)
      const o6 = i * 6
      sPos[o6] = x
      sPos[o6 + 1] = y
      sPos[o6 + 2] = z
      sPos[o6 + 3] = x - ux * streak
      sPos[o6 + 4] = y - uy * streak
      sPos[o6 + 5] = z - uz * streak
      sCol[o6] = r
      sCol[o6 + 1] = g
      sCol[o6 + 2] = b
      sCol[o6 + 3] = r
      sCol[o6 + 4] = g
      sCol[o6 + 5] = b
      sAl[i * 2] = fade
      sAl[i * 2 + 1] = 0
      hPos[o] = x
      hPos[o + 1] = y
      hPos[o + 2] = z
      hCol[o] = r
      hCol[o + 1] = g
      hCol[o + 2] = b
      hAl[i] = fade * 0.9
    }
    objects.streakGeo.attributes.position.needsUpdate = true
    objects.streakGeo.attributes.aColor.needsUpdate = true
    objects.streakGeo.attributes.aAlpha.needsUpdate = true
    objects.headGeo.attributes.position.needsUpdate = true
    objects.headGeo.attributes.aColor.needsUpdate = true
    objects.headGeo.attributes.aAlpha.needsUpdate = true
  })

  return (
    <>
      <primitive object={objects.lines} />
      <primitive object={objects.points} />
    </>
  )
}
