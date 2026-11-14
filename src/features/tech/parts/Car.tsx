import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Cockpit, EngineCover, Halo, Sidepods } from './Body'
import { FrontWing } from './FrontWing'
import { CarProvider, useBaseMaterials, type CarContextValue } from './Part'
import { PowerUnit } from './PowerUnit'
import { RearWing } from './RearWing'
import { Diffuser, Floor, Plank } from './Underbody'
import { Brakes, Suspension, Wheels } from './Wheels'

export interface CarProps {
  interactive?: boolean
  exploded?: boolean
  /** Active aero open (2026 straight-line mode "X") / DRS open. */
  wingsOpen?: boolean
  /** Wheel angular speed, rad/s (0 = static). */
  wheelSpin?: number
  /** Front wheel steering angle, degrees (+ = left turn). */
  steerDeg?: number
  /** Render the power unit (explorer only). */
  withPowerUnit?: boolean
  /** Translucent ghost rendering. */
  ghost?: boolean
}

/**
 * Procedural, generic 2026-style F1 car. Every component is a <Part>, itself split into clickable
 * <Sub> components (front wing → main plane, flaps, endplates, actuator…).
 */
export function Car({ interactive = false, exploded = false, wingsOpen = false, wheelSpin = 0, steerDeg = 0, withPowerUnit = false, ghost = false }: CarProps) {
  const { base, basePu } = useBaseMaterials()
  const explode = useRef(0)
  const open = useRef(wingsOpen ? 1 : 0)
  const spin = useRef(wheelSpin)
  spin.current = wheelSpin
  const steer = useRef(0)
  const root = useRef<THREE.Group>(null)

  const ctx = useMemo<CarContextValue>(
    () => ({ interactive, base, basePu, explode, wingsOpen: open, wheelSpin: spin, steer, ghost }),
    [interactive, base, basePu, ghost],
  )

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    explode.current = THREE.MathUtils.damp(explode.current, exploded ? 1 : 0, 4, d)
    if (Math.abs(explode.current - (exploded ? 1 : 0)) < 1e-4) explode.current = exploded ? 1 : 0
    // flaps move in ≈ 0.5 s, like the hydraulic actuators
    open.current = THREE.MathUtils.damp(open.current, wingsOpen ? 1 : 0, 6, d)
    steer.current = THREE.MathUtils.damp(steer.current, THREE.MathUtils.degToRad(steerDeg), 8, d)
    // lift the whole car in exploded view so the floor and plank stay above the ground
    if (root.current) root.current.position.y = explode.current * 0.85
  })

  return (
    <CarProvider value={ctx}>
      <group ref={root}>
        <FrontWing />
        <Cockpit />
        <Halo />
        <Sidepods />
        <EngineCover />
        <Floor />
        <Plank />
        <Diffuser />
        <RearWing />
        <Wheels />
        <Brakes />
        <Suspension />
        {withPowerUnit && <PowerUnit />}
      </group>
    </CarProvider>
  )
}
