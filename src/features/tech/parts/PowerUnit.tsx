import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useExplorerStore } from '../store'
import type { Vec3 } from '../types'
import { Explode, Part, useCar, useGeometries, usePuMats } from './Part'

/**
 * Hybrid power unit internals: V6 block, turbo, MGU-K, battery, fuel cell, gearbox, radiators.
 * Hidden by the bodywork, shown in x-ray mode or exploded view.
 */
export function PowerUnit() {
  const { explode, interactive } = useCar()
  const ref = useRef<THREE.Group>(null)
  const xray = useExplorerStore((s) => interactive && s.xray)
  useFrame(() => {
    if (ref.current) ref.current.visible = xray || (explode.current ?? 0) > 0.02
  })
  return (
    <group ref={ref} visible={false}>
      <Part id="powerUnit">
        <Explode dir={[0, 0.25, 0]}>
          <PuMeshes labels={xray} />
        </Explode>
      </Part>
    </group>
  )
}

function Label({ position, children }: { position: Vec3; children: string }) {
  return (
    <Html position={position} center distanceFactor={6} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <span className="whitespace-nowrap rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-text ring-1 ring-border">
        {children}
      </span>
    </Html>
  )
}

function PuMeshes({ labels }: { labels: boolean }) {
  const m = usePuMats()
  const geo = useGeometries(() => ({
    crankcase: new THREE.BoxGeometry(0.56, 0.16, 0.24),
    bank: new THREE.BoxGeometry(0.5, 0.17, 0.11),
    head: new THREE.BoxGeometry(0.52, 0.04, 0.13),
    plenum: new THREE.CylinderGeometry(0.06, 0.06, 0.45, 20),
    compressor: new THREE.CylinderGeometry(0.075, 0.06, 0.08, 28),
    turbine: new THREE.TorusGeometry(0.06, 0.03, 12, 28),
    shaft: new THREE.CylinderGeometry(0.012, 0.012, 0.22, 10),
    mguk: new THREE.CylinderGeometry(0.06, 0.06, 0.2, 24),
    battery: new THREE.BoxGeometry(0.36, 0.09, 0.4),
    cell: new THREE.CylinderGeometry(1, 1, 1, 32),
    gearbox: new THREE.BoxGeometry(0.6, 0.18, 0.18),
    radiator: new THREE.BoxGeometry(0.06, 0.32, 0.26),
    exhaust: new THREE.CylinderGeometry(0.035, 0.035, 0.7, 16),
  }))
  return (
    <group>
      {/* V6 at 90° */}
      <mesh geometry={geo.crankcase} material={m.block} position={[-0.72, 0.24, 0]} />
      {[1, -1].map((s) => (
        <group key={s} position={[-0.72, 0.38, s * 0.08]} rotation={[s * 0.785, 0, 0]}>
          <mesh geometry={geo.bank} material={m.block} position={[0, 0.06, 0]} />
          <mesh geometry={geo.head} material={m.head} position={[0, 0.16, 0]} />
        </group>
      ))}
      <mesh geometry={geo.plenum} material={m.head} position={[-0.72, 0.5, 0]} rotation={[0, 0, Math.PI / 2]} />
      {/* turbocharger behind the engine */}
      <group position={[-1.08, 0.44, 0]}>
        <mesh geometry={geo.compressor} material={m.turbo} position={[0.09, 0, 0]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={geo.shaft} material={m.exhaust} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={geo.turbine} material={m.turbo} position={[-0.09, 0, 0]} rotation={[0, Math.PI / 2, 0]} />
      </group>
      <mesh geometry={geo.exhaust} material={m.exhaust} position={[-1.55, 0.42, 0]} rotation={[0, 0, Math.PI / 2 - 0.05]} />
      {/* MGU-K, geared to the crankshaft */}
      <mesh geometry={geo.mguk} material={m.mguk} position={[-0.38, 0.2, 0.16]} rotation={[0, 0, Math.PI / 2]} />
      {/* fuel cell behind the driver, battery underneath */}
      <mesh geometry={geo.cell} material={m.fuel} position={[-0.14, 0.4, 0]} scale={[0.22, 0.34, 0.25]} />
      <mesh geometry={geo.battery} material={m.battery} position={[-0.14, 0.13, 0]} />
      {/* gearbox */}
      <mesh geometry={geo.gearbox} material={m.gearbox} position={[-1.55, 0.25, 0]} />
      {/* radiators in the sidepods */}
      {[1, -1].map((s) => (
        <mesh key={s} geometry={geo.radiator} material={m.radiator} position={[0.25, 0.36, s * 0.5]} rotation={[0, s * 0.35, 0]} />
      ))}
      {labels && (
        <>
          <Label position={[-0.72, 0.68, 0]}>V6 1,6 L turbo</Label>
          <Label position={[-1.1, 0.58, 0]}>Turbo</Label>
          <Label position={[-0.38, 0.12, 0.34]}>MGU-K</Label>
          <Label position={[-0.14, 0.03, -0.3]}>Batterie (ES)</Label>
          <Label position={[-0.14, 0.62, 0]}>Réservoir</Label>
          <Label position={[-1.6, 0.12, 0]}>Boîte 8 rapports</Label>
          <Label position={[0.25, 0.6, 0.6]}>Radiateurs</Label>
        </>
      )}
    </group>
  )
}
