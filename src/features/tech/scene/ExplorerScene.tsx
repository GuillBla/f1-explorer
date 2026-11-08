import { OrbitControls } from '@react-three/drei'
import { Car } from '../parts/Car'
import { useExplorerStore } from '../store'
import { CameraRig } from './CameraRig'
import { Stage } from './Stage'

/** Content of the 3D explorer canvas. */
export default function ExplorerScene() {
  const exploded = useExplorerStore((s) => s.exploded)
  const autoRotate = useExplorerStore((s) => s.autoRotate)
  return (
    <>
      <Stage />
      <Car interactive exploded={exploded} withPowerUnit />
      <OrbitControls
        makeDefault
        target={[0, 0.45, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={1.2}
        maxDistance={14}
        maxPolarAngle={Math.PI * 0.78}
        autoRotate={autoRotate}
        autoRotateSpeed={0.8}
      />
      <CameraRig />
    </>
  )
}
