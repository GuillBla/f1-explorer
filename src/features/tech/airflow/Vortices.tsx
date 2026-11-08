import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useTunnelStore } from '../store'
import { FlowField } from './field'
import { createVortexMaterial } from './shaders'

const KIND_STYLE = {
  tip: { color: '#00d2be', r: 0.07, label: 'Tourbillon de bout d’aileron (outwash)' },
  y250: { color: '#3fa9f5', r: 0.05, label: 'Tourbillon Y250 → bord du fond' },
  rear: { color: '#ffb800', r: 0.09, label: 'Tourbillon d’aileron arrière' },
} as const

const SAMPLES = 220
const STRANDS = 3

/** Animated helices wrapped around the trailing vortex cores of the analytic model. */
export function Vortices() {
  const show = useTunnelStore((s) => s.showVortices)
  const rideHeight = useTunnelStore((s) => s.rideHeight)

  const data = useMemo(() => {
    if (!show) return null
    const paths = new FlowField({ rideHeight: rideHeight / 1000 }).vortexPaths()
    const pos: number[] = []
    const aN: number[] = []
    const aB: number[] = []
    const aS: number[] = []
    const aPhase: number[] = []
    const aSign: number[] = []
    const aR: number[] = []
    const aColor: number[] = []
    const index: number[] = []
    const labels: { pos: THREE.Vector3Tuple; text: string; color: string }[] = []
    for (const p of paths) {
      const style = KIND_STYLE[p.kind]
      const curve = new THREE.CatmullRomCurve3(p.points.map((v) => new THREE.Vector3(...v)), false, 'centripetal')
      const frames = curve.computeFrenetFrames(SAMPLES - 1, false)
      const pts = curve.getSpacedPoints(SAMPLES - 1)
      const total = curve.getLength()
      const col = new THREE.Color(style.color)
      for (let s = 0; s < STRANDS; s++) {
        const base = pos.length / 3
        for (let i = 0; i < SAMPLES; i++) {
          const c = pts[i]
          pos.push(c.x, c.y, c.z)
          aN.push(frames.normals[i].x, frames.normals[i].y, frames.normals[i].z)
          aB.push(frames.binormals[i].x, frames.binormals[i].y, frames.binormals[i].z)
          aS.push((i / (SAMPLES - 1)) * total)
          aPhase.push((s * Math.PI * 2) / STRANDS)
          aSign.push(p.sign)
          aR.push(style.r)
          aColor.push(col.r, col.g, col.b)
          if (i > 0) index.push(base + i - 1, base + i)
        }
      }
      if (p.sign > 0) labels.push({ pos: [p.points[1][0], p.points[1][1] + 0.18, p.points[1][2]], text: style.label, color: style.color })
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    g.setAttribute('aN', new THREE.Float32BufferAttribute(aN, 3))
    g.setAttribute('aB', new THREE.Float32BufferAttribute(aB, 3))
    g.setAttribute('aS', new THREE.Float32BufferAttribute(aS, 1))
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(aPhase, 1))
    g.setAttribute('aSign', new THREE.Float32BufferAttribute(aSign, 1))
    g.setAttribute('aR', new THREE.Float32BufferAttribute(aR, 1))
    g.setAttribute('aColor', new THREE.Float32BufferAttribute(aColor, 3))
    g.setIndex(index)
    return { geometry: g, labels }
  }, [show, rideHeight])

  useEffect(() => () => data?.geometry.dispose(), [data])
  const material = useMemo(() => createVortexMaterial(), [])
  useEffect(() => () => material.dispose(), [material])

  useFrame((_, dt) => {
    if (!useTunnelStore.getState().paused) material.uniforms.uTime.value += Math.min(dt, 0.05)
  })

  if (!data) return null
  return (
    <group>
      <lineSegments geometry={data.geometry} material={material} frustumCulled={false} />
      {data.labels.map((l) => (
        <Html key={l.text} position={l.pos} center distanceFactor={7} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <span
            className="whitespace-nowrap rounded bg-bg/85 px-1.5 py-0.5 text-[11px] font-bold ring-1"
            style={{ color: l.color, boxShadow: `0 0 0 1px ${l.color}55` }}
          >
            {l.text}
          </span>
        </Html>
      ))}
    </group>
  )
}
