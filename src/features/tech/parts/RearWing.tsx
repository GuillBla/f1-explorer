import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIMS } from './dims'
import { plateXY, wingElement } from './geometry'
import { Explode, Part, useCar, useGeometries, useMats } from './Part'

const SPAN = DIMS.rearWing.span
const FLAP_CHORD = 0.2
const FLAP_AOA_CLOSED = 32
const FLAP_AOA_OPEN = 7
/** Flap pivot near its trailing edge (as on real DRS systems). */
const PIVOT: [number, number] = [-2.3 - FLAP_CHORD * Math.cos(THREE.MathUtils.degToRad(FLAP_AOA_CLOSED)), 0.86 + FLAP_CHORD * Math.sin(THREE.MathUtils.degToRad(FLAP_AOA_CLOSED))]

export function RearWing() {
  return (
    <Part id="rearWing">
      <Explode dir={[-0.9, 0.45, 0]}>
        <RearWingMeshes />
      </Explode>
    </Part>
  )
}

function RearWingMeshes() {
  const m = useMats()
  const { wingsOpen } = useCar()
  const geo = useGeometries(() => ({
    main: wingElement(0.27, SPAN, { aoa: 8, camber: 0.08, thickness: 0.1 }),
    flap: wingElement(FLAP_CHORD, SPAN - 0.01, { aoa: 0, camber: 0.08, thickness: 0.1 }),
    endplate: plateXY(
      [
        [-1.97, 0.46],
        [-1.99, 0.95],
        [-2.12, 1.02],
        [-2.58, 1.03],
        [-2.63, 0.78],
        [-2.38, 0.46],
      ],
      0.012,
    ),
    stripe: plateXY(
      [
        [-2.0, 0.93],
        [-2.58, 0.98],
        [-2.58, 1.01],
        [-2.06, 0.99],
      ],
      0.016,
    ),
    pylon: plateXY(
      [
        [-2.12, 0.81],
        [-2.26, 0.81],
        [-2.1, 0.33],
        [-1.96, 0.36],
      ],
      0.022,
    ),
    crash: new THREE.BoxGeometry(0.34, 0.1, 0.12),
    light: new THREE.BoxGeometry(0.02, 0.05, 0.08),
    pod: new THREE.BoxGeometry(0.08, 0.04, 0.05),
  }))
  const flap = useRef<THREE.Group>(null)
  useFrame(() => {
    const o = wingsOpen.current ?? 0
    const aoa = THREE.MathUtils.lerp(FLAP_AOA_CLOSED, FLAP_AOA_OPEN, o)
    if (flap.current) flap.current.rotation.z = -THREE.MathUtils.degToRad(aoa)
  })
  return (
    <group>
      <mesh geometry={geo.main} material={m.carbon} position={[DIMS.rearWing.xLE, DIMS.rearWing.y, 0]} castShadow />
      <group ref={flap} position={[PIVOT[0], PIVOT[1], 0]}>
        <mesh geometry={geo.flap} material={m.accent} position={[FLAP_CHORD, 0, 0]} castShadow />
      </group>
      <mesh geometry={geo.pod} material={m.carbonMatte} position={[-2.27, 0.9, 0]} />
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, s * (SPAN / 2 + 0.006)]}>
          <mesh geometry={geo.endplate} material={m.paint} castShadow />
          <mesh geometry={geo.stripe} material={m.teal} position={[0, 0, s * 0.001]} />
        </group>
      ))}
      <mesh geometry={geo.pylon} material={m.carbon} castShadow />
      <mesh geometry={geo.crash} material={m.carbon} position={[-2.02, 0.3, 0]} castShadow />
      <mesh geometry={geo.light} position={[-2.2, 0.3, 0]}>
        <meshStandardMaterial color="#ff2a2a" emissive="#ff0000" emissiveIntensity={2} toneMapped={false} />
      </mesh>
    </group>
  )
}
