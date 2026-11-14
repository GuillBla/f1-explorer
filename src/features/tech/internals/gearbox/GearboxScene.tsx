import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { cylZ, gearGeometry, tubeZ } from '../three/geom'
import { createHousing, setClipping, useDisposables, useMechMats } from '../three/materials'
import { MechStage, Tag } from '../three/MechStage'
import { useMechStore } from '../store'
import { bevelGeometry, dogs, merge } from './bevel'
import { CENTER, FINAL, GEARS, MODULE, RING_OF, RING_Z, SIDE_OF, STEP_DEG, TRAVEL, engagedGears, gearZ, ringOffsets, sim } from './sim'

const S = 0.01 // mm → scene units
const GEAR_W = 14
/** Bevel apex of the final drive (on the output shaft axis). */
const DP = Math.atan(FINAL.pinion / FINAL.crown)
const DC = Math.PI / 2 - DP
const ZA = 230
/** Differential: side gears (planétaires) and spider gears (satellites). */
const DIFF = { side: 16, spider: 10, module: 2.4, center: 58 }
const DS = Math.atan(DIFF.side / DIFF.spider)
/** Selector barrel position and the direction from it to the output shaft. */
const BARREL = new THREE.Vector2(82, -58)
const BARREL_R = 20
const U = BARREL.clone().normalize() // shaft → barrel
const PLANES = [new THREE.Plane(new THREE.Vector3(-1, 0, 0), 0)]
const PHI0 = Math.atan2(-BARREL.y, -BARREL.x) // barrel → shaft

/** Angle of a secondary (driven) gear meshing with the primary one rotating at `aP` (secondary below primary). */
function drivenAngle(aP: number, a: number, b: number) {
  const psi = -Math.PI / 2
  return psi + (-(aP - psi) * a) / b + Math.PI / b + Math.PI
}

export default function GearboxScene() {
  const m = useMechMats()
  const cut = useMechStore((s) => s.cut)

  const geo = useDisposables(() => {
    const prim = GEARS.map((g) => gearGeometry({ teeth: g.a, module: MODULE, bore: 0 }, GEAR_W))
    const driven = GEARS.map((g, i) => {
      const side = SIDE_OF[i]
      return merge([
        gearGeometry({ teeth: g.b, module: MODULE, bore: 19.5, holes: g.b > 36 ? 6 : 0 }, GEAR_W),
        // dog teeth on the face that looks at the dog ring
        ...dogs(6, 27, -side * (GEAR_W / 2 - 0.5), -side * 3.5, 7, 6),
        tubeZ(31, 19.5, 6).translate(0, 0, -side * (GEAR_W / 2 + 0.5)),
      ])
    })
    // dog ring: lathe profile with the fork groove + 6 dogs on each face
    const prof = [
      [19, -6],
      [34, -6],
      [34, -3],
      [30.5, -3],
      [30.5, 3],
      [34, 3],
      [34, 6],
      [19, 6],
      [19, -6],
    ].map(([r, y]) => new THREE.Vector2(r, y))
    const lathe = new THREE.LatheGeometry(prof, 40).rotateX(Math.PI / 2)
    const ring = merge([lathe, ...dogs(6, 26, 6, 4, 7, 6), ...dogs(6, 26, -6, -4, 7, 6)])
    // selector barrel grooves: one cam track per dog ring
    const grooves = RING_Z.map((z0, j) => {
      const pts: THREE.Vector3[] = []
      const off = [0, 0, 0, 0]
      for (let k = 0; k <= 240; k++) {
        const deg = -12 + (k / 240) * (8 * STEP_DEG + 24)
        const o = ringOffsets(deg / STEP_DEG, off)[j]
        const a = PHI0 + (deg * Math.PI) / 180
        pts.push(new THREE.Vector3((BARREL_R + 0.6) * Math.cos(a), (BARREL_R + 0.6) * Math.sin(a), z0 + o * TRAVEL))
      }
      return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 240, 2.3, 6, false)
    })
    // gearbox casing: rounded section, extruded along the shafts
    const outline = (x0: number, x1: number, y0: number, y1: number, r: number) => {
      const s = new THREE.Shape()
      s.moveTo(x0 + r, y0)
      s.lineTo(x1 - r, y0)
      s.absarc(x1 - r, y0 + r, r, -Math.PI / 2, 0, false)
      s.lineTo(x1, y1 - r)
      s.absarc(x1 - r, y1 - r, r, 0, Math.PI / 2, false)
      s.lineTo(x0 + r, y1)
      s.absarc(x0 + r, y1 - r, r, Math.PI / 2, Math.PI, false)
      s.lineTo(x0, y0 + r)
      s.absarc(x0 + r, y0 + r, r, Math.PI, Math.PI * 1.5, false)
      return s
    }
    const sh = outline(-100, 112, -98, 150, 34)
    const hole = outline(-94, 106, -92, 144, 28)
    sh.holes.push(new THREE.Path(hole.getPoints(8).reverse()))
    const casing = new THREE.ExtrudeGeometry(sh, { depth: 560, bevelEnabled: false, curveSegments: 8 })
    casing.translate(0, 0, -250)

    return {
      prim,
      driven,
      ring,
      grooves,
      casing,
      shaftP: cylZ(13, 13, 450, 24),
      shaftS: cylZ(17.5, 17.5, 350, 24),
      spline: cylZ(18.6, 18.6, 340, 28, true),
      barrel: cylZ(BARREL_R, BARREL_R, 300, 40),
      barrelAxle: cylZ(7, 7, 380, 16),
      star: gearGeometry({ teeth: 9, module: 4.2, bore: 0 }, 9),
      actuator: cylZ(15, 15, 34, 28),
      forkArm: new THREE.BoxGeometry(46, 7, 6),
      forkPin: cylZ(3.2, 3.2, 9, 12).rotateY(Math.PI / 2),
      claw: new THREE.TorusGeometry(32.5, 2.4, 8, 28, Math.PI * 1.15),
      clutchC: tubeZ(50, 16, 2.6, 48),
      clutchS: tubeZ(52, 22, 1.6, 48),
      basket: tubeZ(56, 53, 34, 48),
      bearing: tubeZ(24, 13, 12, 28),
      bearingS: tubeZ(28, 17.5, 14, 28),
      pinion: bevelGeometry(FINAL.pinion, FINAL.module, 15, DP),
      crown: bevelGeometry(FINAL.crown, FINAL.module, 15, DC, 32),
      side: bevelGeometry(DIFF.side, DIFF.module, 7, DS, 6),
      spider: bevelGeometry(DIFF.spider, DIFF.module, 7, Math.PI / 2 - DS, 4.2),
      crossPin: cylZ(4, 4, 46, 12).rotateX(Math.PI / 2),
      cageBar: new THREE.BoxGeometry(8, 8, 66),
      cageRing: tubeZ(46, 30, 6, 40),
      halfShaft: cylZ(9, 9, 240, 18),
      marker: new THREE.BoxGeometry(4, 3, 60),
    }
  })

  const extra = useDisposables(() => {
    const hl = new THREE.MeshStandardMaterial({ color: '#cfe9e6', metalness: 0.9, roughness: 0.25, emissive: '#00d2be', emissiveIntensity: 0.55 })
    const housing = createHousing('#ffffff', PLANES, { map: m.carbon.map ?? undefined, metalness: 0.35, roughness: 0.45 })
    return { hl, skin: housing.skin, section: housing.section }
  }, [m])
  useEffect(() => {
    setClipping([extra.skin, extra.section], cut ? PLANES : null)
  }, [cut, extra])

  const primary = useRef<THREE.Group>(null)
  const drivenRefs = useRef<(THREE.Mesh | null)[]>([])
  const primRefs = useRef<(THREE.Mesh | null)[]>([])
  const ringRefs = useRef<(THREE.Mesh | null)[]>([])
  const forkRefs = useRef<(THREE.Group | null)[]>([])
  const shaftS = useRef<THREE.Group>(null)
  const barrel = useRef<THREE.Group>(null)
  const pinion = useRef<THREE.Group>(null)
  const cage = useRef<THREE.Group>(null)
  const sideR = useRef<THREE.Group>(null)
  const sideL = useRef<THREE.Group>(null)
  const spiders = useRef<(THREE.Group | null)[]>([])
  const off = useRef([0, 0, 0, 0])

  useFrame(() => {
    const aP = sim.thetaP
    if (primary.current) primary.current.rotation.z = aP
    GEARS.forEach((g, i) => {
      const d = drivenRefs.current[i]
      if (d) d.rotation.z = drivenAngle(aP, g.a, g.b)
    })
    const aS = -sim.thetaS
    if (shaftS.current) shaftS.current.rotation.z = aS
    const o = ringOffsets(sim.pos, off.current)
    for (let j = 0; j < 4; j++) {
      const r = ringRefs.current[j]
      if (r) {
        r.position.z = RING_Z[j] + o[j] * TRAVEL
        r.rotation.z = aS
      }
      const f = forkRefs.current[j]
      if (f) f.position.z = RING_Z[j] + o[j] * TRAVEL
    }
    const eng = engagedGears(sim.pos)
    for (let i = 0; i < 8; i++) {
      const on = eng.includes(i)
      const d = drivenRefs.current[i]
      if (d) d.material = on ? extra.hl : m.darkSteel
      const p = primRefs.current[i]
      if (p) p.material = on ? extra.hl : m.steel
    }
    if (barrel.current) barrel.current.rotation.z = (-sim.pos * STEP_DEG * Math.PI) / 180
    // final drive: pinion turns with the output shaft, crown wheel and diff cage at pinion/crown
    const ap = sim.thetaS
    if (pinion.current) pinion.current.rotation.z = ap
    const ac = (-(ap - Math.PI) * FINAL.pinion) / FINAL.crown + Math.PI / FINAL.crown
    if (cage.current) cage.current.rotation.z = ac
    if (sideR.current) sideR.current.rotation.z = sim.diff
    if (sideL.current) sideL.current.rotation.z = sim.diff
    spiders.current.forEach((sp, k) => {
      if (sp) sp.rotation.z = (k === 0 ? 1 : -1) * sim.diff * (DIFF.side / DIFF.spider) + Math.PI / DIFF.spider
    })
  })

  const uAngle = Math.atan2(U.y, U.x)

  return (
    <>
      <MechStage target={[0.1, -0.05, -0.15]} minDistance={1.2} maxDistance={12} />
      <group scale={S} position={[0, -0.25, -0.35]}>
        {/* casing (carbon / titanium in reality), cut along the shafts plane */}
        <mesh geometry={geo.casing} material={extra.skin} />
        {cut && <mesh geometry={geo.casing} material={extra.section} />}

        {/* ---------- primary (input) shaft ---------- */}
        <group position={[0, CENTER, 0]}>
          <group ref={primary}>
            <mesh geometry={geo.shaftP} material={m.steel} position={[0, 0, -25]} />
            {GEARS.map((_, i) => (
              <mesh
                key={i}
                ref={(el) => {
                  primRefs.current[i] = el
                }}
                geometry={geo.prim[i]}
                material={m.steel}
                position={[0, 0, gearZ(i)]}
              />
            ))}
            {/* multi-plate carbon clutch at the engine side */}
            <group position={[0, 0, -222]}>
              {[0, 1, 2, 3].map((k) => (
                <mesh key={`c${k}`} geometry={geo.clutchC} material={m.carbon} position={[0, 0, -12 + k * 6.5]} />
              ))}
              {[0, 1, 2].map((k) => (
                <mesh key={`s${k}`} geometry={geo.clutchS} material={m.polished} position={[0, 0, -8.8 + k * 6.5]} />
              ))}
              <mesh geometry={geo.basket} material={m.titanium} />
            </group>
          </group>
          <mesh geometry={geo.bearing} material={m.ring} position={[0, 0, -175]} />
          <mesh geometry={geo.bearing} material={m.ring} position={[0, 0, 165]} />
          <Tag position={[0, 40, -150]}>Arbre primaire (entrée moteur)</Tag>
          <Tag position={[0, 60, -222]} tone="warn" side="left">
            Embrayage multidisque carbone
          </Tag>
        </group>

        {/* ---------- secondary (output) shaft ---------- */}
        <group ref={shaftS}>
          <mesh geometry={geo.shaftS} material={m.steel} position={[0, 0, -5]} />
          <mesh geometry={geo.spline} material={m.darkSteel} position={[0, 0, 0]} />
        </group>
        <mesh geometry={geo.bearingS} material={m.ring} position={[0, 0, -170]} />
        <mesh geometry={geo.bearingS} material={m.ring} position={[0, 0, 158]} />
        {GEARS.map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              drivenRefs.current[i] = el
            }}
            geometry={geo.driven[i]}
            material={m.darkSteel}
            position={[0, 0, gearZ(i)]}
          />
        ))}
        {RING_Z.map((z, j) => (
          <mesh
            key={j}
            ref={(el) => {
              ringRefs.current[j] = el
            }}
            geometry={geo.ring}
            material={m.blue}
            position={[0, 0, z]}
          />
        ))}
        <Tag position={[0, -20, -200]}>Arbre secondaire (sortie)</Tag>
        <Tag position={[-30, -66, gearZ(0)]} side="left">
          Pignon fou du 1er
        </Tag>

        {/* ---------- selector forks ---------- */}
        {RING_Z.map((z, j) => (
          <group
            key={j}
            ref={(el) => {
              forkRefs.current[j] = el
            }}
            position={[0, 0, z]}
          >
            <mesh geometry={geo.forkArm} material={m.titanium} position={[U.x * 58, U.y * 58, 0]} rotation={[0, 0, uAngle]} />
            <mesh geometry={geo.forkPin} material={m.polished} position={[U.x * 80, U.y * 80, 0]} rotation={[0, 0, uAngle]} />
            <mesh geometry={geo.claw} material={m.titanium} rotation={[0, 0, uAngle - Math.PI * 0.575]} />
            {j === 1 && <Tag position={[U.x * 50, U.y * 50, 0]} tone="accent">Fourchette</Tag>}
            <Tag position={[0, 40, 0]} tone="info">{`Baladeur ${'ABCD'[j]} (${GEARS.map((_, g) => g).filter((g) => RING_OF[g] === j).map((g) => g + 1).join('/')})`}</Tag>
          </group>
        ))}

        {/* ---------- selector barrel ---------- */}
        <group position={[BARREL.x, BARREL.y, 0]}>
          <mesh geometry={geo.barrelAxle} material={m.steel} />
          <group ref={barrel}>
            <mesh geometry={geo.barrel} material={m.steel} />
            {geo.grooves.map((g, j) => (
              <mesh key={j} geometry={g} material={m.copper} />
            ))}
            <mesh geometry={geo.star} material={m.red} position={[0, 0, -162]} />
          </group>
          <mesh geometry={geo.actuator} material={m.blue} position={[0, 0, -186]} />
          <Tag position={[24, -10, 60]} tone="warn">Barillet de sélection</Tag>
          <Tag position={[18, -14, -186]} side="right">Actionneur hydraulique</Tag>
        </group>

        {/* ---------- final drive and differential ---------- */}
        <group position={[0, 0, ZA]} rotation={[0, Math.PI, 0]}>
          <group ref={pinion}>
            <mesh geometry={geo.pinion} material={m.gold} />
          </group>
        </group>
        <Tag position={[0, 22, ZA - 64]} tone="warn" side="left">
          Pignon conique
        </Tag>
        <group position={[0, 0, ZA]} rotation={[0, Math.PI / 2, 0]}>
          <group ref={cage}>
            <mesh geometry={geo.crown} material={m.gold} />
            {[0, 1, 2].map((k) => {
              const a = (k * 2 * Math.PI) / 3 + Math.PI / 6
              return <mesh key={k} geometry={geo.cageBar} material={m.titanium} position={[38 * Math.cos(a), 38 * Math.sin(a), DIFF.center - 10]} rotation={[0, 0, a]} />
            })}
            <mesh geometry={geo.cageRing} material={m.titanium} position={[0, 0, DIFF.center + 22]} />
            <mesh geometry={geo.crossPin} material={m.polished} position={[0, 0, DIFF.center]} />
            {/* side gears + half shafts (turn at the wheel speeds) */}
            <group position={[0, 0, DIFF.center]}>
              <group ref={sideR}>
                <mesh geometry={geo.side} material={m.steel} />
                <mesh geometry={geo.halfShaft} material={m.steel} position={[0, 0, 140]} />
                <mesh geometry={geo.marker} material={m.red} position={[0, 9, 120]} />
              </group>
              <group rotation={[0, Math.PI, 0]}>
                <group ref={sideL}>
                  <mesh geometry={geo.side} material={m.steel} />
                  <mesh geometry={geo.halfShaft} material={m.steel} position={[0, 0, 140]} />
                  <mesh geometry={geo.marker} material={m.blue} position={[0, 9, 210]} />
                </group>
              </group>
              {[1, -1].map((sgn, k) => (
                <group key={k} rotation={[(-sgn * Math.PI) / 2, 0, 0]}>
                  <group
                    ref={(el) => {
                      spiders.current[k] = el
                    }}
                  >
                    <mesh geometry={geo.spider} material={m.titanium} />
                  </group>
                </group>
              ))}
            </group>
          </group>
        </group>
        <Tag position={[30, 76, ZA]} tone="warn">Couronne</Tag>
        <Tag position={[DIFF.center + 20, -30, ZA]} tone="accent">Différentiel (satellites / planétaires)</Tag>
        <Tag position={[DIFF.center + 170, 12, ZA]}>Arbre de roue droit</Tag>
      </group>
    </>
  )
}
