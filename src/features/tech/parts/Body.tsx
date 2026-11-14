import * as THREE from 'three'
import { at, clamp01, COVER, coverSection, NOSE, POD, podSection, TUB, tubSection } from './shapes'
import { cutPlate, ellipse, loftX, merge, place, rodGeometry, smoothClosed, smoothOpen3, strutGeometry, superEllipse, sweepPath, type P2, type P3 } from './surface'
import { Explode, Part, Sub, useGeometries, useMats } from './Part'

/* ------------------------------------------------------------------ */
/* Monocoque, nose, driver, mirrors                                    */
/* ------------------------------------------------------------------ */

/** Livery indices used by the body lofts: 0 paint (white), 1 carbon, 2 accent (red). */
const carbonLine = (x: number) => 0.2 + 0.1 * clamp01((2.15 - x) / 1.2)

const COCKPIT_OPENING: P2[] = superEllipse(0.33, 0.19, 2.6, 40, [0.3, 0]).map(([x, z]) => [x, z])

export function Cockpit() {
  return (
    <Part id="cockpit">
      <Explode dir={[0.15, 0.35, 0]}>
        <Sub id="ck.tub">
          <TubMeshes />
        </Sub>
        <Explode dir={[0.55, 0.05, 0]}>
          <Sub id="ck.nose">
            <NoseMeshes />
          </Sub>
        </Explode>
        <Explode dir={[0, 0.55, 0]}>
          <Sub id="ck.driver">
            <DriverMeshes />
          </Sub>
        </Explode>
        <Explode dir={[0.25, 0.4, 0]}>
          <Sub id="ck.steering">
            <SteeringMeshes />
          </Sub>
        </Explode>
        <Explode dir={[0.1, 0.25, 0]}>
          <Sub id="ck.mirrors">
            <MirrorMeshes />
          </Sub>
        </Explode>
        <Explode dir={[0, 0.3, 0]}>
          <Sub id="ck.antennas">
            <AntennaMeshes />
          </Sub>
        </Explode>
      </Explode>
    </Part>
  )
}

function NoseMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    nose: loftX(NOSE, tubSection, {
      step: 0.03,
      capStart: true,
      paint: (x, y, z) => (x > 2.47 ? 2 : y < 0.19 ? 1 : Math.abs(z) < 0.028 ? 2 : 0),
    }),
  }))
  return <mesh geometry={geo.nose} material={[m.paint, m.carbon, m.accent]} castShadow />
}

function TubMeshes() {
  const m = useMats()
  const geo = useGeometries(() => {
    const opening = new THREE.Shape(COCKPIT_OPENING.map(([x, z]) => new THREE.Vector2(x, z)))
    const floor = new THREE.ShapeGeometry(opening, 8)
    floor.rotateX(-Math.PI / 2)
    floor.translate(0, 0.664, 0)
    const rimPath: P3[] = COCKPIT_OPENING.map(([x, z]) => [x, 0.663 + 0.004 * Math.cos(((x - 0.3) / 0.33) * Math.PI), z])
    rimPath.push(rimPath[0])
    return {
      tub: loftX(TUB, tubSection, {
        step: 0.04,
        capEnd: true,
        paint: (x, y, z) => (y < carbonLine(x) ? 1 : Math.abs(z) < 0.026 && y > 0.35 && x > 0.66 ? 2 : 0),
      }),
      opening: floor,
      rim: sweepPath(rimPath, () => ellipse(0.016, 0.011, 8)),
    }
  })
  return (
    <group>
      <mesh geometry={geo.tub} material={[m.paint, m.carbon, m.accent]} castShadow receiveShadow />
      <mesh geometry={geo.opening} material={m.dark} />
      <mesh geometry={geo.rim} material={m.carbon} />
    </group>
  )
}

const HELMET: P3 = [0.13, 0.765, 0]

function DriverMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    shell: place(new THREE.SphereGeometry(1, 40, 28), HELMET, [0, 0, 0], [0.148, 0.128, 0.122]),
    // visor opening: front band of the shell, slightly proud
    visor: place(new THREE.SphereGeometry(1, 28, 10, Math.PI - 0.95, 1.9, 1.08, 0.5), HELMET, [0, 0, -0.02], [0.152, 0.131, 0.125]),
    stripe: place(new THREE.SphereGeometry(1, 40, 6, 0, Math.PI * 2, 0.62, 0.14), HELMET, [0, 0, 0.06], [0.1505, 0.13, 0.1235]),
    spoiler: place(
      cutPlate(
        [
          [-0.13, 0.03],
          [-0.02, 0.05],
          [-0.02, 0.06],
          [-0.15, 0.05],
        ],
        [],
        0.12,
        0.004,
      ),
      [HELMET[0], HELMET[1] + 0.07, 0],
    ),
    collar: place(new THREE.CylinderGeometry(0.11, 0.14, 0.09, 24), [HELMET[0] - 0.02, 0.65, 0]),
    pads: merge(
      [1, -1].map((s) =>
        loftX(
          [
            { x: 0.24, w: 0.03, h: 0.04 },
            { x: 0.15, w: 0.05, h: 0.07 },
            { x: -0.02, w: 0.05, h: 0.08 },
          ],
          (st) => superEllipse(st.w, st.h, 3, 16, [s * 0.165, 0.665]),
          { capStart: true, capEnd: true, step: 0.04 },
        ),
      ),
    ),
  }))
  return (
    <group>
      <mesh geometry={geo.shell} material={m.helmet} castShadow />
      <mesh geometry={geo.visor} material={m.visor} />
      <mesh geometry={geo.stripe} material={m.accent} />
      <mesh geometry={geo.spoiler} material={m.accent} />
      <mesh geometry={geo.collar} material={m.suit} />
      <mesh geometry={geo.pads} material={m.pad} />
    </group>
  )
}

function SteeringMeshes() {
  const m = useMats()
  const geo = useGeometries(() => {
    const body = cutPlate(
      [
        [-0.135, -0.04],
        [-0.13, 0.05],
        [-0.07, 0.07],
        [0.07, 0.07],
        [0.13, 0.05],
        [0.135, -0.04],
        [0.09, -0.07],
        [-0.09, -0.07],
      ],
      [
        [
          [-0.125, -0.03],
          [-0.12, 0.03],
          [-0.095, 0.035],
          [-0.095, -0.035],
        ],
        [
          [0.125, -0.03],
          [0.095, -0.035],
          [0.095, 0.035],
          [0.12, 0.03],
        ],
      ],
      0.035,
      0.006,
    )
    body.rotateY(Math.PI / 2)
    body.rotateZ(-0.35)
    body.translate(0.43, 0.6, 0)
    const screen = new THREE.PlaneGeometry(0.08, 0.04)
    screen.rotateY(-Math.PI / 2)
    screen.rotateZ(-0.35)
    screen.translate(0.411, 0.607, 0)
    return { body, screen }
  })
  return (
    <group>
      <mesh geometry={geo.body} material={m.carbon} />
      <mesh geometry={geo.screen} material={m.glass} />
    </group>
  )
}

function MirrorMeshes() {
  const m = useMats()
  const geo = useGeometries(() => {
    const housings: THREE.BufferGeometry[] = []
    const stalks: THREE.BufferGeometry[] = []
    const glass: THREE.BufferGeometry[] = []
    for (const s of [1, -1]) {
      const zc = s * 0.47
      const X = 0.74
      const Y = 0.665
      housings.push(
        loftX(
          [
            { x: X + 0.075, a: 0.025, b: 0.012 },
            { x: X + 0.055, a: 0.065, b: 0.024 },
            { x: X + 0.02, a: 0.078, b: 0.028 },
            { x: X, a: 0.08, b: 0.03 },
          ],
          (st) => superEllipse(st.a, st.b, 3.2, 24, [zc, Y]),
          { capStart: true, capEnd: true, step: 0.01 },
        ),
      )
      glass.push(place(new THREE.PlaneGeometry(0.15, 0.05), [X - 0.0015, Y, zc], [0, -Math.PI / 2, 0]))
      // two streamlined stalks: to the sidepod shoulder and to the chassis
      stalks.push(strutGeometry([X + 0.03, Y - 0.025, zc + s * 0.02], [X - 0.12, 0.55, s * 0.5], 0.04, 0.01))
      stalks.push(strutGeometry([X + 0.03, Y - 0.02, zc - s * 0.06], [X + 0.02, 0.6, s * 0.24], 0.035, 0.009))
    }
    return { housing: merge(housings), stalk: merge(stalks), glass: merge(glass) }
  })
  return (
    <group>
      <mesh geometry={geo.housing} material={m.paint} castShadow />
      <mesh geometry={geo.glass} material={m.glass} />
      <mesh geometry={geo.stalk} material={m.carbon} />
    </group>
  )
}

function AntennaMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    rods: merge([
      place(rodGeometry(0.003), [1.05, 0.59, 0.05], [0, 0, 0.2], [1, 0.07, 1]),
      place(rodGeometry(0.003), [1.05, 0.59, -0.05], [0, 0, 0.2], [1, 0.07, 1]),
      place(rodGeometry(0.0025), [-1.15, 0.64, 0], [0, 0, 0.35], [1, 0.09, 1]),
    ]),
    bases: merge([
      place(new THREE.CylinderGeometry(0.008, 0.012, 0.012, 10), [1.05, 0.596, 0.05]),
      place(new THREE.CylinderGeometry(0.008, 0.012, 0.012, 10), [1.05, 0.596, -0.05]),
      place(new THREE.CylinderGeometry(0.007, 0.01, 0.01, 10), [-1.15, 0.645, 0]),
    ]),
  }))
  return (
    <group>
      <mesh geometry={geo.rods} material={m.graphite} />
      <mesh geometry={geo.bases} material={m.graphite} />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Halo                                                                */
/* ------------------------------------------------------------------ */

const HALO_HOOP: P3[] = smoothOpen3(
  [
    [-0.075, 0.64, -0.232],
    [-0.035, 0.77, -0.242],
    [0.07, 0.868, -0.236],
    [0.26, 0.9, -0.19],
    [0.43, 0.902, -0.105],
    [0.5, 0.9, 0],
    [0.43, 0.902, 0.105],
    [0.26, 0.9, 0.19],
    [0.07, 0.868, 0.236],
    [-0.035, 0.77, 0.242],
    [-0.075, 0.64, 0.232],
  ],
  8,
)
const HALO_PILLAR: P3[] = smoothOpen3(
  [
    [0.49, 0.9, 0],
    [0.57, 0.84, 0],
    [0.66, 0.73, 0],
    [0.72, 0.64, 0],
  ],
  8,
)

export function Halo() {
  return (
    <Part id="halo">
      <Explode dir={[0.25, 0.85, 0]}>
        <Sub id="halo.structure">
          <HaloStructure />
        </Sub>
        <Explode dir={[0, 0.2, 0]}>
          <Sub id="halo.fairing">
            <HaloFairing />
          </Sub>
        </Explode>
      </Explode>
    </Part>
  )
}

function HaloStructure() {
  const m = useMats()
  const geo = useGeometries(() => ({
    hoop: sweepPath(HALO_HOOP, () => ellipse(0.021, 0.021, 14), { capStart: true, capEnd: true }),
    pillar: sweepPath(HALO_PILLAR, (t) => ellipse(0.022 + 0.008 * t, 0.024, 14), { capStart: true, capEnd: true }),
    feet: merge([
      place(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), [-0.075, 0.645, 0.232]),
      place(new THREE.CylinderGeometry(0.03, 0.04, 0.03, 16), [-0.075, 0.645, -0.232]),
      place(new THREE.CylinderGeometry(0.035, 0.045, 0.03, 16), [0.72, 0.645, 0], [0, 0, -0.5]),
    ]),
  }))
  return (
    <group>
      <mesh geometry={geo.hoop} material={m.titanium} castShadow />
      <mesh geometry={geo.pillar} material={m.titanium} castShadow />
      <mesh geometry={geo.feet} material={m.titanium} />
    </group>
  )
}

function HaloFairing() {
  const m = useMats()
  const geo = useGeometries(() => {
    // aerodynamic fairing on top of the titanium tube (airfoil-like, the tube stays visible underneath)
    const hoopTop = HALO_HOOP.slice(10, HALO_HOOP.length - 10)
    const sec = () => {
      const pts: P2[] = []
      for (let i = 0; i < 16; i++) {
        const t = (i / 16) * Math.PI * 2
        const c = Math.cos(t)
        const s = Math.sin(t)
        pts.push([c * 0.034, 0.006 + s * (s > 0 ? 0.024 : 0.018)])
      }
      return pts
    }
    return {
      fairing: sweepPath(hoopTop, sec, { capStart: true, capEnd: true }),
      pillar: sweepPath(HALO_PILLAR.slice(0, 12), () => ellipse(0.03, 0.03, 14, [0, 0.004]), { capStart: true, capEnd: true }),
    }
  })
  return (
    <group>
      <mesh geometry={geo.fairing} material={m.graphite} castShadow />
      <mesh geometry={geo.pillar} material={m.accent} castShadow />
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Sidepods                                                            */
/* ------------------------------------------------------------------ */

export function Sidepods() {
  return (
    <Part id="sidepods">
      {([1, -1] as const).map((s) => (
        <Explode key={s} dir={[0, 0.1, s * 0.7]}>
          <Sub id="sp.body" primary={s === 1}>
            <PodBody side={s} />
          </Sub>
          <Sub id="sp.inlet" primary={s === 1}>
            <PodInlet side={s} />
          </Sub>
          <Sub id="sp.louvres" primary={s === 1}>
            <PodLouvres side={s} />
          </Sub>
        </Explode>
      ))}
    </Part>
  )
}

/** Mirrors a right-side geometry to the left side (z → −z) and restores the triangle winding. */
const mirrorZ = (g: THREE.BufferGeometry, s: 1 | -1) => {
  if (s === 1) return g
  g.scale(1, 1, -1)
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
      attr.needsUpdate = true
    }
  }
  g.computeVertexNormals()
  return g
}

function PodBody({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(
    () => ({
      body: mirrorZ(
        loftX(POD, podSection, {
          step: 0.035,
          capEnd: true,
          paint: (x, y, z) => {
            const ym = at(POD, x, 'ym')
            if (y < ym - 0.02) return 1
            const yt = at(POD, x, 'yt')
            // red flick along the top of the shoulder, at the front
            if (x > -0.55 && z > at(POD, x, 'zo') - 0.11 && y > yt - 0.035 && y < yt - 0.012) return 2
            return 0
          },
        }),
        side,
      ),
    }),
    [side],
  )
  return <mesh geometry={geo.body} material={[m.paint, m.carbon, m.accent]} castShadow receiveShadow />
}

function PodInlet({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(() => {
    const s0 = POD[0]
    const ring = podSection(s0)
    const cz = (s0.zi + s0.zo) / 2 + 0.03
    const cy = (s0.yt + s0.yb) / 2
    // lip (front face annulus) and dark duct going inside towards the radiators
    const lip = loftX(
      [
        { x: s0.x + 0.012, k: 0.86 },
        { x: s0.x - 0.002, k: 1.0 },
      ],
      (st) => ring.map(([z, y]) => [cz + (z - cz) * st.k, cy + (y - cy) * st.k] as P2),
      { step: 0.1 },
    )
    const duct = loftX(
      [
        { x: s0.x, k: 0.86 },
        { x: s0.x - 0.08, k: 0.8 },
        { x: s0.x - 0.16, k: 0.7 },
      ],
      (st) => ring.map(([z, y]) => [cz + (z - cz) * st.k, cy + (y - cy) * st.k] as P2),
      { step: 0.04, capEnd: true },
    )
    // radiator core visible at the back of the duct
    const core = loftX(
      [
        { x: s0.x - 0.12, k: 0.74 },
        { x: s0.x - 0.13, k: 0.74 },
      ],
      (st) => ring.map(([z, y]) => [cz + (z - cz) * st.k, cy + (y - cy) * st.k] as P2),
      { step: 0.1, capStart: true },
    )
    return { lip: mirrorZ(lip, side), duct: mirrorZ(duct, side), core: mirrorZ(core, side) }
  }, [side])
  return (
    <group>
      <mesh geometry={geo.lip} material={m.accent} />
      <mesh geometry={geo.duct} material={m.dark} />
      <mesh geometry={geo.core} material={m.metal} />
    </group>
  )
}

function PodLouvres({ side }: { side: 1 | -1 }) {
  const m = useMats()
  const geo = useGeometries(() => {
    const list: THREE.BufferGeometry[] = []
    // cooling louvres on the top of the sidepod, behind the halo rear mounts
    for (let i = 0; i < 6; i++) {
      const x = -0.32 - i * 0.065
      const yt = at(POD, x, 'yt')
      const z0 = 0.27
      const z1 = at(POD, x, 'zo') - 0.08
      const g = cutPlate(
        [
          [0, 0],
          [0.045, 0],
          [0.045, 0.006],
          [0, 0.014],
        ],
        [],
        Math.max(0.04, z1 - z0),
        0.001,
        false,
      )
      g.translate(x, yt - 0.006, (z0 + z1) / 2)
      list.push(g)
    }
    return { louvres: mirrorZ(merge(list), side) }
  }, [side])
  return <mesh geometry={geo.louvres} material={m.carbon} />
}

/* ------------------------------------------------------------------ */
/* Engine cover, airbox, fin, T-camera, exhaust                        */
/* ------------------------------------------------------------------ */

export function EngineCover() {
  return (
    <Part id="engineCover">
      <Explode dir={[-0.35, 1.05, 0]}>
        <Sub id="ec.cover">
          <CoverMeshes />
        </Sub>
        <Sub id="ec.airbox">
          <AirboxMeshes />
        </Sub>
        <Explode dir={[0, 0.25, 0]}>
          <Sub id="ec.fin">
            <FinMeshes />
          </Sub>
          <Sub id="ec.tcam">
            <TcamMeshes />
          </Sub>
        </Explode>
      </Explode>
      <Explode dir={[-0.6, 0.15, 0]}>
        <Sub id="ec.exhaust">
          <ExhaustMeshes />
        </Sub>
      </Explode>
    </Part>
  )
}

function CoverMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    cover: loftX(COVER, coverSection, {
      step: 0.04,
      capStart: true,
      capEnd: true,
      paint: (x, y, z) => {
        const ys = at(COVER, x, 'ys')
        if (y < ys - 0.04) return 1
        // red band wrapping the cover behind the airbox
        if (x < -0.5 && x > -0.62 && y > ys - 0.04) return 2
        if (Math.abs(z) < 0.02 && x < -1.4) return 2
        return 0
      },
    }),
  }))
  return <mesh geometry={geo.cover} material={[m.paint, m.carbon, m.accent]} castShadow receiveShadow />
}

function AirboxMeshes() {
  const m = useMats()
  const geo = useGeometries(() => {
    // rounded-triangle inlet on the front face of the roll structure
    const outline: P2[] = smoothClosed(
      [
        [0, 0.945],
        [0.06, 0.93],
        [0.072, 0.86],
        [0.04, 0.79],
        [0, 0.775],
        [-0.04, 0.79],
        [-0.072, 0.86],
        [-0.06, 0.93],
      ],
      5,
    )
    const shape = new THREE.Shape(outline.map(([z, y]) => new THREE.Vector2(z, y)))
    const inlet = new THREE.ShapeGeometry(shape, 4)
    inlet.rotateY(Math.PI / 2)
    inlet.translate(-0.026, 0, 0)
    const lipPath: P3[] = outline.map(([z, y]) => [-0.025, y, z])
    lipPath.push(lipPath[0])
    return {
      inlet,
      lip: sweepPath(lipPath, () => ellipse(0.008, 0.012, 8), { up: [1, 0, 0] }),
    }
  })
  return (
    <group>
      <mesh geometry={geo.inlet} material={m.dark} />
      <mesh geometry={geo.lip} material={m.accent} />
    </group>
  )
}

function FinMeshes() {
  const m = useMats()
  const geo = useGeometries(() => {
    const top = (x: number) => at(COVER, x, 'yt')
    const fin = cutPlate(
      [
        [-0.42, top(-0.42) - 0.02],
        [-0.55, top(-0.55) + 0.05],
        [-1.2, top(-1.2) + 0.1],
        [-1.48, top(-1.48) + 0.11],
        [-1.55, top(-1.55) + 0.06],
        [-1.58, top(-1.58) - 0.02],
      ],
      [],
      0.007,
      0.002,
    )
    return { fin }
  })
  return <mesh geometry={geo.fin} material={m.accent} castShadow />
}

function TcamMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    pod: loftX(
      [
        { x: -0.06, a: 0.02, b: 0.008 },
        { x: -0.08, a: 0.065, b: 0.016 },
        { x: -0.12, a: 0.068, b: 0.016 },
        { x: -0.15, a: 0.05, b: 0.01 },
      ],
      (st) => superEllipse(st.a, st.b, 2.6, 20, [0, 1.015]),
      { capStart: true, capEnd: true, step: 0.01 },
    ),
    stem: strutGeometry([-0.11, 0.97, 0], [-0.105, 1.01, 0], 0.05, 0.012),
    lens: place(new THREE.CircleGeometry(0.008, 16), [-0.0595, 1.015, 0.035], [0, Math.PI / 2, 0]),
  }))
  return (
    <group>
      <mesh geometry={geo.pod} material={m.graphite} />
      <mesh geometry={geo.stem} material={m.graphite} />
      <mesh geometry={geo.lens} material={m.glass} />
    </group>
  )
}

function ExhaustMeshes() {
  const m = useMats()
  const geo = useGeometries(() => {
    const prof: P2[] = [
      [0.034, 0.0],
      [0.04, 0.12],
      [0.043, 0.16],
      [0.037, 0.16],
      [0.033, 0.12],
      [0.028, 0.0],
    ]
    const pipe = new THREE.LatheGeometry(
      prof.map(([r, a]) => new THREE.Vector2(r, a)),
      24,
    )
    pipe.rotateZ(Math.PI / 2)
    pipe.translate(-1.9, 0.415, 0)
    const inner = new THREE.CircleGeometry(0.033, 20)
    inner.rotateY(-Math.PI / 2)
    inner.translate(-2.045, 0.415, 0)
    return { pipe, inner }
  })
  return (
    <group>
      <mesh geometry={geo.pipe} material={m.exhaust} />
      <mesh geometry={geo.inner} material={m.dark} />
    </group>
  )
}
