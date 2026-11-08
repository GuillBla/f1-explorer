import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { partRegistry } from '../parts/Part'
import { useExplorerStore } from '../store'
import type { PartId, Vec3 } from '../types'

/** Preferred viewing direction for some parts (others keep the current viewing angle). */
const PREFERRED_DIR: Partial<Record<PartId, Vec3>> = {
  frontWing: [1, 0.55, 0.9],
  rearWing: [-1, 0.6, 0.8],
  diffuser: [-1, 0.05, 0.55],
  floor: [0.5, -0.55, 0.9],
  plank: [0.3, -0.8, 0.6],
  halo: [0.8, 0.9, 0.6],
  cockpit: [0.6, 1, 0.5],
  engineCover: [-0.4, 0.8, 1],
  powerUnit: [0.2, 0.7, 1],
  brakes: [0.3, 0.25, 1],
}

export const OVERVIEW = { position: [5.2, 2.4, 5.6] as Vec3, target: [0, 0.45, 0] as Vec3 }

interface Anim {
  pos: THREE.Vector3
  target: THREE.Vector3
  /** Elapsed time, the animation stops after 3 s even if the target is unreachable (polar clamp). */
  t: number
}

/** Smoothly frames the selected part; any user interaction cancels the animation. */
export function CameraRig() {
  const controls = useThree((s) => s.controls) as OrbitControlsImpl | null
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera
  const selected = useExplorerStore((s) => s.selected)
  const resetToken = useExplorerStore((s) => s.resetToken)
  const anim = useRef<Anim | null>(null)

  useEffect(() => {
    if (!controls) return
    const cancel = () => {
      anim.current = null
    }
    controls.addEventListener('start', cancel)
    return () => controls.removeEventListener('start', cancel)
  }, [controls])

  useEffect(() => {
    if (!selected || !controls) return
    // wait one frame so exploded offsets / visibility are up to date
    const id = requestAnimationFrame(() => {
      const obj = partRegistry.get(selected)
      if (!obj) return
      const box = new THREE.Box3().setFromObject(obj)
      if (box.isEmpty()) return
      const center = box.getCenter(new THREE.Vector3())
      const radius = box.getSize(new THREE.Vector3()).length() / 2
      const fov = THREE.MathUtils.degToRad(camera.fov)
      const dist = THREE.MathUtils.clamp((radius / Math.sin(fov / 2)) * 0.95, 1.4, 9)
      const pref = PREFERRED_DIR[selected]
      const dir = pref ? new THREE.Vector3(...pref) : camera.position.clone().sub(controls.target)
      if (!pref) dir.y = Math.max(dir.y, dir.length() * 0.25)
      dir.normalize()
      anim.current = { pos: center.clone().addScaledVector(dir, dist), target: center, t: 0 }
    })
    return () => cancelAnimationFrame(id)
  }, [selected, controls, camera])

  useEffect(() => {
    if (resetToken === 0) return
    anim.current = { pos: new THREE.Vector3(...OVERVIEW.position), target: new THREE.Vector3(...OVERVIEW.target), t: 0 }
  }, [resetToken])

  useFrame((_, dt) => {
    const a = anim.current
    if (!a || !controls) return
    const d = Math.min(dt, 0.05)
    a.t += d
    const k = 1 - Math.exp(-4 * d)
    camera.position.lerp(a.pos, k)
    controls.target.lerp(a.target, k)
    controls.update()
    if (a.t > 3 || (camera.position.distanceTo(a.pos) < 0.01 && controls.target.distanceTo(a.target) < 0.01)) anim.current = null
  })

  return null
}
