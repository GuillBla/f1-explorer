import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Environment, Html, Lightformer, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { Vec3 } from '../../types'
import { useMechStore } from '../store'
import { softSprite } from './materials'

/**
 * Dark workshop stage of the mechanical scenes: studio lighting from local Lightformers (no HDR
 * download), orbit controls, local clipping enabled for cut-away views.
 */
export function MechStage({ target = [0, 0, 0], minDistance = 0.5, maxDistance = 20, autoRotate = false }: { target?: Vec3; minDistance?: number; maxDistance?: number; autoRotate?: boolean }) {
  const gl = useThree((s) => s.gl)
  useEffect(() => {
    gl.localClippingEnabled = true
  }, [gl])
  return (
    <>
      <color attach="background" args={['#0a0c11']} />
      <ambientLight intensity={0.35} />
      <directionalLight position={[3, 6, 4]} intensity={1.6} />
      <directionalLight position={[-5, 3, -3]} intensity={0.7} color="#9fd8ff" />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.5} position={[0, 6, 0]} rotation-x={Math.PI / 2} scale={[10, 4, 1]} />
        <Lightformer form="rect" intensity={1.6} position={[0, 2, 7]} scale={[12, 1.5, 1]} />
        <Lightformer form="rect" intensity={1.2} position={[0, 2, -7]} rotation-y={Math.PI} scale={[12, 1.5, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#e10600" position={[-7, 1, 0]} rotation-y={Math.PI / 2} scale={[6, 1, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#00d2be" position={[7, 1, 0]} rotation-y={-Math.PI / 2} scale={[6, 1, 1]} />
      </Environment>
      <OrbitControls makeDefault target={target} enableDamping dampingFactor={0.08} minDistance={minDistance} maxDistance={maxDistance} autoRotate={autoRotate} autoRotateSpeed={0.5} />
    </>
  )
}

/** Label attached to a 3D point; follows its parent group. Hidden when labels are off. */
export function Tag({ position, children, tone = 'text', side = 'right' }: { position: Vec3; children: ReactNode; tone?: 'text' | 'accent' | 'warn' | 'info' | 'ok' | 'f1'; side?: 'right' | 'left' }) {
  const on = useMechStore((s) => s.labels)
  if (!on) return null
  const color = { text: 'text-text', accent: 'text-accent', warn: 'text-warn', info: 'text-info', ok: 'text-ok', f1: 'text-f1' }[tone]
  return (
    <Html position={position} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <div className={side === 'right' ? 'flex items-center' : 'flex flex-row-reverse items-center'} style={{ transform: side === 'right' ? 'translate(-4px,-50%)' : 'translate(calc(-100% + 4px),-50%)' }}>
        <span className="h-2 w-2 shrink-0 rounded-full bg-current ring-2 ring-bg/80" />
        <span className="h-px w-3 bg-current opacity-70" />
        <span className={`whitespace-nowrap rounded bg-bg/85 px-1.5 py-0.5 text-[11px] font-bold ring-1 ring-border ${color}`}>{children}</span>
      </div>
    </Html>
  )
}

/* ------------------------------------------------------------------ */
/* Particle flows along curves                                         */
/* ------------------------------------------------------------------ */

export interface FlowProps {
  curves: THREE.Curve<THREE.Vector3>[]
  /** Particles per curve. */
  count?: number
  color: string
  size?: number
  /** Path fraction travelled per second of simulated time (can be negative to reverse). */
  rate: () => number
  /** 0..1 opacity driver. */
  intensity?: () => number
  /** Random lateral jitter (scene units). */
  jitter?: number
}

/**
 * Animated particles travelling along a set of curves (gas, air, energy). Driven by the shared
 * playback speed so they slow down with the rest of the scene.
 */
export function Flow({ curves, count = 40, color, size = 0.05, rate, intensity, jitter = 0 }: FlowProps) {
  const n = curves.length * count
  const data = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    const pos = new Float32Array(n * 3)
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const u = new Float32Array(n)
    const off = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      u[i] = Math.random()
      off[i * 3] = (Math.random() - 0.5) * 2 * jitter
      off[i * 3 + 1] = (Math.random() - 0.5) * 2 * jitter
      off[i * 3 + 2] = (Math.random() - 0.5) * 2 * jitter
    }
    const mat = new THREE.PointsMaterial({
      color,
      size,
      map: softSprite(),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    })
    return { geo, pos, u, off, mat }
  }, [n, color, size, jitter])
  useEffect(
    () => () => {
      data.geo.dispose()
      data.mat.dispose()
    },
    [data],
  )
  const tmp = useRef(new THREE.Vector3())
  useFrame((_, dtReal) => {
    const { playing, speed } = useMechStore.getState()
    const dt = playing ? Math.min(dtReal, 0.05) * speed : 0
    const r = rate()
    const { pos, u, off } = data
    for (let c = 0; c < curves.length; c++) {
      const curve = curves[c]
      for (let k = 0; k < count; k++) {
        const i = c * count + k
        let v = u[i] + r * dt
        v -= Math.floor(v)
        u[i] = v
        curve.getPointAt(v, tmp.current)
        pos[i * 3] = tmp.current.x + off[i * 3]
        pos[i * 3 + 1] = tmp.current.y + off[i * 3 + 1]
        pos[i * 3 + 2] = tmp.current.z + off[i * 3 + 2]
      }
    }
    data.geo.attributes.position.needsUpdate = true
    data.mat.opacity = intensity ? intensity() : 1
  })
  return <points geometry={data.geo} material={data.mat} frustumCulled={false} />
}
