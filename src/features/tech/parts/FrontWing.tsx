import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIMS } from './dims'
import { cutPlate, ellipse, loftX, merge, place, strutGeometry, wingLoft, type P2, type WingStation } from './surface'
import { Explode, Part, Sub, useCar, useGeometries, useMats } from './Part'

const HALF = DIMS.frontWing.span / 2
const Z_EP = HALF + 0.007

/**
 * Front wing 2026: one fixed main plane spanning the full width (raised "neutral" centre under the
 * nose) and two flaps on each side that rotate together (active aero: Z = closed, X = open).
 */
const MAIN_HALF: WingStation[] = [
  { z: 0.0, x: 2.955, y: 0.122, chord: 0.3, aoa: 2, camber: 0.03, thick: 0.1 },
  { z: 0.14, x: 2.955, y: 0.12, chord: 0.3, aoa: 2.5, camber: 0.035, thick: 0.1 },
  { z: 0.3, x: 2.965, y: 0.086, chord: 0.32, aoa: 5, camber: 0.07, thick: 0.1 },
  { z: 0.55, x: 2.955, y: 0.07, chord: 0.31, aoa: 7, camber: 0.08, thick: 0.1 },
  { z: 0.74, x: 2.935, y: 0.072, chord: 0.285, aoa: 8, camber: 0.08, thick: 0.1 },
  { z: HALF, x: 2.905, y: 0.088, chord: 0.265, aoa: 9, camber: 0.08, thick: 0.1 },
]
const MAIN: WingStation[] = [
  ...MAIN_HALF.slice(1)
    .reverse()
    .map((st) => ({ ...st, z: -st.z })),
  ...MAIN_HALF,
]

interface FlapDef {
  id: 'fw.flap1' | 'fw.flap2'
  /** Pivot (leading edge at mid span), x / y. */
  pivot: P2
  chord: number
  aoaClosed: number
  aoaOpen: number
  /** Leading edge height rise towards the endplate. */
  rise: number
}

const FLAPS: FlapDef[] = [
  { id: 'fw.flap1', pivot: [2.672, 0.118], chord: 0.17, aoaClosed: 24, aoaOpen: 9, rise: 0.035 },
  { id: 'fw.flap2', pivot: [2.53, 0.178], chord: 0.14, aoaClosed: 36, aoaOpen: 16, rise: 0.05 },
]
const FLAP_Z0 = 0.16

function flapStations(f: FlapDef): WingStation[] {
  const zs = [FLAP_Z0, 0.3, 0.5, 0.7, HALF - 0.005]
  return zs.map((z) => {
    const t = (z - FLAP_Z0) / (HALF - FLAP_Z0)
    return {
      z,
      x: f.pivot[0] - 0.012 * t,
      y: f.pivot[1] + f.rise * t * t,
      chord: f.chord * (1 - 0.08 * t),
      aoa: f.aoaClosed,
      camber: 0.08,
      thick: 0.09,
    }
  })
}

export function FrontWing() {
  return (
    <Part id="frontWing">
      <Explode dir={[0.95, 0.05, 0]}>
        <Sub id="fw.main">
          <MainPlane />
        </Sub>
        <Explode dir={[0.1, 0.12, 0]}>
          {FLAPS.map((f, i) => (
            <Explode key={f.id} dir={[0, 0.06 * (i + 1), 0]}>
              <Sub id={f.id}>
                <Flap def={f} />
              </Sub>
            </Explode>
          ))}
        </Explode>
        {([1, -1] as const).map((s) => (
          <Explode key={s} dir={[0, 0, s * 0.25]}>
            <Sub id="fw.endplate" primary={s === 1}>
              <Endplate side={s} />
            </Sub>
          </Explode>
        ))}
        <Explode dir={[0.1, 0.3, 0]}>
          <Sub id="fw.actuator">
            <FrontActuator />
          </Sub>
        </Explode>
      </Explode>
    </Part>
  )
}

function MainPlane() {
  const m = useMats()
  const geo = useGeometries(() => ({ main: wingLoft(MAIN, { step: 0.04, n: 16 }) }))
  return <mesh geometry={geo.main} material={m.carbon} castShadow />
}

/** One flap = two halves (left / right of the nose) on a common pivot axis, rotated by the active aero. */
function Flap({ def }: { def: FlapDef }) {
  const m = useMats()
  const { wingsOpen } = useCar()
  const geo = useGeometries(() => {
    const right = flapStations(def)
    const left = right
      .slice()
      .reverse()
      .map((s) => ({ ...s, z: -s.z }))
    return {
      right: wingLoft(right, { step: 0.05, n: 14, origin: def.pivot }),
      left: wingLoft(left, { step: 0.05, n: 14, origin: def.pivot }),
    }
  })
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const o = wingsOpen.current ?? 0
    // straight-line mode: the flap rotates around its leading edge, the trailing edge drops
    if (ref.current) ref.current.rotation.z = THREE.MathUtils.degToRad((def.aoaClosed - def.aoaOpen) * o)
  })
  const mat = def.id === 'fw.flap1' ? m.paint : m.accent
  return (
    <group ref={ref} position={[def.pivot[0], def.pivot[1], 0]}>
      <mesh geometry={geo.right} material={mat} castShadow />
      <mesh geometry={geo.left} material={mat} castShadow />
    </group>
  )
}

const EP_OUTLINE: P2[] = [
  [2.985, 0.03],
  [3.0, 0.1],
  [2.97, 0.17],
  [2.84, 0.225],
  [2.62, 0.25],
  [2.47, 0.245],
  [2.405, 0.205],
  [2.405, 0.12],
  [2.47, 0.055],
  [2.62, 0.03],
]
const EP_BAND: P2[] = [
  [2.975, 0.155],
  [2.84, 0.213],
  [2.62, 0.24],
  [2.47, 0.236],
  [2.42, 0.205],
  [2.47, 0.218],
  [2.62, 0.222],
  [2.84, 0.195],
  [2.985, 0.12],
]

function Endplate({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(() => {
    // slot cut-outs in the lower rear corner (they shape the tip vortex)
    const holes: P2[][] = [
      [
        [2.56, 0.075],
        [2.46, 0.09],
        [2.45, 0.115],
        [2.56, 0.1],
      ],
      [
        [2.86, 0.06],
        [2.74, 0.065],
        [2.74, 0.085],
        [2.86, 0.082],
      ],
    ]
    const plate = cutPlate(EP_OUTLINE, holes, 0.012, 0.003)
    const band = cutPlate(EP_BAND, [], 0.016, 0.002)
    // footplate: small horizontal plate at the bottom of the endplate, turning the flow outwards
    const foot = loftX(
      [
        { x: 2.99, w: 0.01 },
        { x: 2.9, w: 0.035 },
        { x: 2.6, w: 0.04 },
        { x: 2.48, w: 0.015 },
      ],
      (st) => ellipse(st.w, 0.006, 10, [side * (Z_EP - 0.01), 0.033]),
      { capStart: true, capEnd: true, step: 0.03 },
    )
    return { plate, band, foot }
  }, [side])
  return (
    <group>
      <mesh geometry={geo.plate} material={m.carbon} position={[0, 0, side * Z_EP]} castShadow />
      <mesh geometry={geo.band} material={m.accent} position={[0, 0, side * Z_EP]} />
      <mesh geometry={geo.foot} material={m.carbon} />
    </group>
  )
}

/** Actuator housing under the nose and the cranks driving the inner ends of the flaps. */
function FrontActuator() {
  const m = useMats()
  const geo = useGeometries(() => ({
    housing: loftX(
      [
        { x: 2.72, a: 0.012, b: 0.008 },
        { x: 2.68, a: 0.03, b: 0.018 },
        { x: 2.56, a: 0.032, b: 0.02 },
        { x: 2.5, a: 0.02, b: 0.012 },
      ],
      (st) => ellipse(st.a, st.b, 16, [0, 0.145]),
      { capStart: true, capEnd: true, step: 0.02 },
    ),
    cranks: merge(
      [1, -1].flatMap((s) => [
        strutGeometry([2.62, 0.15, s * 0.03], [2.66, 0.13, s * FLAP_Z0], 0.014, 0.006),
        strutGeometry([2.56, 0.155, s * 0.03], [2.52, 0.185, s * FLAP_Z0], 0.014, 0.006),
      ]),
    ),
    pins: merge([1, -1].flatMap((s) => [place(new THREE.SphereGeometry(0.008, 10, 8), [2.66, 0.13, s * FLAP_Z0]), place(new THREE.SphereGeometry(0.008, 10, 8), [2.52, 0.185, s * FLAP_Z0])])),
  }))
  return (
    <group>
      <mesh geometry={geo.housing} material={m.graphite} />
      <mesh geometry={geo.cranks} material={m.titanium} />
      <mesh geometry={geo.pins} material={m.titanium} />
    </group>
  )
}
