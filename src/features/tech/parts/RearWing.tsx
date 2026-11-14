import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIMS } from './dims'
import { cutPlate, loftX, merge, place, strutGeometry, superEllipse, wingLoft, type P2, type WingStation } from './surface'
import { Explode, Part, Sub, useCar, useGeometries, useMats } from './Part'

const HALF = DIMS.rearWing.span / 2
const Z_EP = HALF + 0.007

/** Main plane: fixed. Slight "spoon" (lower in the centre). */
const MAIN: WingStation[] = [-HALF, -0.3, 0, 0.3, HALF].map((z) => {
  const t = Math.abs(z) / HALF
  return { z, x: -2.07, y: 0.762 + 0.022 * t * t, chord: 0.3, aoa: 9 + 2 * t, camber: 0.09, thick: 0.1 }
})

const FLAP = {
  le: [-2.34, 0.826] as P2,
  chord: 0.19,
  aoaClosed: 40,
  aoaOpen: 11,
}
/** The flap pivots close to its trailing edge (as the 2011-2025 DRS flaps did). */
const FLAP_TE: P2 = [
  FLAP.le[0] - FLAP.chord * Math.cos(THREE.MathUtils.degToRad(FLAP.aoaClosed)),
  FLAP.le[1] + FLAP.chord * Math.sin(THREE.MathUtils.degToRad(FLAP.aoaClosed)),
]

export function RearWing() {
  return (
    <Part id="rearWing">
      <Explode dir={[-0.9, 0.45, 0]}>
        <Sub id="rw.main">
          <MainPlane />
        </Sub>
        <Explode dir={[-0.05, 0.22, 0]}>
          <Sub id="rw.flap">
            <Flap />
          </Sub>
        </Explode>
        {([1, -1] as const).map((s) => (
          <Explode key={s} dir={[0, 0, s * 0.3]}>
            <Sub id="rw.endplate" primary={s === 1}>
              <Endplate side={s} />
            </Sub>
          </Explode>
        ))}
        <Explode dir={[0, 0.12, 0]}>
          <Sub id="rw.actuator">
            <RearActuator />
          </Sub>
        </Explode>
        <Explode dir={[0, -0.15, 0]}>
          <Sub id="rw.pylon">
            <Pylon />
          </Sub>
        </Explode>
      </Explode>
      <Explode dir={[-0.55, -0.1, 0]}>
        <Sub id="rw.crash">
          <CrashStructure />
        </Sub>
        <Sub id="rw.light">
          <Lights />
        </Sub>
      </Explode>
    </Part>
  )
}

function MainPlane() {
  const m = useMats()
  const geo = useGeometries(() => ({ main: wingLoft(MAIN, { step: 0.05, n: 16 }) }))
  return <mesh geometry={geo.main} material={m.carbon} castShadow />
}

function Flap() {
  const m = useMats()
  const { wingsOpen } = useCar()
  const geo = useGeometries(() => {
    const st: WingStation[] = [-HALF + 0.003, 0, HALF - 0.003].map((z) => ({
      z,
      x: FLAP.le[0],
      y: FLAP.le[1] + 0.012 * (Math.abs(z) / HALF) ** 2,
      chord: FLAP.chord,
      aoa: FLAP.aoaClosed,
      camber: 0.08,
      thick: 0.09,
    }))
    // livery: red trailing edge band
    const paint = (x: number) => (x < FLAP_TE[0] + 0.05 ? 1 : 0)
    return { flap: wingLoft(st, { step: 0.05, n: 16, origin: FLAP_TE, paint: (x) => paint(x + FLAP_TE[0]) }) }
  })
  const ref = useRef<THREE.Group>(null)
  useFrame(() => {
    const o = wingsOpen.current ?? 0
    if (ref.current) ref.current.rotation.z = THREE.MathUtils.degToRad((FLAP.aoaClosed - FLAP.aoaOpen) * o)
  })
  return (
    <group ref={ref} position={[FLAP_TE[0], FLAP_TE[1], 0]}>
      <mesh geometry={geo.flap} material={[m.paint, m.accent]} castShadow />
    </group>
  )
}

const EP_OUTLINE: P2[] = [
  [-2.0, 0.66],
  [-1.99, 0.87],
  [-2.03, 0.945],
  [-2.14, 0.975],
  [-2.48, 0.972],
  [-2.585, 0.93],
  [-2.61, 0.8],
  [-2.56, 0.68],
  [-2.42, 0.62],
  [-2.2, 0.6],
]
const EP_BAND: P2[] = [
  [-2.02, 0.92],
  [-2.05, 0.955],
  [-2.14, 0.966],
  [-2.48, 0.962],
  [-2.575, 0.925],
  [-2.59, 0.9],
  [-2.48, 0.935],
  [-2.14, 0.94],
]

function Endplate({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(() => {
    // cut-outs: three slanted louvres at the top front corner and a lower slot
    const louvre = (x: number): P2[] => [
      [x, 0.84],
      [x - 0.022, 0.84],
      [x - 0.05, 0.92],
      [x - 0.028, 0.92],
    ]
    const holes: P2[][] = [
      louvre(-2.03),
      louvre(-2.075),
      louvre(-2.12),
      [
        [-2.3, 0.655],
        [-2.46, 0.67],
        [-2.5, 0.7],
        [-2.32, 0.685],
      ],
    ]
    return {
      plate: cutPlate(EP_OUTLINE, holes, 0.012, 0.003),
      band: cutPlate(EP_BAND, [], 0.016, 0.002),
    }
  })
  return (
    <group position={[0, 0, side * Z_EP]}>
      <mesh geometry={geo.plate} material={m.carbon} castShadow />
      <mesh geometry={geo.band} material={m.accent} />
    </group>
  )
}

/** Hydraulic actuator pod above the main plane, linked to the centre of the flap. */
function RearActuator() {
  const m = useMats()
  const geo = useGeometries(() => ({
    pod: loftX(
      [
        { x: -2.2, a: 0.006, b: 0.01 },
        { x: -2.25, a: 0.016, b: 0.028 },
        { x: -2.36, a: 0.016, b: 0.03 },
        { x: -2.4, a: 0.008, b: 0.016 },
      ],
      (st) => superEllipse(st.a, st.b, 2.4, 16, [0, 0.81]),
      { capStart: true, capEnd: true, step: 0.02 },
    ),
    rod: strutGeometry([-2.36, 0.83, 0], [-2.37, 0.86, 0], 0.012, 0.006),
  }))
  return (
    <group>
      <mesh geometry={geo.pod} material={m.graphite} />
      <mesh geometry={geo.rod} material={m.titanium} />
    </group>
  )
}

/** Central twin pylon carrying the wing from the rear crash structure (no beam wing in 2026). */
function Pylon() {
  const m = useMats()
  const geo = useGeometries(() => {
    const outline: P2[] = [
      [-2.12, 0.79],
      [-2.31, 0.8],
      [-2.33, 0.7],
      [-2.24, 0.42],
      [-2.16, 0.33],
      [-2.03, 0.33],
      [-2.08, 0.5],
    ]
    return {
      plates: merge([place(cutPlate(outline, [], 0.012, 0.003), [0, 0, 0.025]), place(cutPlate(outline, [], 0.012, 0.003), [0, 0, -0.025])]),
    }
  })
  return <mesh geometry={geo.plates} material={m.carbon} castShadow />
}

/** Rear impact structure (crash box) behind the gearbox. */
function CrashStructure() {
  const m = useMats()
  const geo = useGeometries(() => ({
    box: loftX(
      [
        { x: -1.82, a: 0.09, b: 0.075 },
        { x: -2.05, a: 0.075, b: 0.06 },
        { x: -2.3, a: 0.058, b: 0.047 },
        { x: -2.465, a: 0.048, b: 0.038 },
      ],
      (st) => superEllipse(st.a, st.b, 3, 24, [0, 0.27]),
      { capEnd: true, step: 0.04 },
    ),
  }))
  return <mesh geometry={geo.box} material={m.carbon} castShadow />
}

/** Rain light (rear of the crash structure) and the 2026 endplate lights. */
function Lights() {
  const m = useMats()
  const geo = useGeometries(() => {
    const lamp = cutPlate(
      [
        [-0.035, -0.02],
        [0.035, -0.02],
        [0.035, 0.02],
        [-0.035, 0.02],
      ],
      [],
      0.008,
      0.002,
      false,
    )
    lamp.rotateY(Math.PI / 2)
    lamp.translate(-2.468, 0.27, 0)
    const strips = merge(
      [1, -1].map((s) =>
        place(
          cutPlate(
            [
              [0, 0],
              [0.012, 0],
              [0.012, 0.12],
              [0, 0.12],
            ],
            [],
            0.006,
            0.001,
            false,
          ),
          [-2.6, 0.76, s * (Z_EP + 0.006)],
          [0, 0, 0.12],
        ),
      ),
    )
    return { lamp, strips }
  })
  return (
    <group>
      <mesh geometry={geo.lamp} material={m.led} />
      <mesh geometry={geo.strips} material={m.led} />
    </group>
  )
}
