import { useEffect, useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Grid, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { porpoisingIntensity } from '../airflow/aeroModel'
import { FlowField } from '../airflow/field'
import { Particles, visualSpeed, X_INLET } from '../airflow/Particles'
import { Streamlines } from '../airflow/Streamlines'
import { Vortices } from '../airflow/Vortices'
import { followerX, Wake } from '../airflow/Wake'
import { Car } from '../parts/Car'
import { DIMS } from '../parts/dims'
import { useTunnelStore, useTunnelView, type TunnelView } from '../store'
import type { Vec3 } from '../types'
import { Stage } from './Stage'

const VIEWS: Record<TunnelView, { position: Vec3; target: Vec3 }> = {
  'trois-quarts': { position: [4.6, 2.3, 5.4], target: [-0.6, 0.4, 0] },
  profil: { position: [-0.3, 0.6, 7.2], target: [-0.3, 0.45, 0] },
  dessus: { position: [-0.8, 8.5, 0.01], target: [-0.8, 0, 0] },
  arriere: { position: [-8.5, 2.2, 3.2], target: [-1.5, 0.6, 0] },
  dessous: { position: [1.2, -2.4, 3.2], target: [-0.3, 0.1, 0] },
}

function useIsSmallScreen() {
  const [small] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 768px), (pointer: coarse)').matches)
  return small
}

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms)
    return () => clearTimeout(id)
  }, [value, ms])
  return v
}

/** Content of the wind tunnel canvas. */
export default function TunnelScene() {
  const speed = useTunnelStore((s) => s.speed)
  const drs = useTunnelStore((s) => s.drs)
  const rideHeight = useTunnelStore((s) => s.rideHeight)
  const showDirty = useTunnelStore((s) => s.showDirtyAir)
  const followDistance = useDebounced(useTunnelStore((s) => s.followDistance), 150)
  const small = useIsSmallScreen()

  const field = useMemo(() => new FlowField(), [])
  const rideOffset = useRef(0)
  const carRef = useRef<THREE.Group>(null)
  const gridRef = useRef<THREE.Mesh>(null)

  const xEnd = showDirty ? followerX(followDistance) - 1.5 : -7
  const count = small ? 2200 : 5500

  // Field controller: runs before the particles (mounted first) and animates porpoising.
  useFrame((state, dt) => {
    const st = useTunnelStore.getState()
    const h0 = st.rideHeight / 1000
    const p = porpoisingIntensity(st.rideHeight, st.speed)
    let h = h0
    if (p > 0) {
      const t = state.clock.elapsedTime
      // bouncing: stall → car rises → flow re-attaches → car sucked down again
      h = Math.max(0.004, h0 + p * 0.014 * (0.5 + 0.5 * Math.sin(t * 2 * Math.PI * 2.2)) - p * 0.004)
    }
    const changed = Math.abs(field.config.rideHeight - h) > 1e-5 || field.config.open !== st.drs
    if (changed) field.configure({ rideHeight: h, open: st.drs })
    rideOffset.current = h - DIMS.refRide
    if (carRef.current) carRef.current.position.y = rideOffset.current
    // rolling road
    if (gridRef.current && !st.paused) {
      gridRef.current.position.x = (gridRef.current.position.x - visualSpeed(st.speed) * Math.min(dt, 0.05)) % 1
    }
  })

  const wheelSpin = (visualSpeed(speed) / DIMS.tyreRF) * 0.9

  return (
    <>
      <Stage shadowFrames={Infinity} />
      <Grid
        ref={gridRef}
        args={[40, 10]}
        position={[0, 0.002, 0]}
        cellSize={0.25}
        sectionSize={1}
        cellThickness={0.6}
        sectionThickness={1}
        cellColor="#1c2230"
        sectionColor="#2a3142"
        fadeDistance={22}
        fadeStrength={1.5}
        infiniteGrid={false}
      />
      {/* inlet frame of the virtual tunnel */}
      <mesh position={[X_INLET + 0.2, 0.9, 0]} rotation={[0, Math.PI / 2, 0]}>
        <planeGeometry args={[3.4, 1.8]} />
        <meshBasicMaterial color="#00d2be" transparent opacity={0.035} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>

      <group ref={carRef}>
        <Car wingsOpen={drs} wheelSpin={wheelSpin} />
      </group>

      <Particles field={field} count={count} xEnd={xEnd} rideOffset={rideOffset} />
      <Streamlines xEnd={xEnd} />
      <Vortices />
      {showDirty && <Wake distance={followDistance} open={drs} rideOffset={rideHeight / 1000 - DIMS.refRide} />}

      <OrbitControls makeDefault target={VIEWS['trois-quarts'].target} enableDamping dampingFactor={0.08} minDistance={1.5} maxDistance={30} />
      <ViewRig />
    </>
  )
}

/** Animates the camera to the chosen preset. */
function ViewRig() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera)
  const token = useTunnelView((s) => s.token)
  const view = useTunnelView((s) => s.view)
  const anim = useRef<{ pos: THREE.Vector3; target: THREE.Vector3 } | null>(null)

  useEffect(() => {
    if (token === 0) return
    const v = VIEWS[view]
    anim.current = { pos: new THREE.Vector3(...v.position), target: new THREE.Vector3(...v.target) }
  }, [token, view])

  useEffect(() => {
    if (!controls) return
    const cancel = () => {
      anim.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useFrame((_, dt) => {
    const a = anim.current
    if (!a || !controls) return
    const k = 1 - Math.exp(-4 * Math.min(dt, 0.05))
    camera.position.lerp(a.pos, k)
    controls.target.lerp(a.target, k)
    controls.update()
    if (camera.position.distanceTo(a.pos) < 0.01) anim.current = null
  })
  return null
}

