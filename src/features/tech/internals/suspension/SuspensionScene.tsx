import { useEffect, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { useMechStore } from '../store'
import { coilSpringGeometry } from '../three/geom'
import { MechStage, Tag } from '../three/MechStage'
import { useDisposables, useMechMats } from '../three/materials'
import { corner, INERTER_LEAD, restOf, road, sim, useSuspStore, VIS, type P2 } from './sim'

const S = 0.004 // mm -> scene units
const TYRE_R = 330
const WHEEL_W = 290
const ROAD_LEN = 3000
const ROAD_SEG = 220

/** Unit cylinder from y=0 to y=1 (stretched between two points with alignY). */
function unitCyl(r: number, seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, 1, seg)
  g.translate(0, 0.5, 0)
  return g
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
/** Places a unit (y 0..1) object between a and b. */
function span(o: THREE.Object3D | null, a: P2, b: P2, za = 0, zb = 0, len?: number) {
  if (!o) return
  _a.set(a[0], a[1], za)
  _b.set(b[0], b[1], zb)
  const d = _b.sub(_a)
  const L = d.length()
  o.position.copy(_a)
  o.quaternion.setFromUnitVectors(_up, d.multiplyScalar(1 / L))
  o.scale.set(1, len ?? L, 1)
}

/** Tyre cross-section revolved around X. */
function tyreGeometry() {
  const pts: THREE.Vector2[] = []
  const w = WHEEL_W / 2
  const rIn = 230
  const prof: [number, number][] = [
    [rIn, -w + 12],
    [rIn + 20, -w],
    [TYRE_R - 30, -w],
    [TYRE_R - 6, -w + 10],
    [TYRE_R, -w + 40],
    [TYRE_R, w - 40],
    [TYRE_R - 6, w - 10],
    [TYRE_R - 30, w],
    [rIn + 20, w],
    [rIn, w - 12],
  ]
  for (const [r, y] of prof) pts.push(new THREE.Vector2(r, y))
  const g = new THREE.LatheGeometry(pts, 64)
  g.rotateZ(Math.PI / 2) // lathe axis y -> x
  return g
}

export default function SuspensionScene() {
  const m = useMechMats()
  const layout = useSuspStore((s) => s.layout)
  const inerterOn = useSuspStore((s) => s.inerter)
  const profile = useSuspStore((s) => s.profile)
  const cut = useMechStore((s) => s.cut)

  const g = useDisposables(() => {
    const roadGeo = new THREE.PlaneGeometry(430, ROAD_LEN, 1, ROAD_SEG)
    roadGeo.rotateX(-Math.PI / 2)
    const n = roadGeo.attributes.position.count
    roadGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(n * 3), 3))
    const spoke = new THREE.BoxGeometry(6, 180, 30).translate(0, 140, 0)
    const box = new THREE.BoxGeometry(465, 470, 1000)
    const chassisEdges = new THREE.EdgesGeometry(box)
    box.dispose()
    return {
      road: roadGeo,
      tube9: unitCyl(9),
      tube7: unitCyl(7),
      rod: unitCyl(8),
      shaft: unitCyl(6),
      damperBody: unitCyl(22, 20),
      inerterBody: unitCyl(18, 20),
      ball: new THREE.SphereGeometry(15, 16, 12),
      bigBall: new THREE.SphereGeometry(22, 16, 12),
      upright: new THREE.BoxGeometry(70, 1, 80).translate(0, 0.5, 0),
      spindle: new THREE.CylinderGeometry(30, 38, 160, 20).rotateZ(Math.PI / 2),
      tyre: tyreGeometry(),
      rim: new THREE.CylinderGeometry(232, 232, WHEEL_W - 24, 48, 1, true).rotateZ(Math.PI / 2),
      rimFace: new THREE.CylinderGeometry(232, 232, 10, 48).rotateZ(Math.PI / 2),
      hub: new THREE.CylinderGeometry(60, 60, 60, 24).rotateZ(Math.PI / 2),
      disc: new THREE.CylinderGeometry(160, 160, 30, 40).rotateZ(Math.PI / 2),
      spoke,
      chassis: new THREE.BoxGeometry(465, 470, 1000),
      chassisEdges,
      rockerHub: new THREE.CylinderGeometry(24, 24, 50, 20).rotateX(Math.PI / 2),
      rockerArm: new THREE.BoxGeometry(1, 22, 40).translate(0.5, 0, 0),
      tbar: new THREE.CylinderGeometry(11, 11, 420 / 14, 14).rotateX(Math.PI / 2),
      stripe: new THREE.BoxGeometry(5, 3, 420 / 14 + 0.5),
      tbarMount: new THREE.BoxGeometry(60, 60, 30),
      flywheel: new THREE.CylinderGeometry(42, 42, 10, 32),
      flySpoke: new THREE.BoxGeometry(80, 12, 4),
      screw: coilSpringGeometry(8, 1.8, 240, 24),
      anchor: new THREE.BoxGeometry(40, 40, 40),
    }
  })

  const local = useDisposables(() => ({
    chassis: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: m.carbon.map, metalness: 0.3, roughness: 0.45, clearcoat: 1, transparent: true, opacity: 1 }),
    road: new THREE.MeshStandardMaterial({ color: '#7a7a7a', vertexColors: true, roughness: 1, metalness: 0 }),
    tyre: new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.85, metalness: 0, side: THREE.DoubleSide }),
    stripe: new THREE.MeshStandardMaterial({ color: '#ffd400', emissive: '#7a5a00', emissiveIntensity: 0.6 }),
    rim: new THREE.MeshStandardMaterial({ color: '#3a3f49', metalness: 0.85, roughness: 0.35, side: THREE.DoubleSide }),
    edges: new THREE.LineBasicMaterial({ color: '#4a5263' }),
  }), [m])

  // cut-away: monocoque becomes translucent, tyre loses its front half
  useEffect(() => {
    local.chassis.opacity = cut ? 0.22 : 1
    local.chassis.depthWrite = !cut
    const planes = cut ? [new THREE.Plane(new THREE.Vector3(0, 0, -1), 0)] : null
    for (const mat of [local.tyre, local.rim]) {
      mat.clippingPlanes = planes
      mat.needsUpdate = true
    }
  }, [cut, local])

  const R = useRef<Record<string, THREE.Object3D | null>>({})
  const ref = (k: string) => (o: THREE.Object3D | null) => {
    R.current[k] = o
  }
  const tbarSegs = useRef<(THREE.Object3D | null)[]>([])

  useFrame(() => {
    const st = useSuspStore.getState()
    const travelMm = (sim.zu - sim.zs) * 1000
    const dv = travelMm * VIS
    const c = corner(st.layout, dv)
    const rest = restOf(st.layout)
    const o = R.current

    // arms
    span(o.lowerF, c.lowerPivot, c.lbj, 220, 0)
    span(o.lowerR, c.lowerPivot, c.lbj, -220, 0)
    span(o.upperF, c.upperPivot, c.ubj, 200, 0)
    span(o.upperR, c.upperPivot, c.ubj, -200, 0)
    o.lbj?.position.set(c.lbj[0], c.lbj[1], 0)
    o.ubj?.position.set(c.ubj[0], c.ubj[1], 0)
    span(o.upright, c.lbj, c.ubj)
    o.wheel?.position.set(c.wheel[0], c.wheel[1], 0)
    if (o.spin) o.spin.rotation.x = sim.s / (TYRE_R / 1000)
    o.spindle?.position.set((c.lbj[0] + c.ubj[0]) / 2 + 60, c.wheel[1], 0)

    // push / pull rod + rocker
    span(o.rod, c.rodOut, c.rodIn)
    o.rodOutBall?.position.set(c.rodOut[0], c.rodOut[1], 0)
    if (o.rocker) o.rocker.rotation.z = c.phi
    // torsion bar: twisted progressively from the rocker (front) to its fixed rear mount
    const segs = tbarSegs.current
    for (let k = 0; k < segs.length; k++) {
      const s = segs[k]
      if (s) s.rotation.z = c.phi * (1 - k / segs.length)
    }
    // damper: body fixed on the chassis anchor, rod follows the rocker
    span(o.damperBody, c.damperAnchor, c.armB, 0, 0, 150)
    span(o.damperRod, c.armB, c.damperAnchor)
    // inerter: ball screw + flywheel
    span(o.inerterBody, c.inerterAnchor, c.armC, 0, 0, 90)
    span(o.inerterScrew, c.armC, c.inerterAnchor, 0, 0, 1)
    if (o.fly) {
      const mid: P2 = [c.inerterAnchor[0] + (c.armC[0] - c.inerterAnchor[0]) * 0.5, c.inerterAnchor[1] + (c.armC[1] - c.inerterAnchor[1]) * 0.5]
      span(o.fly, c.inerterAnchor, mid, 0, 0, 1)
      o.fly.position.set(c.inerterAnchor[0] + (c.armC[0] - c.inerterAnchor[0]) * (110 / c.inerterLen), c.inerterAnchor[1] + (c.armC[1] - c.inerterAnchor[1]) * (110 / c.inerterLen), 0)
      const spin = o.flySpin
      if (spin) spin.rotation.y = ((rest.inerterLen - c.inerterLen) / INERTER_LEAD) * Math.PI * 2
    }

    // road scrolls under the wheel (vertical positions in the chassis frame, amplified like the travel)
    const pos = g.road.attributes.position as THREE.BufferAttribute
    const col = g.road.attributes.color as THREE.BufferAttribute
    for (let i = 0; i < pos.count; i++) {
      const z = pos.getZ(i)
      const xi = sim.s + z / 1000
      const h = road(xi, st.profile, st.bumpMm)
      pos.setY(i, VIS * (h - sim.zs) * 1000)
      let r = 0.025
      let gg = 0.027
      let b = 0.032
      if (h > 0.0004) {
        const red = st.profile === 'vibreur' ? Math.floor(((xi % 9) + 9) % 9 / 0.4) % 2 === 0 : true
        if (red) {
          r = 0.75
          gg = 0.12
          b = 0.1
        } else {
          r = gg = b = 0.85
        }
      }
      col.setXYZ(i, r, gg, b)
    }
    pos.needsUpdate = true
    col.needsUpdate = true
    g.road.computeVertexNormals()
  })

  const L = restOf(layout)
  const piv = L.rockerPivot
  const top = layout === 'push'
  const A: P2 = [L.rodIn[0] - piv[0], L.rodIn[1] - piv[1]]
  const Bv: P2 = [L.armB[0] - piv[0], L.armB[1] - piv[1]]
  const Cv: P2 = [L.armC[0] - piv[0], L.armC[1] - piv[1]]
  const armTo = (v: P2) => ({ scale: [Math.hypot(v[0], v[1]), 1, 1] as [number, number, number], rotation: [0, 0, Math.atan2(v[1], v[0])] as [number, number, number] })

  return (
    <>
      <MechStage target={[-0.35, 1.6, 0]} minDistance={1.5} maxDistance={14} />
      <group position={[-1.5, 0, 0]} scale={S}>
        {/* road */}
        <mesh geometry={g.road} material={local.road} position={[760, 0, 0]} />
        {/* monocoque */}
        <mesh geometry={g.chassis} material={local.chassis} position={[-17, 365, 0]} />
        <lineSegments geometry={g.chassisEdges} material={local.edges} position={[-17, 365, 0]} />
        {/* wishbones */}
        {(['lowerF', 'lowerR', 'upperF', 'upperR'] as const).map((k) => (
          <mesh key={k} ref={ref(k)} geometry={g.tube9} material={m.carbon} />
        ))}
        {[
          [230, 180, 220],
          [230, 180, -220],
          [240, 470, 200],
          [240, 470, -200],
        ].map((p, i) => (
          <mesh key={i} geometry={g.ball} material={m.titanium} position={p as [number, number, number]} />
        ))}
        <mesh ref={ref('lbj')} geometry={g.ball} material={m.polished} />
        <mesh ref={ref('ubj')} geometry={g.ball} material={m.polished} />
        <mesh ref={ref('upright')} geometry={g.upright} material={m.titanium} />
        <mesh ref={ref('spindle')} geometry={g.spindle} material={m.darkSteel} />
        {/* wheel */}
        <group ref={ref('wheel')}>
          <group ref={ref('spin')}>
            <mesh geometry={g.tyre} material={local.tyre} />
            <mesh geometry={g.rim} material={local.rim} />
            <mesh geometry={g.rimFace} material={local.rim} position={[WHEEL_W / 2 - 18, 0, 0]} />
            <mesh geometry={g.hub} material={m.red} position={[WHEEL_W / 2, 0, 0]} />
            <mesh geometry={g.disc} material={m.carbon} position={[-60, 0, 0]} />
            {[0, 1, 2, 3, 4].map((i) => (
              <mesh key={i} geometry={g.spoke} material={m.steel} position={[WHEEL_W / 2 - 20, 0, 0]} rotation={[(i * Math.PI * 2) / 5, 0, 0]} />
            ))}
          </group>
          <Tag position={[160, TYRE_R + 20, 0]} side="right">Roue (pneu 18")</Tag>
        </group>
        {/* push / pull rod */}
        <mesh ref={ref('rod')} geometry={g.rod} material={m.titanium} />
        <mesh ref={ref('rodOutBall')} geometry={g.ball} material={m.polished} />
        {/* rocker */}
        <group ref={ref('rocker')} position={[piv[0], piv[1], 0]}>
          <mesh geometry={g.rockerHub} material={m.titanium} />
          {[A, Bv, Cv].map((v, i) => (
            <mesh key={i} geometry={g.rockerArm} material={m.titanium} {...armTo(v)} />
          ))}
          <mesh geometry={g.ball} material={m.polished} position={[A[0], A[1], 0]} />
          <mesh geometry={g.ball} material={m.polished} position={[Bv[0], Bv[1], 0]} />
          {inerterOn && <mesh geometry={g.ball} material={m.polished} position={[Cv[0], Cv[1], 0]} />}
        </group>
        {/* torsion bar, rear-wards along -Z, fixed at its far end */}
        <group position={[piv[0], piv[1], 0]}>
          {Array.from({ length: 14 }, (_, k) => (
            <group
              key={`${layout}-${k}`}
              ref={(o) => {
                tbarSegs.current[k] = o
              }}
              position={[0, 0, -(k + 0.5) * (420 / 14) - 30]}
            >
              <mesh geometry={g.tbar} material={m.steel} />
              <mesh geometry={g.stripe} material={local.stripe} position={[0, 11, 0]} />
            </group>
          ))}
          <mesh geometry={g.tbarMount} material={m.alu} position={[0, 0, -460]} />
        </group>
        {/* damper */}
        <mesh geometry={g.anchor} material={m.alu} position={[L.damperAnchor[0] - 10, L.damperAnchor[1], 0]} />
        <mesh ref={ref('damperBody')} geometry={g.damperBody} material={m.blue} />
        <mesh ref={ref('damperRod')} geometry={g.shaft} material={m.polished} />
        {/* inerter */}
        <group visible={inerterOn}>
          <mesh geometry={g.anchor} material={m.alu} position={[L.inerterAnchor[0] - 10, L.inerterAnchor[1], 0]} />
          <mesh ref={ref('inerterBody')} geometry={g.inerterBody} material={m.darkSteel} />
          <mesh ref={ref('inerterScrew')} geometry={g.screw} material={m.gold} />
          <group ref={ref('fly')}>
            <group ref={ref('flySpin')}>
              <mesh geometry={g.flywheel} material={m.steel} />
              <mesh geometry={g.flySpoke} material={m.red} position={[0, 6, 0]} />
              <mesh geometry={g.flySpoke} material={m.red} position={[0, 6, 0]} rotation={[0, Math.PI / 2, 0]} />
            </group>
          </group>
        </group>
        {/* labels (static anchors near the parts) */}
        <Tag position={[330, 180, 140]} side="left">Triangle inférieur</Tag>
        <Tag position={[330, 470, 120]} side="left">Triangle supérieur</Tag>
        <Tag position={[(L.rodOut[0] + L.rodIn[0]) / 2, (L.rodOut[1] + L.rodIn[1]) / 2, 0]} tone="accent" side="right">
          {top ? 'Poussoir (push-rod)' : 'Tirant (pull-rod)'}
        </Tag>
        <Tag position={[piv[0] + 40, piv[1] + (top ? 60 : -60), 30]} tone="accent" side="right">Culbuteur</Tag>
        <Tag position={[piv[0], piv[1] + (top ? 0 : -20), -470]} tone="warn" side={top ? 'right' : 'left'}>Barre de torsion</Tag>
        <Tag position={[(L.damperAnchor[0] + L.armB[0]) / 2, L.damperAnchor[1] + 30, 0]} tone="info" side="left">Amortisseur</Tag>
        {inerterOn && (
          <Tag position={[L.inerterAnchor[0] + 40, L.inerterAnchor[1] - (top ? 50 : -50), 0]} tone="f1" side="left">
            Inerter (J-damper)
          </Tag>
        )}
        <Tag position={[-200, top ? 300 : 480, 400]} side="left">Monocoque</Tag>
        <Tag position={[760, 5, 700]} side="right">{profile === 'bosse' ? 'Bosse' : 'Vibreur'}</Tag>
      </group>
    </>
  )
}
