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
  /** Active aero / DRS open. */
  wingsOpen?: boolean
  /** Wheel angular speed, rad/s (0 = static). */
  wheelSpin?: number
  /** Render the power unit (explorer only). */
  withPowerUnit?: boolean
  /** Translucent ghost rendering. */
  ghost?: boolean
}

/** Procedural, generic 2026-style F1 car. Every component is a separate clickable <Part>. */
export function Car({ interactive = false, exploded = false, wingsOpen = false, wheelSpin = 0, withPowerUnit = false, ghost = false }: CarProps) {
  const { base, basePu } = useBaseMaterials()
  const explode = useRef(0)
  const open = useRef(wingsOpen ? 1 : 0)
  const spin = useRef(wheelSpin)
  spin.current = wheelSpin
  const root = useRef<THREE.Group>(null)

  const ctx = useMemo<CarContextValue>(
    () => ({ interactive, base, basePu, explode, wingsOpen: open, wheelSpin: spin, ghost }),
    [interactive, base, basePu, ghost],
  )

  useFrame((_, dt) => {
    const d = Math.min(dt, 0.05)
    explode.current = THREE.MathUtils.damp(explode.current, exploded ? 1 : 0, 4, d)
    if (Math.abs(explode.current - (exploded ? 1 : 0)) < 1e-4) explode.current = exploded ? 1 : 0
    open.current = THREE.MathUtils.damp(open.current, wingsOpen ? 1 : 0, 5, d)
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
