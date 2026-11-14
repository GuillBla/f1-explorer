import * as THREE from 'three'
import { cutPlate, interpParams, loftX, merge, place, ringsGeometry, superEllipse, wingLoft, type P2, type P3 } from './surface'
import { Explode, Part, Sub, useGeometries, useMats } from './Part'

/* ------------------------------------------------------------------ */
/* Floor geometry (shared with the airflow model)                      */
/* ------------------------------------------------------------------ */

/** Underside of the central keel (plank top). */
export const FLOOR_Y = 0.04
/** Top of the flat floor. */
export const FLOOR_TOP = 0.075
/** Start of the diffuser ramp. */
export const DIFFUSER_X = -1.02

interface FloorStation extends Record<string, number> {
  x: number
  /** Half width of the floor. */
  w: number
  /** Height of the Venturi tunnel roof. */
  roof: number
  /** Keel depth below the tunnels (1 = full keel, 0 = none). */
  keel: number
  /** Width of the flat outer edge region. */
  edge: number
}

/**
 * 2026 floor: shorter Venturi inlets than in 2022-2025, a long flat "throat" and a smaller diffuser
 * (lower exit), so less downforce and less ride-height sensitivity.
 */
export const FLOOR_ST: FloorStation[] = [
  { x: 1.32, w: 0.4, roof: 0.2, keel: 1, edge: 0.06 },
  { x: 1.2, w: 0.56, roof: 0.165, keel: 1, edge: 0.08 },
  { x: 1.02, w: 0.7, roof: 0.12, keel: 1, edge: 0.11 },
  { x: 0.8, w: 0.755, roof: 0.088, keel: 1, edge: 0.13 },
  { x: 0.5, w: 0.765, roof: 0.075, keel: 1, edge: 0.14 },
  { x: -0.4, w: 0.765, roof: 0.075, keel: 1, edge: 0.14 },
  { x: -0.85, w: 0.76, roof: 0.075, keel: 1, edge: 0.14 },
  { x: DIFFUSER_X, w: 0.72, roof: 0.078, keel: 1, edge: 0.12 },
  { x: -1.2, w: 0.6, roof: 0.11, keel: 1, edge: 0.06 },
  { x: -1.38, w: 0.54, roof: 0.155, keel: 0.9, edge: 0.03 },
  { x: -1.6, w: 0.52, roof: 0.205, keel: 0.2, edge: 0.02 },
  { x: -1.95, w: 0.5, roof: 0.265, keel: 0, edge: 0.015 },
]

const smooth = (e0: number, e1: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)))
  return t * t * (3 - 2 * t)
}

/** Underside height of the floor at (|z|) for a station. */
export function floorBottom(s: FloorStation, az: number) {
  const tunnel = s.roof
  const keelY = FLOOR_Y + (tunnel - FLOOR_Y) * (1 - s.keel)
  const edgeY = Math.min(tunnel, FLOOR_Y + 0.012)
  // keel (|z| < 0.14) → tunnel → flat edge
  const kBlend = smooth(0.13, 0.19, az)
  const eBlend = smooth(s.w - s.edge - 0.05, s.w - s.edge, az)
  return keelY * (1 - kBlend) + (tunnel * (1 - eBlend) + edgeY * eBlend) * kBlend
}

const N_SIDE = 44

function floorRing(s: FloorStation): P2[] {
  const top: P2[] = []
  const bottom: P2[] = []
  for (let i = 0; i <= N_SIDE; i++) {
    const u = -1 + (2 * i) / N_SIDE
    // denser sampling near the edges and the keel
    const z = Math.sign(u) * Math.abs(u) ** 0.9 * s.w
    const yb = floorBottom(s, Math.abs(z))
    const yt = Math.max(FLOOR_TOP, yb + 0.016)
    bottom.push([z, yb])
    top.push([z, yt])
  }
  // closed ring: top from +w to −w, then bottom from −w to +w
  return [...top.reverse(), ...bottom.slice(0)]
}

export function Floor() {
  return (
    <Part id="floor">
      <Explode dir={[0, -0.42, 0]}>
        <Sub id="fl.floor">
          <FloorBody />
        </Sub>
        <Explode dir={[0, 0, 0]}>
          <Sub id="fl.fences">
            <Fences />
          </Sub>
        </Explode>
        {([1, -1] as const).map((s) => (
          <Explode key={s} dir={[0, 0.05, s * 0.25]}>
            <Sub id="fl.edge" primary={s === 1}>
              <EdgeWing side={s} />
            </Sub>
            <Sub id="fl.boards" primary={s === 1}>
              <Boards side={s} />
            </Sub>
          </Explode>
        ))}
      </Explode>
    </Part>
  )
}

function FloorBody() {
  const m = useMats()
  const geo = useGeometries(() => {
    const st = interpParams(
      FLOOR_ST.filter((s) => s.x >= DIFFUSER_X),
      'x',
      0.05,
    )
    const rings = st.map((s) => floorRing(s).map(([z, y]) => [s.x, y, z] as P3))
    return { floor: ringsGeometry(rings, { capStart: true, paint: (_x, y) => (y > FLOOR_TOP - 0.004 ? 0 : 1) }) }
  })
  return <mesh geometry={geo.floor} material={[m.carbonMatte, m.carbon]} castShadow receiveShadow />
}

/** Vertical vanes under the floor leading edge, steering the flow into the Venturi tunnels. */
function Fences() {
  const m = useMats()
  const geo = useGeometries(() => {
    const list: THREE.BufferGeometry[] = []
    const fences = [0.22, 0.32, 0.42, 0.52]
    for (const s of [1, -1]) {
      fences.forEach((z0, i) => {
        list.push(
          loftX(
            [1.3, 1.1, 0.9, 0.7].map((x, k) => {
              const t = k / 3
              const roof = interpRoof(x)
              return { x, zc: s * (z0 * (0.75 + 0.25 * t) + 0.05 * t * (i + 1)), yb: FLOOR_Y + 0.008 + 0.02 * (1 - t), yt: roof + 0.004 }
            }),
            (st) => superEllipse(0.004, (st.yt - st.yb) / 2, 5, 12, [st.zc, (st.yt + st.yb) / 2]),
            { capStart: true, capEnd: true, step: 0.05 },
          ),
        )
      })
    }
    return { fences: merge(list) }
  })
  return <mesh geometry={geo.fences} material={m.carbon} />
}

function interpRoof(x: number) {
  for (let i = 1; i < FLOOR_ST.length; i++) {
    const a = FLOOR_ST[i - 1]
    const b = FLOOR_ST[i]
    if (x <= a.x && x >= b.x) return a.roof + ((b.roof - a.roof) * (x - a.x)) / (b.x - a.x)
  }
  return x > FLOOR_ST[0].x ? FLOOR_ST[0].roof : FLOOR_ST[FLOOR_ST.length - 1].roof
}

export function floorHalfWidthAt(x: number) {
  for (let i = 1; i < FLOOR_ST.length; i++) {
    const a = FLOOR_ST[i - 1]
    const b = FLOOR_ST[i]
    if (x <= a.x && x >= b.x) return a.w + ((b.w - a.w) * (x - a.x)) / (b.x - a.x)
  }
  return NaN
}
export const floorRoofAt = interpRoof

/** Floor edge wing: a small curled element running along the edge, which rolls up the "skirt" vortex. */
function EdgeWing({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(() => {
    // built with span along z then turned so that the span runs along x and the chord points outwards
    const st = [0.95, 0.75, 0.5, 0.25, 0.05].map((x) => ({
      z: x,
      x: -(floorHalfWidthAt(x) - 0.03),
      y: 0.088 + 0.01 * Math.sin(((x - 0.05) / 0.9) * Math.PI),
      chord: 0.075,
      aoa: 22,
      camber: 0.1,
      thick: 0.1,
    }))
    const g = wingLoft(st, { step: 0.05, n: 10 })
    g.rotateY(Math.PI / 2)
    // supports
    const sup = merge(
      [0.8, 0.45, 0.15].map((x) =>
        place(
          cutPlate(
            [
              [0, 0],
              [0.03, 0],
              [0.02, 0.025],
              [0, 0.025],
            ],
            [],
            0.004,
            0.001,
            false,
          ),
          [x, FLOOR_TOP - 0.004, floorHalfWidthAt(x) - 0.012],
        ),
      ),
    )
    if (side === -1) {
      for (const h of [g, sup]) h.scale(1, 1, -1)
      flipWinding(g)
      flipWinding(sup)
    }
    return { wing: g, sup }
  }, [side])
  return (
    <group>
      <mesh geometry={geo.wing} material={m.carbon} castShadow />
      <mesh geometry={geo.sup} material={m.carbon} />
    </group>
  )
}

/** Front corner "wheel wake" boards on the floor, ahead of the sidepods. */
function Boards({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(() => {
    const outline: P2[] = [
      [1.16, FLOOR_TOP],
      [1.17, 0.24],
      [1.1, 0.31],
      [0.96, 0.32],
      [0.84, 0.27],
      [0.82, FLOOR_TOP],
    ]
    const g = cutPlate(outline, [[[1.06, 0.13], [0.92, 0.13], [0.92, 0.2], [1.06, 0.22]]], 0.008, 0.002)
    g.rotateY(side * 0.12)
    g.translate(0, 0, side * 0.68)
    const foot = place(
      cutPlate(
        [
          [1.17, 0],
          [0.82, 0],
          [0.82, 0.035],
          [1.17, 0.02],
        ],
        [],
        0.012,
        0.002,
      ),
      [0, FLOOR_TOP, side * 0.69],
      [0, side * 0.12, 0],
    )
    return { board: g, foot }
  }, [side])
  return (
    <group>
      <mesh geometry={geo.board} material={m.carbon} castShadow />
      <mesh geometry={geo.foot} material={m.paint} />
    </group>
  )
}

export function flipWinding(g: THREE.BufferGeometry) {
  const idx = g.index
  if (idx) {
    const a = idx.array as Uint32Array | Uint16Array
    for (let i = 0; i < a.length; i += 3) {
      const t = a[i + 1]
      a[i + 1] = a[i + 2]
      a[i + 2] = t
    }
    idx.needsUpdate = true
  } else {
    for (const attr of Object.values(g.attributes) as THREE.BufferAttribute[]) {
      const k = attr.itemSize
      const arr = attr.array as Float32Array
      for (let v = 0; v < attr.count; v += 3) {
        for (let c = 0; c < k; c++) {
          const t = arr[(v + 1) * k + c]
          arr[(v + 1) * k + c] = arr[(v + 2) * k + c]
          arr[(v + 2) * k + c] = t
        }
      }
    }
  }
  g.computeVertexNormals()
}

/* ------------------------------------------------------------------ */
/* Plank and skids                                                     */
/* ------------------------------------------------------------------ */

export function Plank() {
  return (
    <Part id="plank">
      <Explode dir={[0, -0.75, 0]}>
        <Sub id="pk.plank">
          <PlankBody />
        </Sub>
        <Explode dir={[0, -0.12, 0]}>
          <Sub id="pk.skids">
            <Skids />
          </Sub>
        </Explode>
      </Explode>
    </Part>
  )
}

function PlankBody() {
  const m = useMats()
  const geo = useGeometries(() => ({
    plank: loftX(
      [
        { x: 1.18, w: 0.06 },
        { x: 1.05, w: 0.14 },
        { x: -1.4, w: 0.15 },
        { x: -1.55, w: 0.1 },
      ],
      (st) => superEllipse(st.w, 0.005, 8, 28, [0, FLOOR_Y - 0.005]),
      { capStart: true, capEnd: true, step: 0.1 },
    ),
    holes: merge([0.55, -0.1, -0.75].map((x) => place(new THREE.CircleGeometry(0.02, 18), [x, FLOOR_Y - 0.0105, 0], [Math.PI / 2, 0, 0]))),
  }))
  return (
    <group>
      <mesh geometry={geo.plank} material={m.wood} castShadow />
      <mesh geometry={geo.holes} material={m.dark} />
    </group>
  )
}

function Skids() {
  const m = useMats()
  const geo = useGeometries(() => ({
    skids: merge(
      [0.85, 0.2, -0.45, -1.1].map((x) =>
        place(
          cutPlate(
            [
              [-0.08, -0.03],
              [0.08, -0.03],
              [0.08, 0.03],
              [-0.08, 0.03],
            ],
            [],
            0.004,
            0.001,
          ),
          [x, FLOOR_Y - 0.0115, 0],
          [Math.PI / 2, 0, 0],
        ),
      ),
    ),
  }))
  return <mesh geometry={geo.skids} material={m.titanium} />
}

/* ------------------------------------------------------------------ */
/* Diffuser                                                            */
/* ------------------------------------------------------------------ */

export function Diffuser() {
  return (
    <Part id="diffuser">
      <Explode dir={[-0.55, -0.3, 0]}>
        <Sub id="df.ramp">
          <Ramp />
        </Sub>
        <Explode dir={[-0.1, -0.1, 0]}>
          <Sub id="df.strakes">
            <Strakes />
          </Sub>
        </Explode>
      </Explode>
    </Part>
  )
}

function Ramp() {
  const m = useMats()
  const geo = useGeometries(() => {
    const st = interpParams(
      FLOOR_ST.filter((s) => s.x <= DIFFUSER_X),
      'x',
      0.04,
    )
    const rings = st.map((s) => floorRing(s).map(([z, y]) => [s.x, y, z] as P3))
    return { ramp: ringsGeometry(rings, { capEnd: true, paint: (x, y) => (x < -1.9 && y > 0.24 ? 1 : 0) }) }
  })
  return <mesh geometry={geo.ramp} material={[m.carbon, m.accent]} castShadow receiveShadow />
}

function Strakes() {
  const m = useMats()
  const geo = useGeometries(() => {
    const plate = (z: number, depth: number, x0: number) => {
      const xs = [x0, -1.25, -1.45, -1.65, -1.8, -1.95]
      const top: P2[] = xs.map((x) => [x, interpRoof(x) + 0.004])
      const bot: P2[] = xs
        .slice()
        .reverse()
        .map((x) => [x, Math.max(FLOOR_Y + 0.004, interpRoof(x) - depth * smooth(x0, x0 - 0.35, x))])
      return place(cutPlate([...top, ...bot], [], 0.008, 0.002, false), [0, 0, z])
    }
    const list = [plate(0.0, 0.11, -1.1), plate(0.2, 0.13, -1.05), plate(-0.2, 0.13, -1.05), plate(0.37, 0.12, -1.15), plate(-0.37, 0.12, -1.15)]
    // outer walls of the diffuser
    for (const s of [1, -1]) {
      const xs = [-1.3, -1.45, -1.65, -1.8, -1.95]
      const top: P2[] = xs.map((x) => [x, interpRoof(x) + 0.03])
      const bot: P2[] = xs
        .slice()
        .reverse()
        .map((x) => [x, FLOOR_Y + 0.01])
      list.push(place(cutPlate([...top, ...bot], [], 0.01, 0.002, false), [0, 0, s * (floorHalfWidthAt(-1.6) - 0.005)]))
    }
    return { strakes: merge(list) }
  })
  return <mesh geometry={geo.strakes} material={m.carbon} />
}
