import * as THREE from 'three'
import { loft, plateXY, tube } from './geometry'
import { Explode, Part, useGeometries, useMats } from './Part'

/* ------------------------------------------------------------------ */
/* Monocoque, nose and cockpit                                         */
/* ------------------------------------------------------------------ */

const CHASSIS = [
  { x: 2.8, bottom: 0.15, top: 0.21, w: 0.08, n: 2.2 },
  { x: 2.6, bottom: 0.125, top: 0.27, w: 0.17, n: 2.4 },
  { x: 2.2, bottom: 0.12, top: 0.37, w: 0.26, n: 2.6 },
  { x: 1.75, bottom: 0.11, top: 0.49, w: 0.34, n: 2.8 },
  { x: 1.2, bottom: 0.08, top: 0.58, w: 0.44, n: 3 },
  { x: 0.7, bottom: 0.07, top: 0.63, w: 0.56, n: 3.2 },
  { x: 0.2, bottom: 0.07, top: 0.645, w: 0.66, n: 3.4 },
  { x: -0.15, bottom: 0.07, top: 0.64, w: 0.62, n: 3.4 },
]

export function Cockpit() {
  return (
    <Part id="cockpit">
      <Explode dir={[0.15, 0.35, 0]}>
        <CockpitMeshes />
      </Explode>
    </Part>
  )
}

function CockpitMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    chassis: loft(CHASSIS, 40, 8),
    noseTip: loft(
      [
        { x: 2.805, bottom: 0.147, top: 0.213, w: 0.086, n: 2.2 },
        { x: 2.6, bottom: 0.122, top: 0.273, w: 0.176, n: 2.4 },
        { x: 2.45, bottom: 0.121, top: 0.31, w: 0.21, n: 2.5 },
      ],
      40,
      6,
    ),
    band: loft(
      [
        { x: 1.62, bottom: 0.1, top: 0.517, w: 0.37, n: 2.85 },
        { x: 1.5, bottom: 0.094, top: 0.535, w: 0.39, n: 2.9 },
      ],
      40,
      2,
    ),
    opening: new THREE.CylinderGeometry(1, 1, 0.03, 40),
    helmet: new THREE.SphereGeometry(0.125, 32, 20),
    visor: new THREE.SphereGeometry(0.128, 24, 8, Math.PI - 0.9, 1.8, 1.15, 0.42),
    stripe: new THREE.TorusGeometry(0.126, 0.012, 8, 40),
    wheel: new THREE.BoxGeometry(0.04, 0.13, 0.27),
    mirror: new THREE.BoxGeometry(0.07, 0.055, 0.15),
    glass: new THREE.PlaneGeometry(0.13, 0.045),
    stalk: new THREE.CylinderGeometry(0.008, 0.008, 1, 8),
  }))
  return (
    <group>
      <mesh geometry={geo.chassis} material={m.paint} castShadow receiveShadow />
      <mesh geometry={geo.noseTip} material={m.accent} castShadow />
      <mesh geometry={geo.band} material={m.teal} />
      {/* cockpit opening */}
      <mesh geometry={geo.opening} material={m.dark} position={[0.3, 0.636, 0]} scale={[0.33, 1, 0.215]} />
      {/* driver */}
      <mesh geometry={geo.helmet} material={m.helmet} position={[0.13, 0.7, 0]} castShadow />
      <mesh geometry={geo.visor} material={m.visor} position={[0.13, 0.7, 0]} />
      <mesh geometry={geo.stripe} material={m.accent} position={[0.13, 0.72, 0]} rotation={[0, 0, 0.35]} />
      <mesh geometry={geo.wheel} material={m.carbonMatte} position={[0.46, 0.62, 0]} />
      {/* mirrors */}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={geo.mirror} material={m.paint} position={[0.62, 0.74, s * 0.43]} castShadow />
          <mesh geometry={geo.glass} material={m.visor} position={[0.584, 0.74, s * 0.43]} rotation={[0, -Math.PI / 2, 0]} />
          <mesh geometry={geo.stalk} material={m.carbon} position={[0.64, 0.66, s * 0.34]} rotation={[s * 0.9, 0, 0]} scale={[1, 0.2, 1]} />
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Halo                                                                */
/* ------------------------------------------------------------------ */

export function Halo() {
  return (
    <Part id="halo">
      <Explode dir={[0.25, 0.85, 0]}>
        <HaloMeshes />
      </Explode>
    </Part>
  )
}

function HaloMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    hoop: tube(
      [
        [-0.08, 0.64, -0.25],
        [0.04, 0.8, -0.255],
        [0.28, 0.855, -0.22],
        [0.47, 0.848, -0.12],
        [0.555, 0.842, 0],
        [0.47, 0.848, 0.12],
        [0.28, 0.855, 0.22],
        [0.04, 0.8, 0.255],
        [-0.08, 0.64, 0.25],
      ],
      0.024,
      96,
    ),
    pillar: tube(
      [
        [0.55, 0.84, 0],
        [0.63, 0.76, 0],
        [0.76, 0.62, 0],
      ],
      0.026,
      24,
    ),
  }))
  return (
    <group>
      <mesh geometry={geo.hoop} material={m.titanium} castShadow />
      <mesh geometry={geo.pillar} material={m.titanium} castShadow />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Sidepods                                                            */
/* ------------------------------------------------------------------ */

function sidepodStations(s: 1 | -1) {
  return [
    { x: 0.62, bottom: 0.16, top: 0.56, w: 0.22, z: s * 0.47, n: 3.5 },
    { x: 0.42, bottom: 0.13, top: 0.6, w: 0.32, z: s * 0.5, n: 3.5 },
    { x: 0.0, bottom: 0.12, top: 0.57, w: 0.36, z: s * 0.5, n: 3 },
    { x: -0.6, bottom: 0.13, top: 0.45, w: 0.28, z: s * 0.45, n: 2.6 },
    { x: -1.15, bottom: 0.14, top: 0.32, w: 0.16, z: s * 0.36, n: 2.4 },
    { x: -1.45, bottom: 0.15, top: 0.24, w: 0.06, z: s * 0.28, n: 2.2 },
  ]
}

export function Sidepods() {
  return (
    <Part id="sidepods">
      <SidepodsMeshes />
    </Part>
  )
}

function SidepodsMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    right: loft(sidepodStations(1), 36, 8),
    left: loft(sidepodStations(-1), 36, 8),
    inlet: new THREE.CylinderGeometry(1, 1, 0.01, 32),
    lip: new THREE.TorusGeometry(1, 0.08, 8, 40),
  }))
  return (
    <group>
      {([1, -1] as const).map((s) => (
        <Explode key={s} dir={[0, 0.12, s * 0.75]}>
          <mesh geometry={s === 1 ? geo.right : geo.left} material={m.paint} castShadow receiveShadow />
          <mesh geometry={geo.inlet} material={m.dark} position={[0.627, 0.37, s * 0.47]} rotation={[0, 0, Math.PI / 2]} scale={[0.15, 1, 0.08]} />
          <mesh geometry={geo.lip} material={m.teal} position={[0.628, 0.37, s * 0.47]} rotation={[0, Math.PI / 2, 0]} scale={[0.085, 0.16, 0.5]} />
        </Explode>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Engine cover and airbox                                             */
/* ------------------------------------------------------------------ */

export function EngineCover() {
  return (
    <Part id="engineCover">
      <Explode dir={[-0.35, 1.05, 0]}>
        <EngineCoverMeshes />
      </Explode>
    </Part>
  )
}

function EngineCoverMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    cover: loft(
      [
        { x: 0.05, bottom: 0.55, top: 0.92, w: 0.2, n: 2.6 },
        { x: -0.15, bottom: 0.45, top: 0.98, w: 0.3, n: 2.8 },
        { x: -0.5, bottom: 0.35, top: 0.9, w: 0.44, n: 3 },
        { x: -0.95, bottom: 0.25, top: 0.72, w: 0.44, n: 3 },
        { x: -1.45, bottom: 0.22, top: 0.55, w: 0.3, n: 2.6 },
        { x: -1.95, bottom: 0.3, top: 0.47, w: 0.12, n: 2.2 },
      ],
      40,
      8,
    ),
    inlet: new THREE.CylinderGeometry(1, 1, 0.01, 32),
    fin: plateXY(
      [
        [-0.45, 0.9],
        [-1.75, 0.5],
        [-1.75, 0.6],
        [-0.65, 0.96],
      ],
      0.008,
    ),
    cam: new THREE.BoxGeometry(0.1, 0.03, 0.06),
    pipe: new THREE.CylinderGeometry(0.045, 0.05, 0.14, 24, 1, true),
  }))
  return (
    <group>
      <mesh geometry={geo.cover} material={m.paint} castShadow receiveShadow />
      <mesh geometry={geo.inlet} material={m.dark} position={[0.056, 0.85, 0]} rotation={[0, 0, Math.PI / 2]} scale={[0.065, 1, 0.075]} />
      <mesh geometry={geo.fin} material={m.teal} castShadow />
      <mesh geometry={geo.cam} material={m.accent} position={[-0.12, 0.99, 0]} />
      <mesh geometry={geo.pipe} material={m.titanium} position={[-1.98, 0.4, 0]} rotation={[0, 0, Math.PI / 2]} />
    </group>
  )
}
