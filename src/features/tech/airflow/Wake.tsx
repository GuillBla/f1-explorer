import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { Car } from '../parts/Car'
import { DIMS } from '../parts/dims'
import { followEffects } from './aeroModel'
import { createWakeMaterial } from './shaders'

const SLICES = 22

/** Position (x) of the following car's origin for a gap `d` (m) between the two cars. */
export function followerX(d: number) {
  return -2.6 - d - DIMS.noseX
}

/**
 * "Dirty air" visualisation: translucent slices of the turbulent wake (same Gaussian model as the
 * velocity field) and a ghost car following at the chosen distance.
 */
export function Wake({ distance, open, rideOffset }: { distance: number; open: boolean; rideOffset: number }) {
  const geometry = useMemo(() => new THREE.PlaneGeometry(1, 1), [])
  const material = useMemo(() => createWakeMaterial(), [])
  useEffect(
    () => () => {
      geometry.dispose()
      material.dispose()
    },
    [geometry, material],
  )

  const mesh = useMemo(() => {
    const m = new THREE.InstancedMesh(geometry, material, SLICES)
    m.frustumCulled = false
    m.geometry.setAttribute('aAlpha', new THREE.InstancedBufferAttribute(new Float32Array(SLICES), 1))
    return m
  }, [geometry, material])
  useEffect(() => () => mesh.dispose(), [mesh])

  useEffect(() => {
    const end = distance + 3
    const alpha = mesh.geometry.getAttribute('aAlpha') as THREE.InstancedBufferAttribute
    const o = new THREE.Object3D()
    for (let i = 0; i < SLICES; i++) {
      const sd = 0.3 + (i / (SLICES - 1)) * end
      const yc = (open ? 0.5 : 0.58) + rideOffset + (open ? 0.06 : 0.11) * Math.sqrt(sd)
      const wy = 0.32 + 0.055 * sd
      const wz = 0.55 + 0.065 * sd
      const D = (open ? 0.3 : 0.45) / (1 + sd / 5)
      o.position.set(-1.9 - sd, Math.max(yc, wy * 0.9), 0)
      o.rotation.set(0, Math.PI / 2, 0)
      o.scale.set(wz * 3.2, wy * 3.2, 1)
      o.updateMatrix()
      mesh.setMatrixAt(i, o.matrix)
      alpha.setX(i, D * 0.55)
    }
    mesh.instanceMatrix.needsUpdate = true
    alpha.needsUpdate = true
  }, [mesh, distance, open, rideOffset])

  useFrame((s) => {
    material.uniforms.uTime.value = s.clock.elapsedTime
  })

  const fx = followerX(distance)
  const fe = followEffects(distance)
  return (
    <group>
      <primitive object={mesh} />
      <group position={[fx, 0, 0]}>
        <Car ghost />
        <Html position={[0, 1.55, 0]} center distanceFactor={9} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
          <div className="whitespace-nowrap rounded-md bg-bg/90 px-2 py-1 text-center text-[11px] ring-1 ring-warn/60">
            <div className="font-bold text-warn">Voiture qui suit · {distance} m</div>
            <div className="text-text">
              Appui −{fe.lossNow.toFixed(0)} % · traînée −{fe.towPct.toFixed(0)} %
            </div>
          </div>
        </Html>
      </group>
    </group>
  )
}
