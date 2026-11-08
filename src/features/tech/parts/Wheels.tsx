import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIMS } from './dims'
import { strutTransform, tyreGeometry } from './geometry'
import { Explode, Part, useCar, useGeometries, useMats } from './Part'

interface Corner {
  key: string
  x: number
  z: number
  r: number
  w: number
  side: 1 | -1
  front: boolean
}

const CORNERS: Corner[] = [
  { key: 'fr', x: DIMS.frontAxleX, z: DIMS.trackZ, r: DIMS.tyreRF, w: DIMS.tyreWF, side: 1, front: true },
  { key: 'fl', x: DIMS.frontAxleX, z: -DIMS.trackZ, r: DIMS.tyreRF, w: DIMS.tyreWF, side: -1, front: true },
  { key: 'rr', x: DIMS.rearAxleX, z: DIMS.trackZ, r: DIMS.tyreRR, w: DIMS.tyreWR, side: 1, front: false },
  { key: 'rl', x: DIMS.rearAxleX, z: -DIMS.trackZ, r: DIMS.tyreRR, w: DIMS.tyreWR, side: -1, front: false },
]

/* ------------------------------------------------------------------ */
/* Wheels and tyres                                                    */
/* ------------------------------------------------------------------ */

export function Wheels() {
  return (
    <Part id="wheels">
      <WheelsMeshes />
    </Part>
  )
}

function WheelsMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    tyreF: tyreGeometry(DIMS.tyreRF, DIMS.rimR, DIMS.tyreWF),
    tyreR: tyreGeometry(DIMS.tyreRR, DIMS.rimR, DIMS.tyreWR),
    band: new THREE.TorusGeometry(0.29, 0.007, 6, 64),
    rimF: new THREE.CylinderGeometry(DIMS.rimR, DIMS.rimR, DIMS.tyreWF * 0.95, 40, 1, true),
    rimR: new THREE.CylinderGeometry(DIMS.rimR, DIMS.rimR, DIMS.tyreWR * 0.95, 40, 1, true),
    face: new THREE.CircleGeometry(DIMS.rimR, 40),
    spoke: new THREE.BoxGeometry(0.035, DIMS.rimR * 1.9, 0.01),
    nut: new THREE.CylinderGeometry(0.045, 0.045, 0.06, 6),
  }))
  return (
    <group>
      {CORNERS.map((c) => (
        <Explode key={c.key} dir={[0, 0.05, c.side * 0.95]} position={[c.x, c.r, c.z]}>
          <SpinningWheel corner={c}>
            <mesh geometry={c.front ? geo.tyreF : geo.tyreR} material={m.rubber} castShadow receiveShadow />
            {[1, -1].map((f) => (
              <mesh key={f} geometry={geo.band} material={m.tyreBand} position={[0, 0, f * (c.w / 2 + 0.001)]} />
            ))}
            <mesh geometry={c.front ? geo.rimF : geo.rimR} material={m.rim} rotation={[Math.PI / 2, 0, 0]} />
            <group position={[0, 0, c.side * c.w * 0.3]}>
              <mesh geometry={geo.face} material={m.rim} rotation={[0, c.side === 1 ? 0 : Math.PI, 0]} />
              {[0, 1, 2, 3, 4].map((i) => (
                <mesh key={i} geometry={geo.spoke} material={m.metal} rotation={[0, 0, (i * Math.PI) / 5]} position={[0, 0, c.side * 0.006]} />
              ))}
              <mesh geometry={geo.nut} material={m.accent} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, c.side * 0.03]} />
            </group>
          </SpinningWheel>
        </Explode>
      ))}
    </group>
  )
}

function SpinningWheel({ corner, children }: { corner: Corner; children: ReactNode }) {
  const { wheelSpin } = useCar()
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const w = wheelSpin.current ?? 0
    if (ref.current && w !== 0) ref.current.rotation.z -= (w * dt * DIMS.tyreRF) / corner.r
  })
  return <group ref={ref}>{children}</group>
}

/* ------------------------------------------------------------------ */
/* Brakes                                                              */
/* ------------------------------------------------------------------ */

export function Brakes() {
  return (
    <Part id="brakes">
      <BrakesMeshes />
    </Part>
  )
}

function BrakesMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    discF: new THREE.CylinderGeometry(0.165, 0.165, 0.032, 48),
    discR: new THREE.CylinderGeometry(0.14, 0.14, 0.032, 48),
    bell: new THREE.CylinderGeometry(0.08, 0.08, 0.05, 24),
    caliper: new THREE.BoxGeometry(0.12, 0.07, 0.07),
    duct: new THREE.CylinderGeometry(0.2, 0.2, 0.09, 40, 1, true),
    scoop: new THREE.BoxGeometry(0.12, 0.09, 0.06),
  }))
  return (
    <group>
      {CORNERS.map((c) => {
        const zIn = c.z - c.side * (c.w / 2 - 0.07)
        return (
          <Explode key={c.key} dir={[0, 0.1, c.side * 0.55]} position={[c.x, c.r, zIn]}>
            <mesh geometry={c.front ? geo.discF : geo.discR} material={m.disc} rotation={[Math.PI / 2, 0, 0]} castShadow />
            <mesh geometry={geo.bell} material={m.metal} rotation={[Math.PI / 2, 0, 0]} />
            <mesh
              geometry={geo.caliper}
              material={m.accent}
              position={[c.front ? -0.13 : 0.11, c.front ? 0.06 : 0.05, 0]}
              rotation={[0, 0, c.front ? 0.5 : -0.5]}
            />
            <mesh geometry={geo.duct} material={m.carbonMatte} rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -c.side * 0.07]} />
            <mesh geometry={geo.scoop} material={m.carbon} position={[0.2, -0.08, -c.side * 0.08]} />
          </Explode>
        )
      })}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Suspension                                                          */
/* ------------------------------------------------------------------ */

type P3 = THREE.Vector3Tuple

function cornerLinks(c: Corner): { a: P3; b: P3; r: number; mat: 'carbon' | 'teal' | 'metal' }[] {
  const s = c.side
  if (c.front) {
    const ut: P3 = [1.7, 0.47, s * 0.66]
    const lb: P3 = [1.7, 0.18, s * 0.69]
    return [
      { a: [1.98, 0.42, s * 0.16], b: ut, r: 0.014, mat: 'carbon' },
      { a: [1.45, 0.45, s * 0.19], b: ut, r: 0.014, mat: 'carbon' },
      { a: [2.02, 0.17, s * 0.12], b: lb, r: 0.016, mat: 'carbon' },
      { a: [1.4, 0.15, s * 0.17], b: lb, r: 0.016, mat: 'carbon' },
      { a: [1.69, 0.21, s * 0.65], b: [1.62, 0.5, s * 0.14], r: 0.012, mat: 'teal' },
      { a: [1.62, 0.3, s * 0.67], b: [1.86, 0.3, s * 0.15], r: 0.01, mat: 'metal' },
    ]
  }
  const ut: P3 = [-1.7, 0.5, s * 0.64]
  const lb: P3 = [-1.7, 0.17, s * 0.66]
  return [
    { a: [-1.45, 0.43, s * 0.13], b: ut, r: 0.014, mat: 'carbon' },
    { a: [-1.95, 0.41, s * 0.11], b: ut, r: 0.014, mat: 'carbon' },
    { a: [-1.4, 0.15, s * 0.15], b: lb, r: 0.016, mat: 'carbon' },
    { a: [-1.95, 0.16, s * 0.11], b: lb, r: 0.016, mat: 'carbon' },
    { a: [-1.72, 0.45, s * 0.62], b: [-1.5, 0.18, s * 0.12], r: 0.012, mat: 'teal' },
    { a: [-1.85, 0.3, s * 0.64], b: [-1.95, 0.3, s * 0.12], r: 0.01, mat: 'metal' },
  ]
}

export function Suspension() {
  return (
    <Part id="suspension">
      <SuspensionMeshes />
    </Part>
  )
}

function SuspensionMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    unit: new THREE.CylinderGeometry(1, 1, 1, 10),
    upright: new THREE.BoxGeometry(0.08, 0.34, 0.05),
  }))
  const corners = useMemo(
    () => CORNERS.map((c) => ({ c, links: cornerLinks(c).map((l) => ({ ...l, t: strutTransform(l.a, l.b, l.r) })) })),
    [],
  )
  return (
    <group>
      {corners.map(({ c, links }) => (
        <Explode key={c.key} dir={[0, 0.02, c.side * 0.35]}>
          {links.map((l, i) => (
            <mesh key={i} geometry={geo.unit} material={m[l.mat]} position={l.t.position} quaternion={l.t.quaternion} scale={l.t.scale} castShadow />
          ))}
          <mesh geometry={geo.upright} material={m.metal} position={[c.x, c.r, c.side * (c.front ? 0.67 : 0.65)]} />
        </Explode>
      ))}
    </group>
  )
}
