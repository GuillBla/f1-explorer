import { useMemo, useRef, type ReactNode } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { DIMS } from './dims'
import { cutPlate, latheZ, loftX, merge, place, ringsGeometry, rodGeometry, strutGeometry, superEllipse, type P2, type P3 } from './surface'
import { Explode, Part, Sub, useCar, useGeometries, useMats } from './Part'

export interface Corner {
  key: string
  x: number
  z: number
  r: number
  w: number
  side: 1 | -1
  front: boolean
}

export const CORNERS: Corner[] = [
  { key: 'fr', x: DIMS.frontAxleX, z: DIMS.trackZF, r: DIMS.tyreRF, w: DIMS.tyreWF, side: 1, front: true },
  { key: 'fl', x: DIMS.frontAxleX, z: -DIMS.trackZF, r: DIMS.tyreRF, w: DIMS.tyreWF, side: -1, front: true },
  { key: 'rr', x: DIMS.rearAxleX, z: DIMS.trackZR, r: DIMS.tyreRR, w: DIMS.tyreWR, side: 1, front: false },
  { key: 'rl', x: DIMS.rearAxleX, z: -DIMS.trackZR, r: DIMS.tyreRR, w: DIMS.tyreWR, side: -1, front: false },
]

/** Steering axis (kingpin), lateral position. */
const kingpinZ = (c: Corner) => c.z - c.side * 0.1

/* ------------------------------------------------------------------ */
/* Steering and wheel rotation                                         */
/* ------------------------------------------------------------------ */

/** Rotates its children around the kingpin of a front corner (no-op at the rear). */
function Steer({ corner, children }: { corner: Corner; children: ReactNode }) {
  const { steer } = useCar()
  const ref = useRef<THREE.Group>(null)
  const kz = kingpinZ(corner)
  useFrame(() => {
    if (ref.current && corner.front) ref.current.rotation.y = steer?.current ?? 0
  })
  return (
    <group ref={ref} position={[corner.x, 0, kz]}>
      <group position={[-corner.x, 0, -kz]}>{children}</group>
    </group>
  )
}

/** Spins its children around the wheel axle (placed at the wheel centre). */
function Spin({ corner, children }: { corner: Corner; children: ReactNode }) {
  const { wheelSpin } = useCar()
  const ref = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    const w = wheelSpin.current ?? 0
    if (ref.current && w !== 0) ref.current.rotation.z -= (w * Math.min(dt, 0.05) * DIMS.tyreRF) / corner.r
  })
  return (
    <group position={[corner.x, corner.r, corner.z]}>
      <group ref={ref}>{children}</group>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Wheels and tyres                                                    */
/* ------------------------------------------------------------------ */

function tyreProfile(R: number, w: number): P2[] {
  const hw = w / 2
  const rb = DIMS.rimR + 0.004
  const sh = 0.04 // shoulder radius
  const pts: P2[] = []
  // inner bead → sidewall (slight bulge) → shoulder → tread (slight crown) → mirror
  const side = (sgn: number): P2[] => {
    const out: P2[] = []
    for (let i = 0; i <= 6; i++) {
      const t = i / 6
      const r = rb + (R - sh - rb) * t
      const bulge = Math.sin(t * Math.PI) * 0.012 + t * 0.006
      out.push([r, sgn * (hw - 0.012 + bulge - 0.006)])
    }
    for (let i = 1; i <= 6; i++) {
      const a = (i / 6) * (Math.PI / 2)
      out.push([R - sh + Math.sin(a) * sh, sgn * (hw - sh + Math.cos(a) * sh)])
    }
    return out
  }
  const left = side(-1)
  const right = side(1).reverse()
  pts.push(...left)
  // crowned tread
  for (let i = 1; i < 6; i++) {
    const t = i / 6
    pts.push([R + 0.002 * Math.sin(t * Math.PI), -hw + sh + (w - 2 * sh) * t])
  }
  pts.push(...right)
  return pts
}

export function Wheels() {
  return (
    <Part id="wheels">
      {CORNERS.map((c) => (
        <Explode key={c.key} dir={[0, 0.05, c.side * 0.95]}>
          <Steer corner={c}>
            <Spin corner={c}>
              <Sub id="wh.tyre" primary={c.key === 'fr'}>
                <Tyre corner={c} />
              </Sub>
              <Sub id="wh.rim" primary={c.key === 'fr'}>
                <Rim corner={c} />
              </Sub>
              <Explode dir={[0, 0, c.side * 0.25]}>
                <Sub id="wh.cover" primary={c.key === 'fr'}>
                  <Cover corner={c} />
                </Sub>
                <Explode dir={[0, 0, c.side * 0.12]}>
                  <Sub id="wh.nut" primary={c.key === 'fr'}>
                    <Nut corner={c} />
                  </Sub>
                </Explode>
              </Explode>
            </Spin>
          </Steer>
        </Explode>
      ))}
    </Part>
  )
}

function useWheelGeo() {
  return useGeometries(() => {
    const geo: Record<string, THREE.BufferGeometry> = {}
    for (const front of [true, false]) {
      const k = front ? 'F' : 'R'
      const R = front ? DIMS.tyreRF : DIMS.tyreRR
      const w = front ? DIMS.tyreWF : DIMS.tyreWR
      const hw = w / 2
      geo['tyre' + k] = latheZ(tyreProfile(R, w), 72)
      geo['band' + k] = new THREE.TorusGeometry(R - 0.062, 0.0055, 6, 72)
      // rim: barrel with flanges (a thin shell)
      const rr = DIMS.rimR
      geo['barrel' + k] = latheZ(
        [
          [rr - 0.012, -hw * 0.86],
          [rr + 0.012, -hw * 0.9],
          [rr + 0.012, -hw * 0.84],
          [rr, -hw * 0.8],
          [rr, hw * 0.8],
          [rr + 0.014, hw * 0.84],
          [rr + 0.014, hw * 0.9],
          [rr - 0.012, hw * 0.86],
          [rr - 0.012, -hw * 0.86],
        ],
        60,
      )
      // ten spokes, dished outwards, plus the hub
      const spokes: THREE.BufferGeometry[] = []
      const a0 = hw * 0.15
      const a1 = hw * 0.62
      for (let i = 0; i < 10; i++) {
        const t = (i / 10) * Math.PI * 2
        const c = Math.cos(t)
        const s = Math.sin(t)
        spokes.push(strutGeometry([c * 0.065, s * 0.065, a0], [c * (rr - 0.008), s * (rr - 0.008), a1], 0.03, 0.012))
      }
      spokes.push(latheZ([[0.04, a0 - 0.05], [0.075, a0 - 0.04], [0.075, a0 + 0.02], [0.04, a0 + 0.03]], 24))
      geo['spokes' + k] = merge(spokes)
      // aerodynamic wheel cover, slightly concave, leaving the hub nut exposed
      geo['cover' + k] = latheZ(
        [
          [0.062, hw * 0.66],
          [0.12, hw * 0.7],
          [0.19, hw * 0.78],
          [rr + 0.004, hw * 0.86],
          [rr + 0.004, hw * 0.83],
          [0.19, hw * 0.75],
          [0.12, hw * 0.67],
          [0.062, hw * 0.63],
        ],
        60,
      )
      geo['ring' + k] = new THREE.TorusGeometry(0.17, 0.004, 6, 60)
      geo['ring' + k].translate(0, 0, hw * 0.765)
      geo['nut' + k] = place(new THREE.CylinderGeometry(0.042, 0.046, 0.045, 6), [0, 0, hw * 0.7], [Math.PI / 2, 0, 0])
      geo['pin' + k] = place(new THREE.CylinderGeometry(0.012, 0.012, 0.03, 10), [0, 0, hw * 0.7 + 0.03], [Math.PI / 2, 0, 0])
    }
    return geo
  })
}

/** Geometries are built with the outer face towards +z; the left wheels are mirrored with scale z = −1. */
const sideScale = (c: Corner): P3 => [1, 1, c.side]

function Tyre({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const geo = useWheelGeo()
  const k = c.front ? 'F' : 'R'
  const hw = c.w / 2
  return (
    <group>
      <mesh geometry={geo['tyre' + k]} material={m.rubber} castShadow receiveShadow />
      {[1, -1].map((f) => (
        <mesh key={f} geometry={geo['band' + k]} material={m.tyreBand} position={[0, 0, f * (hw - 0.004)]} />
      ))}
    </group>
  )
}

function Rim({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const geo = useWheelGeo()
  const k = c.front ? 'F' : 'R'
  return (
    <group scale={sideScale(c)}>
      <mesh geometry={geo['barrel' + k]} material={m.rim} />
      <mesh geometry={geo['spokes' + k]} material={m.rim} />
    </group>
  )
}

function Cover({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const geo = useWheelGeo()
  const k = c.front ? 'F' : 'R'
  return (
    <group scale={sideScale(c)}>
      <mesh geometry={geo['cover' + k]} material={m.graphite} />
      <mesh geometry={geo['ring' + k]} material={m.accent} />
    </group>
  )
}

function Nut({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const geo = useWheelGeo()
  const k = c.front ? 'F' : 'R'
  return (
    <group scale={sideScale(c)}>
      <mesh geometry={geo['nut' + k]} material={m.accent} />
      <mesh geometry={geo['pin' + k]} material={m.titanium} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Brakes                                                              */
/* ------------------------------------------------------------------ */

export function Brakes() {
  return (
    <Part id="brakes">
      {CORNERS.map((c) => (
        <Explode key={c.key} dir={[0, 0.1, c.side * 0.55]}>
          <Steer corner={c}>
            <Spin corner={c}>
              <Sub id="br.disc" primary={c.key === 'fr'}>
                <Disc corner={c} />
              </Sub>
            </Spin>
            <group position={[c.x, c.r, c.z]} scale={sideScale(c)}>
              <Sub id="br.caliper" primary={c.key === 'fr'}>
                <Caliper corner={c} />
              </Sub>
              <Explode dir={[0, 0, -0.12]}>
                <Sub id="br.duct" primary={c.key === 'fr'}>
                  <Duct corner={c} />
                </Sub>
              </Explode>
            </group>
          </Steer>
        </Explode>
      ))}
    </Part>
  )
}

/** Disc position: inboard of the wheel centre (local z, outer face = +z). */
const DISC_Z = -0.065

function Disc({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const R = c.front ? 0.164 : 0.14
  const geo = useGeometries(() => {
    const t = 0.032
    const edge = new THREE.CylinderGeometry(R, R, t, 72, 1, true)
    edge.rotateX(Math.PI / 2)
    const faces = merge([place(new THREE.RingGeometry(0.1, R, 72, 1), [0, 0, t / 2]), place(new THREE.RingGeometry(0.1, R, 72, 1), [0, 0, -t / 2], [0, Math.PI, 0])])
    const bell = latheZ(
      [
        [0.1, -t / 2],
        [0.1, t / 2],
        [0.075, t / 2 + 0.03],
        [0.05, t / 2 + 0.04],
      ],
      36,
    )
    return { edge, faces, bell }
  }, [R])
  return (
    <group position={[0, 0, c.side * DISC_Z]}>
      <mesh geometry={geo.edge} material={m.discVent} />
      <mesh geometry={geo.faces} material={m.disc} />
      <mesh geometry={geo.bell} material={m.metal} scale={[1, 1, c.side]} />
    </group>
  )
}

function Caliper({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const R = c.front ? 0.164 : 0.14
  const geo = useGeometries(() => {
    // annular sector straddling the disc, extruded through its thickness
    const a0 = c.front ? Math.PI * 0.82 : -Math.PI * 0.32
    const a1 = a0 + 0.95
    const outline: P2[] = []
    for (let i = 0; i <= 8; i++) {
      const a = a0 + ((a1 - a0) * i) / 8
      outline.push([Math.cos(a) * (R + 0.025), Math.sin(a) * (R + 0.025)])
    }
    for (let i = 8; i >= 0; i--) {
      const a = a0 + ((a1 - a0) * i) / 8
      outline.push([Math.cos(a) * (R - 0.045), Math.sin(a) * (R - 0.045)])
    }
    return { body: place(cutPlate(outline, [], 0.075, 0.006, false), [0, 0, DISC_Z]) }
  }, [R, c.front])
  return <mesh geometry={geo.body} material={m.caliper} castShadow />
}

/** Brake duct: inlet scoop on the inboard side and the carbon drum enclosing the disc. */
function Duct({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const geo = useGeometries(() => {
    const zIn = -c.w / 2 - 0.035
    const scoop = loftX(
      [
        { x: 0.24, a: 0.04, b: 0.065 },
        { x: 0.2, a: 0.042, b: 0.062 },
        { x: 0.13, a: 0.035, b: 0.05 },
        { x: 0.07, a: 0.025, b: 0.035 },
      ],
      (st) => superEllipse(st.a, st.b, 3, 20, [zIn, -0.07]),
      { capEnd: true, step: 0.03 },
    )
    const mouth = loftX(
      [
        { x: 0.241, a: 0.04, b: 0.065 },
        { x: 0.236, a: 0.032, b: 0.055 },
      ],
      (st) => superEllipse(st.a, st.b, 3, 20, [zIn, -0.07]),
      { capEnd: true, step: 0.1 },
    )
    const R = c.front ? 0.2 : 0.18
    const drum = latheZ(
      [
        [R, DISC_Z - 0.06],
        [R + 0.004, DISC_Z],
        [R, DISC_Z + 0.05],
        [R - 0.006, DISC_Z + 0.05],
        [R - 0.004, DISC_Z],
        [R - 0.006, DISC_Z - 0.06],
      ],
      48,
    )
    const back = place(new THREE.RingGeometry(0.06, R, 48, 1), [0, 0, DISC_Z - 0.06], [0, Math.PI, 0])
    return { scoop, mouth, drum, back }
  }, [c.front, c.w])
  return (
    <group>
      <mesh geometry={geo.scoop} material={m.carbon} />
      <mesh geometry={geo.mouth} material={m.dark} />
      <mesh geometry={geo.drum} material={m.carbonMatte} />
      <mesh geometry={geo.back} material={m.carbonMatte} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Suspension                                                          */
/* ------------------------------------------------------------------ */

interface Geometry2026 {
  upperF: P3
  upperR: P3
  upperOut: P3
  lowerF: P3
  lowerR: P3
  lowerOut: P3
  /** Push-rod (front) / pull-rod (rear): wheel end → rocker end. */
  rodOut: P3
  rodIn: P3
  /** Track rod (front, steering) / toe link (rear). */
  trackIn: P3
  trackOut: P3
}

/** Pick-up points (right side). Front: push-rod; rear: pull-rod (see content for the reasoning). */
function hardpoints(front: boolean, s: 1 | -1): Geometry2026 {
  const S = (p: P3): P3 => [p[0], p[1], s * p[2]]
  if (front) {
    return {
      upperF: S([1.98, 0.43, 0.125]),
      upperR: S([1.45, 0.455, 0.165]),
      upperOut: S([1.695, 0.5, 0.66]),
      lowerF: S([2.03, 0.18, 0.11]),
      lowerR: S([1.38, 0.16, 0.15]),
      lowerOut: S([1.71, 0.185, 0.69]),
      rodOut: S([1.7, 0.21, 0.665]),
      rodIn: S([1.57, 0.47, 0.13]),
      trackIn: S([1.9, 0.33, 0.115]),
      trackOut: S([1.86, 0.335, 0.665]),
    }
  }
  return {
    upperF: S([-1.42, 0.44, 0.13]),
    upperR: S([-1.95, 0.43, 0.105]),
    upperOut: S([-1.69, 0.5, 0.625]),
    lowerF: S([-1.36, 0.15, 0.15]),
    lowerR: S([-1.97, 0.165, 0.1]),
    lowerOut: S([-1.71, 0.175, 0.645]),
    rodOut: S([-1.69, 0.475, 0.61]),
    rodIn: S([-1.5, 0.19, 0.11]),
    trackIn: S([-1.98, 0.3, 0.1]),
    trackOut: S([-1.94, 0.3, 0.635]),
  }
}

export function Suspension() {
  return (
    <Part id="suspension">
      {CORNERS.map((c) => (
        <Explode key={c.key} dir={[0, 0.02, c.side * 0.35]}>
          <SuspensionCorner corner={c} />
        </Explode>
      ))}
    </Part>
  )
}

function SuspensionCorner({ corner: c }: { corner: Corner }) {
  const p = c.front ? 'sus.f' : 'sus.r'
  const primary = c.side === 1
  return (
    <group>
      <Sub id={`${p}.upper`} primary={primary}>
        <Wishbone a={hardpoints(c.front, c.side).upperF} b={hardpoints(c.front, c.side).upperR} out={hardpoints(c.front, c.side).upperOut} />
      </Sub>
      <Sub id={`${p}.lower`} primary={primary}>
        <Wishbone a={hardpoints(c.front, c.side).lowerF} b={hardpoints(c.front, c.side).lowerR} out={hardpoints(c.front, c.side).lowerOut} />
      </Sub>
      <Sub id={c.front ? 'sus.f.pushrod' : 'sus.r.pullrod'} primary={primary}>
        <Rod corner={c} />
      </Sub>
      <Sub id={c.front ? 'sus.f.trackrod' : 'sus.r.toelink'} primary={primary}>
        <TrackRod corner={c} />
      </Sub>
      <Steer corner={c}>
        <Sub id={`${p}.upright`} primary={primary}>
          <Upright corner={c} />
        </Sub>
      </Steer>
    </group>
  )
}

function Wishbone({ a, b, out }: { a: P3; b: P3; out: P3 }) {
  const m = useMats()
  const geo = useGeometries(
    () => ({
      legs: merge([strutGeometry(a, out, 0.055, 0.017), strutGeometry(b, out, 0.05, 0.016)]),
      joints: merge([place(new THREE.SphereGeometry(0.013, 12, 8), out), place(new THREE.SphereGeometry(0.011, 10, 8), a), place(new THREE.SphereGeometry(0.011, 10, 8), b)]),
    }),
    [a.join(), b.join(), out.join()],
  )
  return (
    <group>
      <mesh geometry={geo.legs} material={m.carbon} castShadow />
      <mesh geometry={geo.joints} material={m.titanium} />
    </group>
  )
}

function Rod({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const h = hardpoints(c.front, c.side)
  const geo = useGeometries(() => {
    // rocker (bell crank) at the inboard end, inside the bodywork
    const rocker = place(
      cutPlate(
        [
          [-0.03, -0.02],
          [0.035, -0.015],
          [0.03, 0.03],
          [-0.02, 0.025],
        ],
        [],
        0.012,
        0.002,
      ),
      h.rodIn,
      [Math.PI / 2, 0, 0],
    )
    return { rod: strutGeometry(h.rodOut, h.rodIn, 0.04, 0.018), rocker }
  }, [c.key])
  return (
    <group>
      <mesh geometry={geo.rod} material={m.accent} castShadow />
      <mesh geometry={geo.rocker} material={m.titanium} />
    </group>
  )
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)

/** Track rod (front) follows the steering in real time; rear toe link is static. */
function TrackRod({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const { steer } = useCar()
  const h = hardpoints(c.front, c.side)
  const geo = useGeometries(() => ({ rod: rodGeometry(1, 10), joint: new THREE.SphereGeometry(0.01, 10, 8) }))
  const ref = useRef<THREE.Mesh>(null)
  const ball = useRef<THREE.Mesh>(null)
  const kz = kingpinZ(c)
  const out = useMemo(() => new THREE.Vector3(), [])
  useFrame(() => {
    const ang = c.front ? (steer?.current ?? 0) : 0
    // outer end rotated with the upright around the kingpin
    const dx = h.trackOut[0] - c.x
    const dz = h.trackOut[2] - kz
    out.set(c.x + dx * Math.cos(ang) + dz * Math.sin(ang), h.trackOut[1], kz - dx * Math.sin(ang) + dz * Math.cos(ang))
    _a.set(...h.trackIn)
    _b.copy(out).sub(_a)
    const len = _b.length()
    const r = ref.current
    if (r) {
      r.position.copy(_a)
      r.quaternion.setFromUnitVectors(_up, _b.normalize())
      r.scale.set(0.009, len, 0.009)
    }
    if (ball.current) ball.current.position.copy(out)
  })
  return (
    <group>
      <mesh ref={ref} geometry={geo.rod} material={m.titanium} castShadow />
      <mesh ref={ball} geometry={geo.joint} material={m.metal} />
    </group>
  )
}

/** Upright (hub carrier): carries the wheel bearing, the caliper and the outer joints. */
function Upright({ corner: c }: { corner: Corner }) {
  const m = useMats()
  const h = hardpoints(c.front, c.side)
  const geo = useGeometries(() => {
    const zc = c.z - c.side * 0.115
    const ys = [h.lowerOut[1] - 0.01, c.r - 0.08, c.r, c.r + 0.08, h.upperOut[1] + 0.005]
    const half = [0.03, 0.05, 0.065, 0.05, 0.028]
    const rings = ys.map((y, i) => superEllipse(half[i], 0.025, 3, 16).map(([u, v]) => [c.x + u, y, zc + v] as P3))
    const body = ringsGeometry(rings, { capStart: true, capEnd: true })
    const arms = merge([
      strutGeometry([c.x, ys[4], zc], h.upperOut, 0.03, 0.02),
      strutGeometry([c.x, ys[0], zc], h.lowerOut, 0.03, 0.02),
      strutGeometry([c.x + 0.03, c.r - 0.02, zc], h.trackOut, 0.025, 0.016),
    ])
    return { body, arms }
  }, [c.key])
  return (
    <group>
      <mesh geometry={geo.body} material={m.metal} />
      <mesh geometry={geo.arms} material={m.metal} />
    </group>
  )
}
