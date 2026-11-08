import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIMS } from './dims'
import { plateXY, wingElement } from './geometry'
import { Explode, Part, useCar, useGeometries, useMats } from './Part'

const SPAN = DIMS.frontWing.span

/** 3-element front wing with endplates. The two flaps are mobile (2026 active aero). */
export function FrontWing() {
  return (
    <Part id="frontWing">
      <Explode dir={[0.95, 0.05, 0]}>
        <FrontWingMeshes />
      </Explode>
    </Part>
  )
}

function FrontWingMeshes() {
  const m = useMats()
  const { wingsOpen } = useCar()
  const geo = useGeometries(() => ({
    main: wingElement(0.42, SPAN, { aoa: 3, camber: 0.07, thickness: 0.1 }),
    flap1: wingElement(0.2, SPAN - 0.04, { aoa: 0, camber: 0.08, thickness: 0.1 }),
    flap2: wingElement(0.17, SPAN - 0.08, { aoa: 0, camber: 0.09, thickness: 0.1 }),
    endplate: plateXY(
      [
        [2.9, 0.035],
        [2.9, 0.16],
        [2.7, 0.25],
        [2.42, 0.29],
        [2.26, 0.27],
        [2.24, 0.16],
        [2.32, 0.035],
      ],
      0.012,
    ),
    foot: new THREE.BoxGeometry(0.62, 0.008, 0.08),
    stripe: plateXY(
      [
        [2.88, 0.15],
        [2.7, 0.235],
        [2.66, 0.215],
        [2.88, 0.12],
      ],
      0.016,
    ),
  }))
  const f1 = useRef<THREE.Group>(null)
  const f2 = useRef<THREE.Group>(null)
  useFrame(() => {
    const o = wingsOpen.current ?? 0
    // closed (corner mode) = high angle of attack; open (straight-line mode) = flatter flaps
    if (f1.current) f1.current.rotation.z = THREE.MathUtils.degToRad(-16 + 11 * o)
    if (f2.current) f2.current.rotation.z = THREE.MathUtils.degToRad(-30 + 18 * o)
  })
  const zEnd = SPAN / 2 + 0.006
  return (
    <group>
      <mesh geometry={geo.main} material={m.carbon} position={[2.86, 0.075, 0]} castShadow />
      <group ref={f1} position={[2.49, 0.118, 0]}>
        <mesh geometry={geo.flap1} material={m.paint} castShadow />
      </group>
      <group ref={f2} position={[2.33, 0.17, 0]}>
        <mesh geometry={geo.flap2} material={m.accent} castShadow />
      </group>
      {[1, -1].map((s) => (
        <group key={s} position={[0, 0, s * zEnd]}>
          <mesh geometry={geo.endplate} material={m.carbon} castShadow />
          <mesh geometry={geo.stripe} material={m.teal} position={[0, 0, s * 0.001]} />
          <mesh geometry={geo.foot} material={m.carbonMatte} position={[2.6, 0.035, -s * 0.03]} />
        </group>
      ))}
    </group>
  )
}
