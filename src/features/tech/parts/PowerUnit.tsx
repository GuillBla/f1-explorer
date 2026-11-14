import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import { useExplorerStore } from '../store'
import type { Vec3 } from '../types'
import { bankBlockGeometry, camCoverGeometry, crankcaseGeometries, deckGeometry, headWallsGeometry } from '../internals/engine/geometry'
import { CYLS, DECK } from '../internals/engine/kinematics'
import { gearGeometry } from '../internals/three/geom'
import { hubGeometry, voluteGeometry } from '../internals/turbo/geometry'
import { Explode, Part, useCar, useGeometries, usePuMats } from './Part'

/**
 * Hybrid power unit internals: 90° V6 (banks, heads, crankcase, exhausts, plenum), turbo with its
 * volutes, MGU-K geared to the crankshaft, battery cells, fuel cell, tapered gearbox, radiators.
 * Lightweight versions of the "Mécanique" tab geometries. Hidden by the bodywork, shown in x-ray
 * mode or exploded view.
 */
export function PowerUnit() {
  const { explode, interactive } = useCar()
  const ref = useRef<THREE.Group>(null)
  const xray = useExplorerStore((s) => interactive && s.xray)
  useFrame(() => {
    if (ref.current) ref.current.visible = xray || (explode.current ?? 0) > 0.02
  })
  return (
    <group ref={ref} visible={false}>
      <Part id="powerUnit">
        <Explode dir={[0, 0.25, 0]}>
          <PuMeshes labels={xray} />
        </Explode>
      </Part>
    </group>
  )
}

function Label({ position, children }: { position: Vec3; children: string }) {
  return (
    <Html position={position} center distanceFactor={6} zIndexRange={[20, 0]} style={{ pointerEvents: 'none' }}>
      <span className="whitespace-nowrap rounded bg-bg/80 px-1.5 py-0.5 font-mono text-[10px] font-bold text-text ring-1 ring-border">
        {children}
      </span>
    </Html>
  )
}

/** mm -> m, slightly enlarged so the engine reads well inside the car. */
const MM = 0.0015
const ENGINE: Vec3 = [-0.72, 0.25, 0]
const TURBO: Vec3 = [-1.12, 0.46, 0]

function PuMeshes({ labels }: { labels: boolean }) {
  const m = usePuMats()
  const geo = useGeometries(() => {
    const cc = crankcaseGeometries()
    cc.bulk.dispose()
    // exhaust primaries (bank frame, mm) merged per bank into one tube set
    const primaries = (['A', 'B'] as const).flatMap((bank) => {
      const s = bank === 'A' ? 1 : -1
      return CYLS.filter((c) => c.bank === bank).map(
        (c) =>
          new THREE.TubeGeometry(
            new THREE.CatmullRomCurve3([
              new THREE.Vector3(-s * 80, DECK + 22, c.z),
              new THREE.Vector3(-s * 125, DECK - 30, c.z - 20),
              new THREE.Vector3(-s * 135, 40, -230),
              new THREE.Vector3(-s * 90, 20, -300),
            ]),
            16,
            12,
            8,
            false,
          ),
      )
    })
    const gbx = new THREE.Shape()
    gbx.moveTo(0, -0.08)
    gbx.lineTo(0, 0.1)
    gbx.lineTo(-0.42, 0.07)
    gbx.lineTo(-0.62, 0.05)
    gbx.lineTo(-0.62, -0.06)
    gbx.lineTo(-0.42, -0.09)
    gbx.closePath()
    const gearbox = new THREE.ExtrudeGeometry(gbx, { depth: 0.2, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 })
    gearbox.translate(0, 0, -0.1)
    const cvol = voluteGeometry(44, 54, 6, 26, 120)
    const tvol = voluteGeometry(-45, 48, 6, 24, 120)
    const cells = new THREE.BoxGeometry(0.035, 0.06, 0.05)
    return {
      blockA: bankBlockGeometry('A'),
      blockB: bankBlockGeometry('B'),
      deckA: deckGeometry('A'),
      deckB: deckGeometry('B'),
      headA: headWallsGeometry('A'),
      headB: headWallsGeometry('B'),
      coverA: camCoverGeometry('A'),
      coverB: camCoverGeometry('B'),
      crankcase: cc.channel,
      plenum: new THREE.CapsuleGeometry(55, 300, 6, 20),
      p0: primaries[0],
      p1: primaries[1],
      p2: primaries[2],
      p3: primaries[3],
      p4: primaries[4],
      p5: primaries[5],
      cvol,
      tvol,
      cWheel: hubGeometry({ dir: 1, blades: 7, r2: 50, rEye: 30, hubR: 9, len: 38, tipH: 7, wrap: 0.9 }),
      tWheel: hubGeometry({ dir: -1, blades: 11, r2: 44, rEye: 34, hubR: 10, len: 32, tipH: 10, wrap: 0.35 }),
      tailpipe: new THREE.CylinderGeometry(0.035, 0.04, 0.55, 18, 1, true),
      mguk: new THREE.CylinderGeometry(0.055, 0.055, 0.2, 28),
      mgukGear: gearGeometry({ teeth: 17, module: 0.006, bore: 0.008 }, 0.02),
      crankGear: gearGeometry({ teeth: 34, module: 0.006, bore: 0.012, holes: 5 }, 0.02),
      batteryCase: new THREE.BoxGeometry(0.38, 0.03, 0.42),
      cells,
      cell: new THREE.CylinderGeometry(1, 1, 1, 32),
      gearbox,
      diff: new THREE.CylinderGeometry(0.075, 0.075, 0.26, 28),
      radiator: new THREE.BoxGeometry(0.06, 0.32, 0.26),
    }
  })
  const prim = [geo.p0, geo.p1, geo.p2, geo.p3, geo.p4, geo.p5]
  const mgukGearPos = 34 * 0.003 + 17 * 0.003
  return (
    <group>
      {/* ---- 90° V6: crank axis along the car, front of the engine towards +x ---- */}
      <group position={ENGINE} rotation={[0, Math.PI / 2, 0]} scale={MM}>
        <mesh geometry={geo.crankcase} material={m.block} />
        {(['A', 'B'] as const).map((b) => (
          <group key={b} rotation={[0, 0, (b === 'A' ? 45 : -45) * (Math.PI / 180)]}>
            <mesh geometry={b === 'A' ? geo.blockA : geo.blockB} material={m.block} />
            <mesh geometry={b === 'A' ? geo.deckA : geo.deckB} material={m.block} />
            <mesh geometry={b === 'A' ? geo.headA : geo.headB} material={m.block} />
            <mesh geometry={b === 'A' ? geo.coverA : geo.coverB} material={m.head} />
            {prim.slice(b === 'A' ? 0 : 3, b === 'A' ? 3 : 6).map((g, i) => (
              <mesh key={i} geometry={g} material={m.exhaust} />
            ))}
          </group>
        ))}
        {/* intake plenum in the V */}
        <mesh geometry={geo.plenum} material={m.head} position={[0, 260, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* ---- turbocharger behind the engine (compressor towards the engine) ---- */}
      <group position={TURBO} scale={MM}>
        <mesh geometry={geo.cvol} material={m.turbo} />
        <mesh geometry={geo.cWheel} material={m.turbo} position={[40, 0, 0]} />
        <mesh geometry={geo.tvol} material={m.exhaust} />
        <mesh geometry={geo.tWheel} material={m.exhaust} position={[-40, 0, 0]} />
      </group>
      <mesh geometry={geo.tailpipe} material={m.exhaust} position={[TURBO[0] - 0.42, TURBO[1] - 0.02, 0]} rotation={[0, 0, Math.PI / 2 - 0.05]} />

      {/* ---- MGU-K geared to the crankshaft nose ---- */}
      <group position={[ENGINE[0] + 0.3, ENGINE[1], 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh geometry={geo.crankGear} material={m.gearbox} />
        <mesh geometry={geo.mgukGear} material={m.mguk} position={[mgukGearPos, 0, 0]} />
      </group>
      <mesh geometry={geo.mguk} material={m.mguk} position={[ENGINE[0] + 0.18, ENGINE[1], -mgukGearPos]} rotation={[0, 0, Math.PI / 2]} />

      {/* ---- fuel cell behind the driver, battery cells underneath ---- */}
      <mesh geometry={geo.cell} material={m.fuel} position={[-0.14, 0.42, 0]} scale={[0.22, 0.3, 0.25]} />
      <group position={[-0.14, 0.13, 0]}>
        <mesh geometry={geo.batteryCase} material={m.battery} position={[0, -0.045, 0]} />
        {Array.from({ length: 6 * 5 }, (_, k) => (
          <mesh key={k} geometry={geo.cells} material={m.battery} position={[-0.15 + (k % 6) * 0.06, 0, -0.16 + Math.floor(k / 6) * 0.08]} />
        ))}
      </group>

      {/* ---- tapered gearbox casing + differential ---- */}
      <group position={[-1.3, 0.25, 0]}>
        <mesh geometry={geo.gearbox} material={m.gearbox} />
        <mesh geometry={geo.diff} material={m.gearbox} position={[-0.5, -0.01, 0]} rotation={[Math.PI / 2, 0, 0]} />
      </group>

      {/* ---- radiators in the sidepods ---- */}
      {[1, -1].map((s) => (
        <mesh key={s} geometry={geo.radiator} material={m.radiator} position={[0.25, 0.36, s * 0.5]} rotation={[0, s * 0.35, 0]} />
      ))}
      {labels && (
        <>
          <Label position={[-0.72, 0.78, 0]}>V6 1,6 L à 90°</Label>
          <Label position={[-1.12, 0.62, 0]}>Turbo</Label>
          <Label position={[-0.54, 0.12, -0.24]}>MGU-K</Label>
          <Label position={[-0.14, 0.03, -0.3]}>Batterie (ES)</Label>
          <Label position={[-0.14, 0.62, 0]}>Réservoir</Label>
          <Label position={[-1.6, 0.12, 0]}>Boîte 8 rapports</Label>
          <Label position={[0.25, 0.6, 0.6]}>Radiateurs</Label>
        </>
      )}
    </group>
  )
}
