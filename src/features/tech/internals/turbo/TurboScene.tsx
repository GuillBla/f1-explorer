import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { Flow, MechStage, Tag } from '../three/MechStage'
import { createHousing, setClipping, useDisposables, useMechMats } from '../three/materials'
import { cylX } from '../three/geom'
import { useMechStore } from '../store'
import { bladesGeometry, hubGeometry, voluteCurve, voluteGeometry, type WheelSpec } from './geometry'
import { advanceTurboVisual, N_MAX, turboSim } from './sim'

const S = 0.01
const COMP: WheelSpec = { dir: 1, blades: 7, r2: 50, rEye: 30, hubR: 9, len: 38, tipH: 7, wrap: 0.9 }
const TURB: WheelSpec = { dir: -1, blades: 11, r2: 44, rEye: 34, hubR: 10, len: 32, tipH: 10, wrap: 0.35 }
const CX = 40 // compressor back face
const TX = -40 // turbine back face
const CV = { x0: 44, rc0: 54, rt0: 6, rt1: 26, exit: 150 }
const TV = { x0: -45, rc0: 48, rt0: 6, rt1: 24, exit: 150 }
const flip = new THREE.Matrix4().makeRotationX(Math.PI)

export default function TurboScene() {
  const m = useMechMats()
  const cut = useMechStore((s) => s.cut)

  const geo = useDisposables(() => {
    const cvol = voluteGeometry(CV.x0, CV.rc0, CV.rt0, CV.rt1, CV.exit)
    cvol.applyMatrix4(flip)
    const tvol = voluteGeometry(TV.x0, TV.rc0, TV.rt0, TV.rt1, TV.exit)
    tvol.applyMatrix4(flip)
    const inlet = cylX(33, 33, 150, 40, true)
    inlet.translate(CX + 50 + 75, 0, 0)
    const outlet = cylX(38, 38, 170, 40, true)
    outlet.translate(TX - 40 - 85, 0, 0)
    const bearing = cylX(26, 26, 64, 36)
    const backC = cylX(58, 58, 6, 48)
    backC.translate(CX - 4, 0, 0)
    const backT = cylX(52, 52, 6, 48)
    backT.translate(TX + 4, 0, 0)
    // wastegate bypass: from the turbine inlet pipe to the outlet, around the wheel
    const wgCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(TV.x0, -(TV.rc0 + TV.rt1) - 10, -110),
      new THREE.Vector3(TV.x0 - 60, -(TV.rc0 + TV.rt1) - 30, -90),
      new THREE.Vector3(TX - 140, -60, -50),
      new THREE.Vector3(TX - 175, -30, -10),
    ])
    return {
      cHub: hubGeometry(COMP),
      cBlades: bladesGeometry(COMP, true),
      tHub: hubGeometry(TURB),
      tBlades: bladesGeometry(TURB),
      shaft: cylX(6, 6, 2 * CX + 16, 16),
      nut: cylX(7, 7, 8, 6),
      cvol,
      tvol,
      inlet,
      outlet,
      bearing,
      backC,
      backT,
      wg: new THREE.TubeGeometry(wgCurve, 30, 11, 10, false),
      wgDisc: cylX(14, 14, 4, 24),
      wgActuator: new THREE.CylinderGeometry(16, 16, 46, 20),
      wgRod: new THREE.CylinderGeometry(2.5, 2.5, 50, 8),
      oil: new THREE.CylinderGeometry(4, 4, 60, 8),
    }
  })

  const planes = useMemo(() => [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)], [])
  const housing = useMemo(
    () => ({
      comp: createHousing('#9aa3b2', planes, { metalness: 0.75, roughness: 0.4 }),
      turb: createHousing('#6b5a4a', planes, { metalness: 0.9, roughness: 0.45, section: '#7a2410' }),
      bear: createHousing('#7d8594', planes),
      inlet: createHousing('#2a2e36', planes, { metalness: 0.3, roughness: 0.4 }),
    }),
    [planes],
  )
  const hmats = useMemo(() => {
    const list = Object.values(housing).flatMap((h) => [h.skin, h.section])
    for (const h of Object.values(housing)) h.skin.side = THREE.DoubleSide
    return list
  }, [housing])
  useEffect(() => setClipping(hmats, cut ? planes : null), [cut, hmats, planes])
  useEffect(() => () => hmats.forEach((x) => x.dispose()), [hmats])

  const hot = useMemo(() => new THREE.MeshStandardMaterial({ color: '#8a8f99', metalness: 0.9, roughness: 0.35, emissive: '#ff5a1f', emissiveIntensity: 0.3 }), [])
  useEffect(() => () => hot.dispose(), [hot])

  const curves = useMemo(() => {
    const mk = (pts: THREE.Vector3[]) => new THREE.CatmullRomCurve3(pts.map((p) => p.applyMatrix4(flip).multiplyScalar(S)))
    const air = Array.from({ length: 7 }, () => mk(voluteCurve(CV.x0, CV.rc0, CV.rt0, CV.rt1, CV.exit, CX + COMP.len + 10, 26, 14)))
    const gas = Array.from({ length: 7 }, () => mk(voluteCurve(TV.x0, TV.rc0, TV.rt0, TV.rt1, TV.exit, TX - TURB.len - 10, 28, 12).reverse()))
    const wg = [
      new THREE.CatmullRomCurve3(
        [
          new THREE.Vector3(TV.x0, -(TV.rc0 + TV.rt1), -150),
          new THREE.Vector3(TV.x0, -(TV.rc0 + TV.rt1) - 10, -110),
          new THREE.Vector3(TV.x0 - 60, -(TV.rc0 + TV.rt1) - 30, -90),
          new THREE.Vector3(TX - 140, -60, -50),
          new THREE.Vector3(TX - 175, -30, -10),
          new THREE.Vector3(TX - 220, 0, 0),
        ].map((p) => p.multiplyScalar(S)),
      ),
    ]
    return { air, gas, wg }
  }, [])

  const comp = useRef<THREE.Group>(null)
  const wgDisc = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    const { playing } = useMechStore.getState()
    if (playing) advanceTurboVisual(Math.min(dt, 0.05))
    if (comp.current) comp.current.rotation.x = turboSim.angle
    if (wgDisc.current) wgDisc.current.position.y = -(TV.rc0 + TV.rt1) - 10 - turboSim.wastegate * 14
    hot.emissiveIntensity = 0.15 + 0.9 * (turboSim.n / N_MAX)
    housing.turb.skin.emissive.set('#ff4a10')
    housing.turb.skin.emissiveIntensity = 0.02 + 0.12 * (turboSim.n / N_MAX)
  })

  // particle rates are expressed in real time so the flow stays readable whatever the playback speed
  const flowRate = (k: number) => () => {
    const sp = Math.max(0.01, useMechStore.getState().speed)
    return (k * (0.15 + turboSim.n / N_MAX)) / sp
  }

  return (
    <>
      <MechStage target={[0, -0.2, -0.2]} minDistance={1} maxDistance={10} />
      <group scale={S}>
        {/* rotating assembly: compressor + shaft + turbine */}
        <group ref={comp}>
          <group position={[CX, 0, 0]}>
            <mesh geometry={geo.cHub} material={m.alu} />
            <mesh geometry={geo.cBlades} material={m.polished} />
            <mesh geometry={geo.nut} material={m.darkSteel} position={[COMP.len + 8, 0, 0]} />
          </group>
          <mesh geometry={geo.shaft} material={m.polished} />
          <group position={[TX, 0, 0]}>
            <mesh geometry={geo.tHub} material={hot} />
            <mesh geometry={geo.tBlades} material={hot} />
          </group>
        </group>
        {/* housings (cut) */}
        <mesh geometry={geo.cvol} material={housing.comp.skin} />
        <mesh geometry={geo.backC} material={housing.comp.skin} />
        <mesh geometry={geo.inlet} material={housing.inlet.skin} />
        <mesh geometry={geo.tvol} material={housing.turb.skin} />
        <mesh geometry={geo.backT} material={housing.turb.skin} />
        <mesh geometry={geo.outlet} material={housing.turb.skin} />
        <mesh geometry={geo.bearing} material={housing.bear.skin} />
        <mesh geometry={geo.oil} material={m.copper} position={[0, 55, 0]} />
        {/* wastegate */}
        <mesh geometry={geo.wg} material={hot} />
        <mesh ref={wgDisc} geometry={geo.wgDisc} material={m.titanium} position={[TV.x0, -(TV.rc0 + TV.rt1) - 10, -110]} rotation={[0, 0, Math.PI / 2]} />
        <mesh geometry={geo.wgActuator} material={m.red} position={[TV.x0, -(TV.rc0 + TV.rt1) - 70, -110]} />
        <mesh geometry={geo.wgRod} material={m.polished} position={[TV.x0, -(TV.rc0 + TV.rt1) - 35, -110]} />

        <Tag position={[CX + 30, 52, 0]} tone="info">Compresseur (aluminium)</Tag>
        <Tag position={[TX - 20, 50, 0]} side="left" tone="warn">Turbine (Inconel)</Tag>
        <Tag position={[0, 30, 10]} tone="text">Arbre commun + paliers lubrifiés</Tag>
        <Tag position={[TV.x0, -(TV.rc0 + TV.rt1) - 95, -110]} side="left" tone="f1">Wastegate (soupape de décharge)</Tag>
        <Tag position={[CX + 190, 30, 0]} tone="info">Air frais</Tag>
        <Tag position={[CV.x0, -(CV.rc0 + CV.rt1), -CV.exit]} tone="info">Air comprimé → plenum</Tag>
        <Tag position={[TV.x0, -(TV.rc0 + TV.rt1), -TV.exit]} side="left" tone="warn">Gaz d’échappement du V6</Tag>
        <Tag position={[TX - 200, 40, 0]} side="left" tone="warn">Vers l’échappement</Tag>
      </group>
      <Flow curves={curves.air} count={26} color="#5bc0ff" size={0.07} rate={flowRate(0.5)} intensity={() => 0.35 + 0.65 * (turboSim.n / N_MAX)} />
      <Flow curves={curves.gas} count={26} color="#ff7a2a" size={0.08} rate={flowRate(0.5)} intensity={() => 0.35 + 0.65 * turboSim.throttle} />
      <Flow curves={curves.wg} count={40} color="#ffb347" size={0.07} rate={flowRate(0.6)} intensity={() => turboSim.wastegate} jitter={0.05} />
    </>
  )
}
