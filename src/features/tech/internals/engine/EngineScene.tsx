import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MechStage, Tag } from '../three/MechStage'
import { createHousing, setClipping, useDisposables, useMechMats } from '../three/materials'
import { cylZ, gearGeometry, meshPhase, pitchRadius } from '../three/geom'
import { DEG, useMechStore } from '../store'
import {
  combustion,
  CYLS,
  DECK,
  engineSim,
  PIN_PHASE,
  PIN_Z,
  PITCH,
  R,
  slider,
  strokeOf,
  useEngineUi,
  VALVE,
  valveLift,
  cylPhase,
  type Cyl,
} from './kinematics'
import {
  bankBlockGeometry,
  bankZ,
  camCoverGeometry,
  CAM_BASE,
  camLobeGeometry,
  conrodGeometries,
  crankcaseGeometries,
  crankWebGeometry,
  deckGeometry,
  EXHAUST_R,
  gasGeometry,
  headWallsGeometry,
  INTAKE_R,
  jetGeometry,
  pistonGeometry,
  ringGeometries,
  SEAT_Y,
  STEM,
  TAPPET,
  VALVE_ANGLE,
  VALVE_X,
  VALVE_Z,
  valveGeometry,
} from './geometry'

const S = 0.01 // mm -> scene units
const BANKS = ['A', 'B'] as const
const CRANK_GEAR = 40
const MGUK_GEAR = 20
const GEAR_M = 2.6

/** Bank frame: rotation about z so that local +y is the bore axis. */
const bankRot = (bank: 'A' | 'B') => (bank === 'A' ? 45 : -45) * DEG
/** Intake side in the bank frame (+x for bank A, −x for bank B: always towards the inside of the V). */
const intakeSide = (bank: 'A' | 'B') => (bank === 'A' ? 1 : -1)

const COLORS = {
  admission: new THREE.Color('#3fa9f5'),
  compression: new THREE.Color('#7f6bff'),
  flame: new THREE.Color('#ffd27a'),
  burn: new THREE.Color('#ff5a1f'),
  exhaust: new THREE.Color('#a0704a'),
}

interface CylRefs {
  piston: THREE.Group | null
  rod: THREE.Group | null
  valves: (THREE.Group | null)[] // in0, in1, ex0, ex1
  gas: THREE.Mesh | null
  gasMat: THREE.MeshBasicMaterial
  pre: THREE.Mesh | null
  preMat: THREE.MeshBasicMaterial
  jets: THREE.Group | null
  exMat: THREE.MeshStandardMaterial
  inMat: THREE.MeshStandardMaterial
}

export default function EngineScene() {
  const m = useMechMats()
  const cut = useMechStore((s) => s.cut)
  const view = useEngineUi((s) => s.view)

  const geo = useDisposables(() => {
    const rod = conrodGeometries()
    const cc = crankcaseGeometries()
    return {
      piston: pistonGeometry(),
      rings: ringGeometries(),
      gudgeon: cylZ(9.5, 9.5, 58, 16),
      rodFrame: rod.frameGeo,
      rodWeb: rod.webGeo,
      rodShell: rod.shell,
      rodBolt: rod.bolt,
      web: crankWebGeometry(14),
      pin: cylZ(20, 20, 44, 28),
      journal: cylZ(22, 22, 36, 28),
      nose: cylZ(16, 16, 60, 20),
      flange: cylZ(36, 36, 10, 32),
      valveIn: valveGeometry(INTAKE_R),
      valveEx: valveGeometry(EXHAUST_R),
      tappet: new THREE.CylinderGeometry(12, 12, TAPPET, 20),
      spring: new THREE.CylinderGeometry(9.5, 9.5, 20, 16),
      lobeIn: camLobeGeometry(VALVE.intake, 12),
      lobeEx: camLobeGeometry(VALVE.exhaust, 12),
      camshaft: cylZ(10, 10, 1, 16),
      blockA: bankBlockGeometry('A'),
      blockB: bankBlockGeometry('B'),
      deckA: deckGeometry('A'),
      deckB: deckGeometry('B'),
      headA: headWallsGeometry('A'),
      headB: headWallsGeometry('B'),
      coverA: camCoverGeometry('A'),
      coverB: camCoverGeometry('B'),
      crankcase: cc.channel,
      bulkhead: cc.bulk,
      gas: gasGeometry(),
      pre: new THREE.SphereGeometry(6, 16, 12),
      jet: jetGeometry(),
      plugCeramic: new THREE.CylinderGeometry(5, 5, 70, 14),
      plugHex: new THREE.CylinderGeometry(9, 9, 12, 6),
      coil: new THREE.CylinderGeometry(11, 11, 34, 16),
      crankGear: gearGeometry({ teeth: CRANK_GEAR, module: GEAR_M, bore: 16, holes: 6 }, 16),
      mgukGear: gearGeometry({ teeth: MGUK_GEAR, module: GEAR_M, bore: 10 }, 16),
      camGear: gearGeometry({ teeth: 30, module: 1.5, bore: 9, holes: 5 }, 10),
      mguk: cylZ(48, 48, 150, 40),
      mgukCap: cylZ(50, 50, 10, 40),
    }
  })

  /* clipping planes (scene group at the origin, planes through the crank axis) */
  const planes = useMemo(() => {
    const nA = new THREE.Vector3(-Math.SQRT1_2, -Math.SQRT1_2, 0)
    const nB = new THREE.Vector3(Math.SQRT1_2, -Math.SQRT1_2, 0)
    // transverse section just behind the front pin: shows cylinders 3 and 6 from the front
    return { A: [new THREE.Plane(nA, 0)], B: [new THREE.Plane(nB, 0)], cross: [new THREE.Plane(new THREE.Vector3(0, 0, -1), PIN_Z[2] * S)] }
  }, [])

  const housing = useMemo(() => {
    const block = { A: createHousing('#8d95a3', planes.A), B: createHousing('#8d95a3', planes.B) }
    const head = { A: createHousing('#6f7786', planes.A), B: createHousing('#6f7786', planes.B) }
    const cover = { A: createHousing('#1d2027', planes.A, { metalness: 0.4, roughness: 0.35 }), B: createHousing('#1d2027', planes.B, { metalness: 0.4, roughness: 0.35 }) }
    const crankcase = createHousing('#8f97a5', planes.cross)
    return { block, head, cover, crankcase }
  }, [planes])
  const housingList = useMemo(() => {
    const out: { mat: THREE.Material; bank: 'A' | 'B' | 'case' }[] = [
      { mat: housing.crankcase.skin, bank: 'case' },
      { mat: housing.crankcase.section, bank: 'case' },
    ]
    for (const k of ['block', 'head', 'cover'] as const)
      for (const b of BANKS) {
        out.push({ mat: housing[k][b].skin, bank: b }, { mat: housing[k][b].section, bank: b })
      }
    return out
  }, [housing])
  useEffect(() => {
    for (const b of [...BANKS, 'case'] as const) {
      const p = !cut ? null : view === 'face' ? planes.cross : b === 'case' ? null : planes[b]
      setClipping(
        housingList.filter((h) => h.bank === b).map((h) => h.mat),
        p,
      )
    }
  }, [cut, view, housingList, planes])
  useEffect(() => () => housingList.forEach((h) => h.mat.dispose()), [housingList])

  const extra = useMemo(
    () => ({
      piston: new THREE.MeshStandardMaterial({ color: '#cfd4dc', metalness: 0.85, roughness: 0.3 }),
      jet: new THREE.MeshBasicMaterial({ color: '#ffb347', transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }),
    }),
    [],
  )
  useEffect(() => () => Object.values(extra).forEach((x) => x.dispose()), [extra])

  /* per-cylinder materials (gas, pre-chamber, pipes glow) */
  const cylRefs = useMemo<CylRefs[]>(
    () =>
      CYLS.map(() => ({
        piston: null,
        rod: null,
        valves: [null, null, null, null],
        gas: null,
        gasMat: new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, toneMapped: false, color: '#3fa9f5', opacity: 0.3 }),
        pre: null,
        preMat: new THREE.MeshBasicMaterial({ color: '#ffe0a0', transparent: true, opacity: 0, toneMapped: false, blending: THREE.AdditiveBlending, depthWrite: false }),
        jets: null,
        exMat: new THREE.MeshStandardMaterial({ color: '#c49a5c', metalness: 1, roughness: 0.35, emissive: '#ff4a10', emissiveIntensity: 0.1 }),
        inMat: new THREE.MeshStandardMaterial({ color: '#2a2e36', metalness: 0.3, roughness: 0.4, emissive: '#3fa9f5', emissiveIntensity: 0, transparent: true, opacity: 0.85 }),
      })),
    [],
  )
  useEffect(
    () => () =>
      cylRefs.forEach((c) => {
        c.gasMat.dispose()
        c.preMat.dispose()
        c.exMat.dispose()
        c.inMat.dispose()
      }),
    [cylRefs],
  )

  /* pipes */
  const pipes = useMemo(() => {
    const out: { cyl: number; bank: 'A' | 'B'; kind: 'in' | 'ex'; geo: THREE.TubeGeometry; bell?: THREE.TorusGeometry; bellPos?: THREE.Vector3; bellQ?: THREE.Quaternion }[] = []
    CYLS.forEach((c, i) => {
      const s = intakeSide(c.bank)
      // exhaust primary: out of the outer side, down, then back to the collector
      const ex = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-s * 78, SEAT_Y + 22, c.z),
        new THREE.Vector3(-s * 100, SEAT_Y + 20, c.z),
        new THREE.Vector3(-s * 132, SEAT_Y - 40, c.z - 20),
        new THREE.Vector3(-s * 140, 40, -230),
        new THREE.Vector3(-s * 120, 10, -300),
      ])
      out.push({ cyl: i, bank: c.bank, kind: 'ex', geo: new THREE.TubeGeometry(ex, 40, 13, 10, false) })
      // intake trumpet: from the port up into the V (variable-length trumpets on real engines)
      const inC = new THREE.CatmullRomCurve3([
        new THREE.Vector3(s * 78, SEAT_Y + 30, c.z),
        new THREE.Vector3(s * 104, SEAT_Y + 44, c.z),
        new THREE.Vector3(s * 128, SEAT_Y + 90, c.z),
        new THREE.Vector3(s * 136, SEAT_Y + 165, c.z),
      ])
      const end = inC.getPoint(1)
      const tan = inC.getTangent(1)
      const bell = new THREE.TorusGeometry(21, 4, 8, 24)
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), tan)
      out.push({ cyl: i, bank: c.bank, kind: 'in', geo: new THREE.TubeGeometry(inC, 32, 17, 12, false), bell, bellPos: end, bellQ: q })
    })
    return out
  }, [])
  useEffect(
    () => () =>
      pipes.forEach((p) => {
        p.geo.dispose()
        p.bell?.dispose()
      }),
    [pipes],
  )

  const crank = useRef<THREE.Group>(null)
  const cams = useRef<(THREE.Group | null)[]>([])
  const mgukGear = useRef<THREE.Group>(null)
  const camGears = useRef<(THREE.Group | null)[]>([])

  const dVec = (s: number) => new THREE.Vector3(s * Math.sin(VALVE_ANGLE * DEG), Math.cos(VALVE_ANGLE * DEG), 0)

  useFrame(() => {
    const th = engineSim.theta
    const focus = useEngineUi.getState().focus
    if (crank.current) crank.current.rotation.z = -th * DEG
    for (const g of cams.current) if (g) g.rotation.z = -(th / 2) * DEG
    for (const g of camGears.current) if (g) g.rotation.z = -(th / 2) * DEG
    if (mgukGear.current) mgukGear.current.rotation.z = meshPhase(CRANK_GEAR, MGUK_GEAR, -th * DEG)
    CYLS.forEach((c, i) => {
      const r = cylRefs[i]
      const k = slider(th, c)
      const ph = cylPhase(th, c)
      r.piston?.position.set(0, k.y, 0)
      if (r.rod) {
        r.rod.position.set(k.pinX, k.pinY, 0)
        r.rod.rotation.z = k.rodAngle
      }
      // valves
      const s = intakeSide(c.bank)
      const li = valveLift(ph, VALVE.intake)
      const le = valveLift(ph, VALVE.exhaust)
      const di = dVec(s)
      const de = dVec(-s)
      r.valves.forEach((v, j) => {
        if (!v) return
        const intake = j < 2
        const lift = intake ? li : le
        const d = intake ? di : de
        const x0 = (intake ? s : -s) * VALVE_X
        v.position.set(x0 - d.x * lift, SEAT_Y - d.y * lift, (j % 2 ? 1 : -1) * VALVE_Z)
      })
      // gas column between crown and deck
      const crownY = k.y + 24.8
      const h = Math.max(1, DECK - crownY)
      if (r.gas) {
        r.gas.position.y = crownY
        r.gas.scale.y = h
      }
      const st = strokeOf(ph)
      const cb = combustion(ph)
      const g = r.gasMat
      if (cb.main > 0.02 || cb.jets > 0.05) {
        g.color.copy(COLORS.burn).lerp(COLORS.flame, Math.min(1, cb.main * 1.2))
        g.opacity = 0.35 + 0.55 * Math.min(1, cb.main + cb.jets * 0.5)
      } else if (st === 'detente') {
        g.color.copy(COLORS.burn).lerp(COLORS.exhaust, Math.min(1, ph / 180))
        g.opacity = 0.4
      } else if (st === 'echappement') {
        g.color.copy(COLORS.exhaust)
        g.opacity = 0.32 - 0.12 * ((ph - 180) / 180)
      } else if (st === 'admission') {
        g.color.copy(COLORS.exhaust).lerp(COLORS.admission, Math.min(1, (ph - 360) / 60))
        g.opacity = 0.28
      } else {
        const t = (ph - 540) / 180
        g.color.copy(COLORS.admission).lerp(COLORS.compression, t)
        g.opacity = 0.28 + 0.3 * t
      }
      if (focus === c.n) g.opacity = Math.min(1, g.opacity + 0.12)
      r.preMat.opacity = Math.min(1, cb.pre * 1.2 + cb.jets * 0.6)
      if (r.pre) r.pre.scale.setScalar(0.7 + cb.pre * 0.8)
      if (r.jets) {
        r.jets.visible = cb.jets > 0.04
        r.jets.scale.set(1, 0.4 + cb.jets * 0.9, 1)
      }
      r.exMat.emissiveIntensity = 0.12 + (le / VALVE.exhaust.lift) * 1.4
      r.inMat.emissiveIntensity = (li / VALVE.intake.lift) * 0.9
    })
  })

  const frontCut = cut && view === 'face'

  return (
    <>
      <MechStage target={[0, 1.15, 0]} minDistance={1.5} maxDistance={16} />
      <CameraPreset />
      <group scale={S}>
        {/* ---------------- crankcase (fixed) ---------------- */}
        <mesh geometry={geo.crankcase} material={housing.crankcase.skin} />
        <mesh geometry={geo.crankcase} material={housing.crankcase.section} />
        {[-1.5, -0.5, 0.5, 1.5].map((k) => (
          <mesh key={k} geometry={geo.bulkhead} material={housing.crankcase.skin} position={[0, 0, k * PITCH]} />
        ))}

        {/* ---------------- crankshaft (rotating) ---------------- */}
        <group ref={crank}>
          {[-1.5, -0.5, 0.5, 1.5].map((k) => (
            <mesh key={k} geometry={geo.journal} material={m.polished} position={[0, 0, k * PITCH]} />
          ))}
          <mesh geometry={geo.nose} material={m.polished} position={[0, 0, PITCH * 1.5 + 45]} />
          <mesh geometry={geo.flange} material={m.steel} position={[0, 0, -PITCH * 1.5 - 24]} />
          <mesh geometry={geo.crankGear} material={m.steel} position={[0, 0, PITCH * 1.5 + 62]} visible={!frontCut} />
          {PIN_Z.map((z, k) => (
            <group key={k} position={[0, 0, z]} rotation={[0, 0, -PIN_PHASE[k] * DEG]}>
              <mesh geometry={geo.pin} material={m.polished} position={[0, R, 0]} />
              <mesh geometry={geo.web} material={m.steel} position={[0, 0, -29]} />
              <mesh geometry={geo.web} material={m.steel} position={[0, 0, 29]} />
              {k === 0 && <Tag position={[0, -64, -29]} tone="text">Contrepoids</Tag>}
            </group>
          ))}
        </group>
        <Tag position={[0, -10, PITCH * 1.5 + 30]} tone="accent">Vilebrequin (3 manetons à 120°)</Tag>

        {/* MGU-K drive (front gear train) */}
        <group position={[pitchRadius(CRANK_GEAR, GEAR_M) + pitchRadius(MGUK_GEAR, GEAR_M), 0, PITCH * 1.5 + 62]} visible={!frontCut}>
          <group ref={mgukGear}>
            <mesh geometry={geo.mgukGear} material={m.titanium} />
          </group>
          <mesh geometry={geo.mguk} material={m.blue} position={[0, 0, -85]} />
          <mesh geometry={geo.mgukCap} material={m.darkSteel} position={[0, 0, -12]} />
          {!frontCut && <Tag position={[30, -40, -60]} tone="info">MGU-K (entraîné par pignons)</Tag>}
        </group>

        {/* ---------------- banks ---------------- */}
        {BANKS.map((b) => {
          const s = intakeSide(b)
          const bz = bankZ(b)
          const camIn = new THREE.Vector3(s * VALVE_X, SEAT_Y, 0).add(dVec(s).multiplyScalar(STEM + TAPPET + CAM_BASE))
          const camEx = new THREE.Vector3(-s * VALVE_X, SEAT_Y, 0).add(dVec(-s).multiplyScalar(STEM + TAPPET + CAM_BASE))
          const camLen = bz.max - bz.min - 10
          const camMid = (bz.max + bz.min) / 2
          const cyls = CYLS.filter((c) => c.bank === b)
          return (
            <group key={b} rotation={[0, 0, bankRot(b)]}>
              {/* housings, cut along the bank plane */}
              <mesh geometry={b === 'A' ? geo.blockA : geo.blockB} material={housing.block[b].skin} />
              <mesh geometry={b === 'A' ? geo.blockA : geo.blockB} material={housing.block[b].section} />
              <mesh geometry={b === 'A' ? geo.deckA : geo.deckB} material={housing.head[b].skin} />
              <mesh geometry={b === 'A' ? geo.deckA : geo.deckB} material={housing.head[b].section} />
              <mesh geometry={b === 'A' ? geo.headA : geo.headB} material={housing.head[b].skin} />
              <mesh geometry={b === 'A' ? geo.headA : geo.headB} material={housing.head[b].section} />
              <mesh geometry={b === 'A' ? geo.coverA : geo.coverB} material={housing.cover[b].skin} />
              <mesh geometry={b === 'A' ? geo.coverA : geo.coverB} material={housing.cover[b].section} />

              {/* camshafts (rotate at half crank speed) */}
              {(['in', 'ex'] as const).map((kind, ci) => {
                const pos = kind === 'in' ? camIn : camEx
                const side = kind === 'in' ? s : -s
                const dn = Math.atan2(side * Math.sin(VALVE_ANGLE * DEG), -Math.cos(VALVE_ANGLE * DEG))
                const v = kind === 'in' ? VALVE.intake : VALVE.exhaust
                const peak = (v.open + v.close) / 2
                return (
                  <group key={kind} position={[pos.x, pos.y, 0]}>
                    <group ref={(el) => void (cams.current[(b === 'A' ? 0 : 2) + ci] = el)}>
                      <mesh geometry={geo.camshaft} material={m.polished} position={[0, 0, camMid]} scale={[1, 1, camLen]} />
                      {cyls.flatMap((c) =>
                        [-1, 1].map((zz) => (
                          <mesh
                            key={`${c.n}${zz}`}
                            geometry={kind === 'in' ? geo.lobeIn : geo.lobeEx}
                            material={m.polished}
                            position={[0, 0, c.z + zz * VALVE_Z]}
                            rotation={[0, 0, dn + ((c.fire + peak) / 2) * DEG]}
                          />
                        )),
                      )}
                    </group>
                    <group position={[0, 0, bz.max + 4]} visible={!frontCut} ref={(el) => void (camGears.current[(b === 'A' ? 0 : 2) + ci] = el)}>
                      <mesh geometry={geo.camGear} material={m.titanium} />
                    </group>
                  </group>
                )
              })}
              {b === 'B' && <Tag position={[camEx.x, camEx.y + 26, bz.max - 20]} tone="text">Arbre à cames échappement</Tag>}
              {b === 'A' && <Tag position={[camIn.x, camIn.y + 26, bz.max - 20]} side="left" tone="info">Arbre à cames admission</Tag>}

              {/* cylinders */}
              {cyls.map((c) => {
                const i = c.n - 1
                const r = cylRefs[i]
                const di = dVec(s)
                const de = dVec(-s)
                return (
                  <group key={c.n} position={[0, 0, c.z]}>
                    <CylinderParts
                      c={c}
                      r={r}
                      geo={geo}
                      mats={{ piston: extra.piston, ring: m.ring, rod: m.titanium, shell: m.copper, bolt: m.darkSteel, valveIn: m.titanium, valveEx: m.darkSteel, tappet: m.steel, spring: m.polished, ceramic: m.ceramic, hex: m.steel, coil: m.red, jet: extra.jet, gudgeon: m.polished }}
                      di={di}
                      de={de}
                      s={s}
                      tags={c.n === 3 || c.n === 6}
                    />
                  </group>
                )
              })}
              {/* pipes */}
              {pipes
                .filter((p) => p.bank === b)
                .map((p) => (
                  <group key={`${p.kind}${p.cyl}`}>
                    <mesh geometry={p.geo} material={p.kind === 'ex' ? cylRefs[p.cyl].exMat : cylRefs[p.cyl].inMat} />
                    {p.bell && p.bellPos && p.bellQ && <mesh geometry={p.bell} material={m.carbon} position={p.bellPos} quaternion={p.bellQ} />}
                  </group>
                ))}
              {b === 'A' && <Tag position={[-140, 60, -200]} side="left" tone="warn">Collecteur d’échappement → turbo</Tag>}
              {b === 'B' && <Tag position={[-136, SEAT_Y + 170, 95]} tone="info">Trompettes d’admission</Tag>}
            </group>
          )
        })}
      </group>
    </>
  )
}

type Geo = Record<string, THREE.BufferGeometry | THREE.BufferGeometry[]>

function CylinderParts({
  c,
  r,
  geo,
  mats,
  di,
  de,
  s,
  tags,
}: {
  c: Cyl
  r: CylRefs
  geo: Geo
  mats: Record<'piston' | 'ring' | 'rod' | 'shell' | 'bolt' | 'valveIn' | 'valveEx' | 'tappet' | 'spring' | 'ceramic' | 'hex' | 'coil' | 'jet' | 'gudgeon', THREE.Material>
  di: THREE.Vector3
  de: THREE.Vector3
  s: number
  tags: boolean
}) {
  const g = geo as Record<string, THREE.BufferGeometry> & { rings: THREE.BufferGeometry[] }
  const qi = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), di)
  const qe = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), de)
  const jetDirs = useMemo(
    () =>
      Array.from({ length: 6 }, (_, k) => {
        const a = (k / 6) * Math.PI * 2 + 0.3
        const dir = new THREE.Vector3(Math.cos(a) * 0.62, -0.78, Math.sin(a) * 0.62).normalize()
        return new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), dir)
      }),
    [],
  )
  return (
    <>
      {/* piston with rings and gudgeon pin */}
      <group ref={(el) => void (r.piston = el)}>
        <mesh geometry={g.piston} material={mats.piston} />
        {g.rings.map((rg, k) => (
          <mesh key={k} geometry={rg} material={mats.ring} />
        ))}
        <mesh geometry={g.gudgeon} material={mats.gudgeon} />
        {tags && <Tag position={[0, 30, 0]} tone="accent">{`Piston ${c.n}`}</Tag>}
      </group>
      {/* I-section titanium connecting rod */}
      <group ref={(el) => void (r.rod = el)}>
        <mesh geometry={g.rodFrame} material={mats.rod} />
        <mesh geometry={g.rodWeb} material={mats.rod} />
        <mesh geometry={g.rodShell} material={mats.shell} />
        <mesh geometry={g.rodBolt} material={mats.bolt} position={[-24, 0, 0]} />
        <mesh geometry={g.rodBolt} material={mats.bolt} position={[24, 0, 0]} />
        {tags && c.n === 3 && <Tag position={[0, 70, 0]} side="left">Bielle en I (titane)</Tag>}
      </group>
      {/* gas column */}
      <mesh ref={(el) => void (r.gas = el)} geometry={g.gas} material={r.gasMat} renderOrder={2} />
      {/* valves: 2 intake (inner side), 2 exhaust (outer side) */}
      {[0, 1, 2, 3].map((j) => (
        <group key={j} ref={(el) => void (r.valves[j] = el)} quaternion={j < 2 ? qi : qe}>
          <mesh geometry={j < 2 ? g.valveIn : g.valveEx} material={j < 2 ? mats.valveIn : mats.valveEx} />
          <mesh geometry={g.tappet} material={mats.tappet} position={[0, STEM + TAPPET / 2, 0]} />
        </group>
      ))}
      {/* pneumatic valve springs (fixed air cylinders around the stems) */}
      {[0, 1, 2, 3].map((j) => {
        const intake = j < 2
        const d = intake ? di : de
        const x0 = (intake ? s : -s) * VALVE_X
        const p = new THREE.Vector3(x0, SEAT_Y, (j % 2 ? 1 : -1) * VALVE_Z).addScaledVector(d, STEM - 26)
        return <mesh key={`sp${j}`} geometry={g.spring} material={mats.spring} position={p} quaternion={intake ? qi : qe} />
      })}
      {tags && c.n === 6 && (
        <>
          <Tag position={[-s * VALVE_X - 24, SEAT_Y + 40, 0]} tone="warn">Soupapes d’échappement</Tag>
          <Tag position={[s * VALVE_X + 26, SEAT_Y + 50, 0]} tone="info">Soupapes d’admission</Tag>
        </>
      )}
      {/* pre-chamber + spark plug + coil on the bore axis */}
      <mesh ref={(el) => void (r.pre = el)} geometry={g.pre} material={r.preMat} position={[0, DECK + 4, 0]} renderOrder={3} />
      <group ref={(el) => void (r.jets = el)} position={[0, DECK + 2, 0]} visible={false}>
        {jetDirs.map((q, k) => (
          <mesh key={k} geometry={g.jet} material={mats.jet} quaternion={q} renderOrder={3} />
        ))}
      </group>
      <mesh geometry={g.plugCeramic} material={mats.ceramic} position={[0, DECK + 50, 0]} />
      <mesh geometry={g.plugHex} material={mats.hex} position={[0, DECK + 20, 0]} />
      <mesh geometry={g.coil} material={mats.coil} position={[0, DECK + 100, 0]} />
      {tags && c.n === 3 && <Tag position={[0, DECK + 118, 0]} tone="f1">Bougie + préchambre (jet ignition)</Tag>}
    </>
  )
}

/** Moves the camera when the cut-away view changes. */
const VIEWS = {
  dessus: { pos: new THREE.Vector3(2.6, 8.6, 7.4), target: new THREE.Vector3(0, 1.1, 0) },
  face: { pos: new THREE.Vector3(1.6, 2.6, 10.2), target: new THREE.Vector3(0, 1.05, 0) },
}
function CameraPreset() {
  const view = useEngineUi((s) => s.view)
  const camera = useThree((s) => s.camera)
  const controls = useThree((s) => s.controls) as unknown as { target: THREE.Vector3; update: () => void } | null
  useEffect(() => {
    const v = VIEWS[view]
    camera.position.copy(v.pos)
    if (controls) {
      controls.target.copy(v.target)
      controls.update()
    } else camera.lookAt(v.target)
  }, [view, camera, controls])
  return null
}
