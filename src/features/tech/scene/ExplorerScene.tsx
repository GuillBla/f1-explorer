import { OrbitControls } from '@react-three/drei'
import { DIMS } from '../parts/dims'
import { Car } from '../parts/Car'
import { useExplorerStore } from '../store'
import { CameraRig } from './CameraRig'
import { Stage } from './Stage'

/** Content of the 3D explorer canvas. */
export default function ExplorerScene() {
  const exploded = useExplorerStore((s) => s.exploded)
  const autoRotate = useExplorerStore((s) => s.autoRotate)
  const aeroMode = useExplorerStore((s) => s.aeroMode)
  const demoSpeed = useExplorerStore((s) => s.demoSpeed)
  const steer = useExplorerStore((s) => s.steer)
  // wheel angular speed (rad/s) for the demo speed, slowed down ×0.25 so the rotation stays readable
  const wheelSpin = ((demoSpeed / 3.6) / DIMS.tyreRF) * 0.25
  return (
    <>
      <Stage />
      <Car interactive exploded={exploded} withPowerUnit wingsOpen={aeroMode === 'X'} wheelSpin={wheelSpin} steerDeg={steer} />
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
