import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Flow, MechStage, Tag } from '../three/MechStage'
import { createHousing, setClipping, useDisposables, useMechMats } from '../three/materials'
import { cylX, cylZ, gearGeometry, meshPhase, pitchRadius, tubeZ } from '../three/geom'
import { useMechStore } from '../store'
import { ersSim, P_MAX, SOC_WINDOW } from './sim'

/* Layout (scene units ≈ 1 m): wheel at the rear (−x), battery at the front (+x). */
const AXLE_Y = 0.36
const WHEEL = new THREE.Vector3(-2.3, AXLE_Y, 0.78)
const GBX = new THREE.Vector3(-1.62, AXLE_Y, 0)
const CRANK_Y = 0.36
const GM = 0.009 // gear module
const ZC = 34
const ZK = 17
const MGUK_Z = pitchRadius(ZC, GM) + pitchRadius(ZK, GM)
const MGUK_X0 = 0.08 // gear plane
const CE = new THREE.Vector3(0.8, 0.32, 0.55)
const BAT = new THREE.Vector3(1.3, 0.2, 0)

const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z)

export default function ErsScene() {
  const m = useMechMats()
  const cut = useMechStore((s) => s.cut)

  const geo = useDisposables(() => {
    const tyreProfile: THREE.Vector2[] = []
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24) * Math.PI * 2
      tyreProfile.push(new THREE.Vector2(0.28 + 0.08 * (1 + Math.cos(a)), 0.19 * Math.sin(a) * (0.9 + 0.1 * Math.abs(Math.cos(a)))))
    }
    const tyre = new THREE.LatheGeometry(tyreProfile, 64)
    tyre.rotateX(Math.PI / 2)
    const stator = tubeZ(0.105, 0.078, 0.26, 48)
    stator.rotateY(Math.PI / 2)
    return {
      tyre,
      rim: cylZ(0.25, 0.25, 0.3, 40, true),
      hub: cylZ(0.08, 0.08, 0.34, 24),
      spoke: new THREE.BoxGeometry(0.03, 0.46, 0.04),
      driveshaft: new THREE.CylinderGeometry(0.022, 0.022, 1, 12),
      gbx: new THREE.BoxGeometry(0.6, 0.26, 0.24),
      crank: cylX(0.025, 0.025, 1.2, 16),
      web: new THREE.BoxGeometry(0.03, 0.13, 0.07),
      block: new THREE.BoxGeometry(0.9, 0.42, 0.5),
      crankGear: gearGeometry({ teeth: ZC, module: GM, bore: 0.02, holes: 6 }, 0.03).rotateY(Math.PI / 2),
      mgukGear: gearGeometry({ teeth: ZK, module: GM, bore: 0.012 }, 0.03).rotateY(Math.PI / 2),
      can: cylX(0.112, 0.112, 0.3, 48),
      stator,
      winding: new THREE.BoxGeometry(0.24, 0.016, 0.022),
      rotor: cylX(0.07, 0.07, 0.24, 32),
      magnet: new THREE.BoxGeometry(0.24, 0.012, 0.045),
      mgukShaft: cylX(0.014, 0.014, 0.42, 12),
      ce: new THREE.BoxGeometry(0.34, 0.14, 0.26),
      fin: new THREE.BoxGeometry(0.34, 0.03, 0.006),
      batCase: new THREE.BoxGeometry(0.72, 0.24, 0.62),
      cell: new THREE.BoxGeometry(0.075, 0.17, 0.11),
    }
  })

  /* cables (DC battery → CE, 3-phase CE → MGU-K) */
  const cables = useMemo(() => {
    const dc = [-1, 1].map(
      (k) => new THREE.CatmullRomCurve3([V(BAT.x - 0.3, BAT.y + 0.1, 0.18 + k * 0.03), V(1.05, 0.36, 0.4 + k * 0.03), V(CE.x + 0.17, CE.y, CE.z + k * 0.03)]),
    )
    const ac = [-1, 0, 1].map(
      (k) =>
        new THREE.CatmullRomCurve3([V(CE.x - 0.17, CE.y + k * 0.03, CE.z), V(0.65, 0.4 + k * 0.03, 0.42), V(0.42, CRANK_Y + 0.06 + k * 0.025, MGUK_Z)]),
    )
    const geos = [...dc, ...ac].map((c) => new THREE.TubeGeometry(c, 24, 0.012, 8, false))
    return { dc, ac, geos }
  }, [])
  useEffect(() => () => cables.geos.forEach((g) => g.dispose()), [cables])

  /* energy paths */
  const paths = useMemo(() => {
    const jit = (c: THREE.Vector3[], d: number) => c.map((p) => p.clone().add(V((Math.random() - 0.5) * d, (Math.random() - 0.5) * d, (Math.random() - 0.5) * d)))
    const mk = (pts: THREE.Vector3[], n = 3, d = 0.04) => Array.from({ length: n }, () => new THREE.CatmullRomCurve3(jit(pts, d)))
    // mechanical: wheel <-> gearbox <-> crank
    const mech = mk([V(WHEEL.x, AXLE_Y + 0.05, WHEEL.z - 0.1), V(-2.0, AXLE_Y + 0.1, 0.4), V(GBX.x, AXLE_Y + 0.16, 0), V(-1.1, CRANK_Y + 0.05, 0), V(-0.4, CRANK_Y + 0.05, 0), V(MGUK_X0, CRANK_Y + 0.08, 0.04)])
    // crank -> MGU-K gear -> rotor
    const kGear = mk([V(MGUK_X0, CRANK_Y + 0.08, 0.04), V(MGUK_X0 + 0.02, CRANK_Y + 0.05, MGUK_Z * 0.6), V(0.25, CRANK_Y + 0.02, MGUK_Z)], 2, 0.02)
    // MGU-K -> CE -> battery (electric)
    const elec = mk([V(0.25, CRANK_Y + 0.02, MGUK_Z), V(0.42, CRANK_Y + 0.06, MGUK_Z), V(0.65, 0.4, 0.42), V(CE.x - 0.17, CE.y, CE.z), V(CE.x + 0.17, CE.y, CE.z), V(1.05, 0.36, 0.4), V(BAT.x - 0.3, BAT.y + 0.1, 0.18), V(BAT.x, BAT.y + 0.05, 0)], 3, 0.03)
    // fuel/ICE: block -> crank -> gearbox -> wheel
    const ice = mk([V(-0.6, 0.75, 0), V(-0.6, CRANK_Y + 0.05, 0), V(-1.1, CRANK_Y + 0.05, 0), V(GBX.x, AXLE_Y + 0.16, 0), V(-2.0, AXLE_Y + 0.1, 0.4), V(WHEEL.x, AXLE_Y + 0.05, WHEEL.z - 0.1)], 4, 0.06)
    // ICE -> MGU-K (recharge)
    const iceK = mk([V(-0.6, 0.75, 0), V(-0.6, CRANK_Y + 0.05, 0), V(-0.2, CRANK_Y + 0.05, 0), V(MGUK_X0, CRANK_Y + 0.08, 0.04), V(0.25, CRANK_Y + 0.02, MGUK_Z)], 3, 0.04)
    const rev = (cs: THREE.CatmullRomCurve3[]) => cs.map((c) => new THREE.CatmullRomCurve3([...c.points].reverse()))
    return {
      harvest: [...mech.map((c) => new THREE.CatmullRomCurve3([...c.points])), ...kGear],
      harvestElec: elec,
      deployElec: rev(elec),
      deployMech: [...rev(kGear), ...rev(mech)],
      ice,
      iceK,
    }
  }, [])

  const planes = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), MGUK_Z)], [])
  const housing = useMemo(() => {
    const h = { can: createHousing('#3a4250', planes, { metalness: 0.8, roughness: 0.35, section: '#1f5f9a' }), bat: createHousing('#1a1d23', planes, { metalness: 0.3, roughness: 0.5, section: '#1d6b3c' }) }
    h.bat.skin.side = THREE.DoubleSide
    return h
  }, [planes])
  const hmats = useMemo(() => [housing.can.skin, housing.can.section, housing.bat.skin, housing.bat.section], [housing])
  useEffect(() => {
    setClipping(hmats.slice(0, 2), cut ? planes : null)
  }, [cut, hmats, planes])
  useEffect(() => () => hmats.forEach((x) => x.dispose()), [hmats])
  // the battery lid is always removed: clip at the top
  const batPlane = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, -1, 0), BAT.y + 0.09)], [])
  useEffect(() => setClipping([housing.bat.skin, housing.bat.section], batPlane), [housing, batPlane])

  const dyn = useMemo(
    () => ({
      cell: new THREE.MeshStandardMaterial({ color: '#1f6b43', metalness: 0.3, roughness: 0.45, emissive: '#2ecc71', emissiveIntensity: 0.2 }),
      copper: new THREE.MeshStandardMaterial({ color: '#c8743f', metalness: 1, roughness: 0.3, emissive: '#3fa9f5', emissiveIntensity: 0 }),
      ghost: new THREE.MeshStandardMaterial({ color: '#7d8594', metalness: 0.6, roughness: 0.5, transparent: true, opacity: 0.18, depthWrite: false }),
      dc: new THREE.MeshStandardMaterial({ color: '#ff8a00', metalness: 0.3, roughness: 0.5, emissive: '#ff8a00', emissiveIntensity: 0.1 }),
    }),
    [],
  )
  useEffect(() => () => Object.values(dyn).forEach((x) => x.dispose()), [dyn])

  const shaft = useMemo(() => {
    const a = V(GBX.x - 0.1, AXLE_Y, 0.12)
    const b = V(WHEEL.x, AXLE_Y, WHEEL.z - 0.15)
    const d = b.clone().sub(a)
    return { mid: a.clone().add(b).multiplyScalar(0.5), len: d.length(), q: new THREE.Quaternion().setFromUnitVectors(V(0, 1, 0), d.normalize()) }
  }, [])
  const wheel = useRef<THREE.Group>(null)
  const crank = useRef<THREE.Group>(null)
  const rotor = useRef<THREE.Group>(null)
  const kGear = useRef<THREE.Group>(null)
  useFrame(() => {
    const s = ersSim
    if (wheel.current) wheel.current.rotation.z = -s.wheelAngle
    if (crank.current) crank.current.rotation.x = s.crankAngle
    const kA = meshPhase(ZC, ZK, s.crankAngle - Math.PI) + Math.PI
    if (kGear.current) kGear.current.rotation.x = kA
    if (rotor.current) rotor.current.rotation.x = kA
    const p = Math.abs(s.power) / P_MAX
    dyn.cell.emissive.set(s.power < 0 ? '#2ecc71' : s.power > 0 ? '#3fa9f5' : '#2ecc71')
    dyn.cell.emissiveIntensity = 0.1 + 0.25 * (s.soc / SOC_WINDOW) + 0.6 * p * (0.6 + 0.4 * Math.sin(s.t * 40))
    dyn.copper.emissive.set(s.power < 0 ? '#2ecc71' : '#3fa9f5')
    dyn.copper.emissiveIntensity = p * 0.9
    dyn.dc.emissiveIntensity = 0.1 + p * 0.8
  })

  const rate = (k: number) => () => k / Math.max(0.05, useMechStore.getState().speed)
  const harv = () => (ersSim.power < 0 && ersSim.iceCharge === 0 ? Math.min(1, -ersSim.power / P_MAX) : 0)
  const harvElec = () => (ersSim.power < 0 ? Math.min(1, -ersSim.power / P_MAX) : 0)
  const dep = () => (ersSim.power > 0 ? Math.min(1, ersSim.power / P_MAX) : 0)

  return (
    <>
      <MechStage target={[-0.65, 0.3, 0.3]} minDistance={1} maxDistance={12} />
      {/* floor grid hint */}
      <gridHelper args={[8, 32, '#1d2230', '#151924']} position={[-0.7, 0, 0]} />

      {/* rear wheel */}
      <group position={WHEEL}>
        <group ref={wheel}>
          <mesh geometry={geo.tyre} material={m.rubber} />
          <mesh geometry={geo.rim} material={m.darkSteel} />
          {[0, 1, 2, 3, 4].map((k) => (
            <mesh key={k} geometry={geo.spoke} material={m.darkSteel} rotation={[0, 0, (k / 5) * Math.PI * 2]} position={[0, 0, 0.1]} />
          ))}
          <mesh geometry={geo.hub} material={m.titanium} />
        </group>
        <Tag position={[0, 0.5, 0]} tone="text">Roue arrière</Tag>
      </group>
      {/* driveshaft */}
      <mesh geometry={geo.driveshaft} material={m.polished} position={shaft.mid} quaternion={shaft.q} scale={[1, shaft.len, 1]} />
      {/* gearbox */}
      <mesh geometry={geo.gbx} material={m.carbon} position={GBX} />
      <Tag position={[GBX.x, AXLE_Y + 0.2, 0]} tone="text">Boîte de vitesses</Tag>
      {/* V6 (ghost) + crankshaft */}
      <mesh geometry={geo.block} material={dyn.ghost} position={[-0.6, 0.58, 0]} />
      <Tag position={[-0.6, 0.85, 0]} tone="warn">V6 thermique ≈ 400 kW</Tag>
      <group ref={crank} position={[-0.52, CRANK_Y, 0]}>
        <mesh geometry={geo.crank} material={m.polished} />
        {[-0.45, -0.22, 0, 0.22, 0.45].map((x, k) => (
          <mesh key={x} geometry={geo.web} material={m.steel} position={[x, 0.03 * (k % 2 ? 1 : -1), 0]} />
        ))}
      </group>
      <group position={[MGUK_X0, CRANK_Y, 0]}>
        <CrankGear geo={geo.crankGear} mat={m.steel} />
      </group>

      {/* MGU-K: gear, can (cut), stator windings, rotor with magnets */}
      <group position={[MGUK_X0, CRANK_Y, MGUK_Z]}>
        <group ref={kGear}>
          <mesh geometry={geo.mgukGear} material={m.titanium} />
        </group>
        <group position={[0.2, 0, 0]}>
          <mesh geometry={geo.can} material={housing.can.skin} />
          <mesh geometry={geo.can} material={housing.can.section} />
          <mesh geometry={geo.stator} material={m.darkSteel} />
          {Array.from({ length: 12 }, (_, k) => {
            const a = (k / 12) * Math.PI * 2
            return <mesh key={k} geometry={geo.winding} material={dyn.copper} position={[0, 0.083 * Math.cos(a), 0.083 * Math.sin(a)]} rotation={[a, 0, 0]} />
          })}
          <group ref={rotor}>
            <mesh geometry={geo.rotor} material={m.steel} />
            {Array.from({ length: 8 }, (_, k) => {
              const a = (k / 8) * Math.PI * 2
              return <mesh key={k} geometry={geo.magnet} material={k % 2 ? m.red : m.blue} position={[0, 0.071 * Math.cos(a), 0.071 * Math.sin(a)]} rotation={[a, 0, 0]} />
            })}
            <mesh geometry={geo.mgukShaft} material={m.polished} position={[-0.06, 0, 0]} />
          </group>
        </group>
        <Tag position={[0.25, 0.16, 0]} tone="info">MGU-K 350 kW (stator + rotor à aimants)</Tag>
        <Tag position={[0, -0.12, 0.02]} side="left" tone="text">Pignon sur le vilebrequin</Tag>
      </group>

      {/* control electronics */}
      <group position={CE}>
        <mesh geometry={geo.ce} material={m.alu} />
        {Array.from({ length: 5 }, (_, k) => (
          <mesh key={k} geometry={geo.fin} material={m.alu} position={[0, 0.08, -0.1 + k * 0.05]} rotation={[Math.PI / 2, 0, 0]} />
        ))}
        <Tag position={[0, 0.16, 0]} tone="text">Électronique de puissance (onduleur)</Tag>
      </group>
      {cables.geos.map((g, i) => (
        <mesh key={i} geometry={g} material={i < 2 ? dyn.dc : dyn.copper} />
      ))}

      {/* battery: open case + cells */}
      <group position={BAT}>
        <mesh geometry={geo.batCase} material={housing.bat.skin} />
        <mesh geometry={geo.batCase} material={housing.bat.section} />
        {Array.from({ length: 8 * 5 }, (_, k) => {
          const i = k % 8
          const j = Math.floor(k / 8)
          return <mesh key={k} geometry={geo.cell} material={dyn.cell} position={[-0.3 + i * 0.086, -0.01, -0.24 + j * 0.12]} />
        })}
        <Tag position={[0.2, 0.22, 0.2]} tone="ok">Batterie (ES) lithium-ion</Tag>
      </group>

      {/* energy flows */}
      <Flow curves={paths.harvest} count={22} color="#9ff3e8" size={0.075} rate={rate(0.6)} intensity={harv} />
      <Flow curves={paths.harvestElec} count={30} color="#2ecc71" size={0.075} rate={rate(0.5)} intensity={harvElec} />
      <Flow curves={paths.deployElec} count={30} color="#3fa9f5" size={0.075} rate={rate(0.5)} intensity={dep} />
      <Flow curves={paths.deployMech} count={22} color="#3fa9f5" size={0.075} rate={rate(0.6)} intensity={dep} />
      <Flow curves={paths.ice} count={22} color="#ff8a2a" size={0.075} rate={rate(0.45)} intensity={() => Math.min(1, ersSim.ice / 400) * 0.8} />
      <Flow curves={paths.iceK} count={20} color="#ffc04a" size={0.075} rate={rate(0.5)} intensity={() => (ersSim.iceCharge > 0 ? 0.9 : 0)} />
    </>
  )
}

/** Crank gear, rotating with the crank angle of the sim. */
function CrankGear({ geo, mat }: { geo: THREE.BufferGeometry; mat: THREE.Material }) {
  const ref = useRef<THREE.Mesh>(null)
  useFrame(() => {
    if (ref.current) ref.current.rotation.x = ersSim.crankAngle
  })
  return <mesh ref={ref} geometry={geo} material={mat} />
}
