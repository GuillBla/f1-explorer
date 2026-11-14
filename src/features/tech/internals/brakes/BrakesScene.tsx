import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMechStore } from '../store'
import { createHousing, setClipping, useDisposables, useMechMats } from '../three/materials'
import { cylZ } from '../three/geom'
import { Flow, MechStage, Tag } from '../three/MechStage'
import { brakeSim } from './sim'
import { glowFor } from './thermal'

/*
 * Rear brake corner, modelled in millimetres (group scale 0.01 → 1 unit = 100 mm).
 * Disc in the XY plane, axis along z (+z = outboard, wheel side). Caliper on top of the disc.
 */
const S = 0.01
const R_OUT = 140 // Ø 280 mm rear disc (≈ regulation max, uncertain)
const R_IN = 100
const THICK = 32 // max thickness 32 mm
const HOLE_ROWS = 6
const HOLES_PER_ROW = 176 // 6 × 176 = 1 056 radial holes
const PAD_R0 = 102
const PAD_R1 = 139
const PAD_HALF_ANGLE = 0.3
const PAD_T = 13
const PLATE_T = 3
const PISTON_R_POS = 120
const PISTONS = [
  { a: -0.19, r: 15 }, // leading piston (smaller)
  { a: 0, r: 17 },
  { a: 0.19, r: 19 }, // trailing piston (larger): evens out pad wear
]
const GAP_OPEN = 4 // visual pad clearance when released (really ≈ 0.1-0.2 mm)
const CAL_IN = 37 // inner face of each caliper half (|z|)
const CAL_MID = 64
const CAL_OUT = 76
const CAL_A = 0.34
/** Cut plane (world units): removes everything above the pistons' centre line. */
const CUT_Y = (PISTON_R_POS + 2) * S

/** Annular sector shape (angles around +y). */
function sector(r0: number, r1: number, halfA: number, holes: { a: number; r: number; at: number }[] = []) {
  const s = new THREE.Shape()
  const a0 = Math.PI / 2 - halfA
  const a1 = Math.PI / 2 + halfA
  s.absarc(0, 0, r1, a0, a1, false)
  s.absarc(0, 0, r0, a1, a0, true)
  for (const h of holes) {
    const p = new THREE.Path()
    const ang = Math.PI / 2 + h.a
    p.absarc(h.at * Math.cos(ang), h.at * Math.sin(ang), h.r, 0, Math.PI * 2, true)
    s.holes.push(p)
  }
  return s
}

function extrude(shape: THREE.Shape, z0: number, z1: number, curveSegments = 24, bevel = 0) {
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: z1 - z0,
    bevelEnabled: bevel > 0,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments,
  })
  g.translate(0, 0, z0)
  return g
}

/** Friction ring with drive lugs on the inner edge. */
function discGeometry() {
  const s = new THREE.Shape()
  s.absarc(0, 0, R_OUT, 0, Math.PI * 2, false)
  const lugs = 12
  const hole = new THREE.Path()
  const pts: THREE.Vector2[] = []
  for (let i = 0; i < lugs; i++) {
    const a0 = (i / lugs) * Math.PI * 2
    const step = (Math.PI * 2) / lugs
    // lug: material protrudes inwards to r = R_IN - 10 over ~35 % of the pitch
    const seq: [number, number][] = [
      [0, R_IN],
      [0.3, R_IN],
      [0.36, R_IN - 11],
      [0.64, R_IN - 11],
      [0.7, R_IN],
    ]
    for (const [f, r] of seq) {
      const a = -(a0 + f * step) // clockwise for a hole
      pts.push(new THREE.Vector2(r * Math.cos(a), r * Math.sin(a)))
    }
  }
  hole.setFromPoints(pts)
  s.holes.push(hole)
  const g = extrude(s, -THICK / 2, THICK / 2, 96)
  return g
}

/** Bell: titanium hat linking the disc lugs to the hub, on the inboard side. */
function bellGeometry() {
  const prof = [
    [R_IN - 14, -THICK / 2 + 2],
    [R_IN - 4, -THICK / 2 + 2],
    [R_IN - 4, -THICK / 2 - 8],
    [R_IN - 10, -THICK / 2 - 26],
    [62, -THICK / 2 - 40],
    [36, -THICK / 2 - 42],
    [34, -THICK / 2 - 32],
    [58, -THICK / 2 - 30],
    [R_IN - 18, -THICK / 2 - 18],
    [R_IN - 14, -THICK / 2 + 2],
  ].map(([r, y]) => new THREE.Vector2(r, y))
  const g = new THREE.LatheGeometry(prof, 72)
  g.rotateX(Math.PI / 2) // lathe axis y → z
  return g
}

/** Brake cooling duct (carbon), from the front of the corner to the disc centre, inboard. */
function ductCurve() {
  return new THREE.CatmullRomCurve3([
    new THREE.Vector3(300, -230, -190),
    new THREE.Vector3(200, -150, -150),
    new THREE.Vector3(100, -60, -110),
    new THREE.Vector3(30, -15, -90),
  ])
}

export default function BrakesScene() {
  return (
    <>
      <MechStage target={[0, 0.2, 0]} minDistance={1.2} maxDistance={9} />
      <group scale={S}>
        <Corner />
      </group>
      <AirFlows />
    </>
  )
}

function Corner() {
  const m = useMechMats()
  const cut = useMechStore((s) => s.cut)
  const planes = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), CUT_Y)], [])

  const res = useDisposables(() => {
    const caliperHoles = PISTONS.map((p) => ({ a: p.a, r: p.r + 0.6, at: PISTON_R_POS }))
    const housing = createHousing('#7d8796', planes, { metalness: 0.75, roughness: 0.38, section: '#9a2a1c' })
    const discMat = new THREE.MeshStandardMaterial({ color: '#2b2a2c', metalness: 0.15, roughness: 0.72, emissive: '#000000' })
    const holeMat = new THREE.MeshBasicMaterial({ color: '#050505' })
    const fluidMat = new THREE.MeshStandardMaterial({ color: '#b26a00', emissive: '#ffb800', emissiveIntensity: 0, metalness: 0.2, roughness: 0.5 })
    const padMat = new THREE.MeshStandardMaterial({ color: '#3a3836', metalness: 0.1, roughness: 0.85, emissive: '#000000' })
    return {
      disc: discGeometry(),
      bell: bellGeometry(),
      holeDot: new THREE.CircleGeometry(1.25, 8),
      // caliper monobloc: two halves (bore layer + closed cap) joined by a bridge over the disc
      calBoreOut: extrude(sector(92, 160, CAL_A, caliperHoles), CAL_IN, CAL_MID, 32, 1.5),
      calCapOut: extrude(sector(92, 160, CAL_A), CAL_MID, CAL_OUT, 32, 2),
      calBoreIn: extrude(sector(92, 160, CAL_A, caliperHoles), -CAL_MID, -CAL_IN, 32, 1.5),
      calCapIn: extrude(sector(92, 160, CAL_A), -CAL_OUT, -CAL_MID, 32, 2),
      calBridge: extrude(sector(146, 166, CAL_A * 0.92), -CAL_IN, CAL_IN, 32, 2),
      mountLug: cylZ(9, 9, 26, 20),
      pad: extrude(sector(PAD_R0, PAD_R1, PAD_HALF_ANGLE), 0, PAD_T, 24),
      plate: extrude(sector(PAD_R0 - 2, PAD_R1 + 3, PAD_HALF_ANGLE + 0.03), 0, PLATE_T, 24),
      pistons: PISTONS.map((p) => {
        // hollow piston (cup), open towards the pad: thermal barrier against the hot pad
        const prof = [
          [0, 0],
          [p.r, 0],
          [p.r, 24],
          [p.r - 3, 24],
          [p.r - 3, 3],
          [0, 3],
        ].map(([r, y]) => new THREE.Vector2(r, y))
        const g = new THREE.LatheGeometry(prof, 36)
        g.rotateX(-Math.PI / 2) // axis y → -z: closed face at z = 0, open end at z = -24
        return g
      }),
      fluid: PISTONS.map((p) => cylZ(p.r - 0.5, p.r - 0.5, 1, 32)),
      hub: cylZ(34, 34, 90, 40),
      axle: cylZ(22, 22, 260, 32),
      upright: extrude(sector(40, 120, 1.1), -150, -104, 32, 3),
      duct: new THREE.TubeGeometry(ductCurve(), 40, 20, 20, false),
      line: new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(-50, 205, -70),
          new THREE.Vector3(-30, 172, -60),
          new THREE.Vector3(-20, 164, -40),
          new THREE.Vector3(0, 168, 0),
          new THREE.Vector3(20, 164, 40),
        ]),
        30,
        3.2,
        8,
        false,
      ),
      housing: [housing.skin, housing.section],
      skin: housing.skin,
      section: housing.section,
      discMat,
      holeMat,
      fluidMat,
      padMat,
    }
  }, [planes])

  useEffect(() => {
    setClipping([res.skin, res.section], cut ? planes : null)
  }, [cut, planes, res])

  // ventilation holes on the disc's outer edge (instanced, rotating with the disc)
  const holes = useMemo(() => {
    const im = new THREE.InstancedMesh(res.holeDot, res.holeMat, HOLE_ROWS * HOLES_PER_ROW)
    const o = new THREE.Object3D()
    let i = 0
    for (let row = 0; row < HOLE_ROWS; row++) {
      const z = -THICK / 2 + 3.2 + (row * (THICK - 6.4)) / (HOLE_ROWS - 1)
      for (let k = 0; k < HOLES_PER_ROW; k++) {
        const a = ((k + (row % 2) * 0.5) / HOLES_PER_ROW) * Math.PI * 2
        o.position.set((R_OUT + 0.15) * Math.cos(a), (R_OUT + 0.15) * Math.sin(a), z)
        o.lookAt(o.position.x * 2, o.position.y * 2, z)
        o.updateMatrix()
        im.setMatrixAt(i++, o.matrix)
      }
    }
    im.instanceMatrix.needsUpdate = true
    return im
  }, [res])
  useEffect(() => () => holes.dispose(), [holes])

  const discGroup = useRef<THREE.Group>(null)
  const padOut = useRef<THREE.Group>(null)
  const padIn = useRef<THREE.Group>(null)
  const fluidRefs = useRef<(THREE.Mesh | null)[]>([])

  useFrame(() => {
    const s = brakeSim
    if (discGroup.current) discGroup.current.rotation.z = -s.wheelAngle
    const gap = GAP_OPEN * (1 - s.clamp)
    if (padOut.current) padOut.current.position.z = THICK / 2 + gap
    if (padIn.current) padIn.current.position.z = -(THICK / 2 + gap)
    const [c, k] = glowFor(s.temp)
    res.discMat.emissive.copy(c)
    res.discMat.emissiveIntensity = k
    // pads glow a bit less than the disc
    const [c2, k2] = glowFor(s.temp - 120)
    res.padMat.emissive.copy(c2)
    res.padMat.emissiveIntensity = k2 * 0.7
    res.fluidMat.emissiveIntensity = Math.min(0.8, s.pressure / 60)
    // fluid column between bore bottom and piston back (grows as the piston moves out)
    const len = CAL_MID - (THICK / 2 + gap + PAD_T + PLATE_T + 24)
    fluidRefs.current.forEach((f, i) => {
      if (!f) return
      const side = i < PISTONS.length ? 1 : -1
      f.scale.z = Math.max(0.5, len)
      f.position.z = side * (CAL_MID - len / 2)
    })
  })

  const pistonPos = (p: (typeof PISTONS)[number]) => {
    const ang = Math.PI / 2 + p.a
    return [PISTON_R_POS * Math.cos(ang), PISTON_R_POS * Math.sin(ang)] as const
  }

  return (
    <group>
      {/* rotating parts: disc + holes + bell + hub */}
      <group ref={discGroup}>
        <mesh geometry={res.disc} material={res.discMat} />
        <primitive object={holes} />
        <mesh geometry={res.bell} material={m.titanium} />
        <mesh geometry={res.hub} material={m.steel} position={[0, 0, -THICK / 2 - 55]} />
        {/* drive pins */}
        {Array.from({ length: 12 }, (_, i) => {
          const a = ((i + 0.5) / 12) * Math.PI * 2
          return <mesh key={i} geometry={res.mountLug} material={m.polished} position={[(R_IN - 6) * Math.cos(a), (R_IN - 6) * Math.sin(a), -2]} scale={[0.4, 0.4, 1.2]} />
        })}
      </group>
      <mesh geometry={res.axle} material={m.darkSteel} position={[0, 0, -THICK / 2 - 150]} />
      <mesh geometry={res.upright} material={m.alu} rotation={[0, 0, Math.PI]} />
      <mesh geometry={res.duct} material={m.carbon} />

      {/* caliper body (clipped in cut-away view) */}
      {[res.calBoreOut, res.calCapOut, res.calBoreIn, res.calCapIn, res.calBridge].map((g, i) => (
        <group key={i}>
          <mesh geometry={g} material={res.skin} />
          {cut && <mesh geometry={g} material={res.section} />}
        </group>
      ))}
      <mesh geometry={res.line} material={m.copper} />

      {/* pads + pistons, outboard (+z) and inboard (-z) */}
      {[1, -1].map((side) => (
        <group key={side} ref={side === 1 ? padOut : padIn} position={[0, 0, side * (THICK / 2 + GAP_OPEN)]}>
          <group scale={[1, 1, side]}>
            <mesh geometry={res.pad} material={res.padMat} />
            <mesh geometry={res.plate} material={m.titanium} position={[0, 0, PAD_T]} />
            {PISTONS.map((p, i) => {
              const [x, y] = pistonPos(p)
              // cup opening faces the pad; closed back on the fluid side
              return <mesh key={i} geometry={res.pistons[i]} material={m.polished} position={[x, y, PAD_T + PLATE_T + 24]} />
            })}
          </group>
        </group>
      ))}
      {[1, -1].map((side) =>
        PISTONS.map((p, i) => {
          const [x, y] = pistonPos(p)
          return (
            <mesh
              key={`${side}-${i}`}
              ref={(el) => {
                fluidRefs.current[(side === 1 ? 0 : PISTONS.length) + i] = el
              }}
              geometry={res.fluid[i]}
              material={res.fluidMat}
              position={[x, y, side * 60]}
            />
          )
        }),
      )}

      <Tag position={[-R_OUT * 0.72, -R_OUT * 0.72, THICK / 2]} side="left" tone="warn">Disque carbone-carbone Ø 280 × 32 mm</Tag>
      <Tag position={[R_OUT * 0.94, -R_OUT * 0.34, 0]} side="right">≈ 1 050 trous de ventilation</Tag>
      <Tag position={[-50, 150, CAL_OUT]} side="left" tone="accent">Étrier monobloc 6 pistons</Tag>
      <Tag position={[pistonPos(PISTONS[2])[0], pistonPos(PISTONS[2])[1], CAL_MID - 6]} side="left">Piston Ø 38 (fuite)</Tag>
      <Tag position={[pistonPos(PISTONS[0])[0], pistonPos(PISTONS[0])[1], CAL_MID - 6]} side="right">Piston Ø 30 (attaque)</Tag>
      <Tag position={[30, PAD_R0 + 2, THICK / 2 + 6]} side="right" tone="warn">Plaquette carbone</Tag>
      <Tag position={[0, -40, -THICK / 2 - 36]} side="left">Cloche titane</Tag>
      <Tag position={[200, -150, -150]} side="right" tone="info">Écope de refroidissement</Tag>
      <Tag position={[-30, 172, -60]} side="left" tone="warn">Durite de liquide de frein</Tag>
    </group>
  )
}

/** Cooling air: fresh air through the duct, then hot air expelled radially through the disc holes. */
function AirFlows() {
  const curves = useMemo(() => {
    const inlet = ductCurve()
    const pts = inlet.getPoints(12)
    const cIn = new THREE.CatmullRomCurve3([...pts, new THREE.Vector3(10, 0, -40), new THREE.Vector3(0, 0, -10)].map((p) => p.clone().multiplyScalar(S)))
    const out: THREE.Curve<THREE.Vector3>[] = []
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2 + 0.3
      const spiral: THREE.Vector3[] = []
      for (let k = 0; k <= 8; k++) {
        const r = 80 + k * 30
        const aa = a + k * 0.09
        spiral.push(new THREE.Vector3(r * Math.cos(aa) * S, r * Math.sin(aa) * S, (-10 + Math.min(k, 3) * 3) * S))
      }
      out.push(new THREE.CatmullRomCurve3(spiral))
    }
    return { cIn: [cIn], out }
  }, [])
  const airRate = () => 0.15 + brakeSim.v / 140
  return (
    <>
      <Flow curves={curves.cIn} count={60} color="#5ab8ff" size={0.07} rate={airRate} jitter={0.12} intensity={() => 0.85} />
      <Flow curves={curves.out} count={10} color="#ff6a1a" size={0.065} rate={() => airRate() * 1.4} jitter={0.03} intensity={() => Math.min(1, Math.max(0.1, (brakeSim.temp - 250) / 500))} />
    </>
  )
}
