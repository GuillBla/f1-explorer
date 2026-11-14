import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Vec3 } from '../../types'
import { cylZ, gearGeometry } from '../three/geom'
import { MechStage, Tag } from '../three/MechStage'
import { useDisposables, useMechMats } from '../three/materials'
import { armEnd, ARM, innerJoint, KINGPIN_X, MODULE, PINION_R, PINION_Z, RACK_HALF, RACK_Z, sim, useSteerStore, type ControlId } from './sim'

const S = 0.003
const RACK_Y = 300
/** Rack pitch line height above the rack root. */
const PITCH_LINE = 1.25 * MODULE
const PINION_Y = RACK_Y + PITCH_LINE + PINION_R
const WHEEL_POS: Vec3 = [0, 520, 1350]
const UJ_POS: Vec3 = [0, PINION_Y, 330]
const TYRE_R = 330
/** The steering wheel is drawn larger than life so its controls stay readable. */
export const WHEEL_ZOOM = 1.6
const TYRE_W = 280

function unitCyl(r: number, seg = 12) {
  const g = new THREE.CylinderGeometry(r, r, 1, seg)
  g.translate(0, 0.5, 0)
  return g
}

const _a = new THREE.Vector3()
const _b = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
function span(o: THREE.Object3D | null, a: Vec3, b: Vec3) {
  if (!o) return
  _a.set(...a)
  _b.set(...b).sub(_a)
  const L = _b.length()
  o.position.copy(_a)
  o.quaternion.setFromUnitVectors(_up, _b.multiplyScalar(1 / L))
  o.scale.set(1, L, 1)
}

/** Straight-flank rack (the involute rack has straight flanks at the pressure angle). */
function rackGeometry(length: number) {
  const m = MODULE
  const p = Math.PI * m
  const t = Math.tan((20 * Math.PI) / 180)
  const s = new THREE.Shape()
  const half = length / 2
  s.moveTo(-half, -9)
  s.lineTo(half, -9)
  s.lineTo(half, 0)
  const n = Math.floor(length / p / 2) - 1
  const pts: [number, number][] = []
  for (let k = n; k >= -n; k--) {
    const c = k * p
    const wRoot = p / 4 + PITCH_LINE * t
    const wTip = p / 4 - m * t
    pts.push([c + wRoot, 0], [c + wTip, 2.25 * m], [c - wTip, 2.25 * m], [c - wRoot, 0])
  }
  for (const [x, y] of pts) s.lineTo(x, y)
  s.lineTo(-half, 0)
  s.lineTo(-half, -9)
  const g = new THREE.ExtrudeGeometry(s, { depth: 18, bevelEnabled: false })
  g.translate(0, 0, -9)
  return g
}

function steeringWheelShape() {
  const s = new THREE.Shape()
  s.moveTo(-100, 70)
  s.lineTo(100, 70)
  s.quadraticCurveTo(142, 70, 142, 28)
  s.lineTo(136, -62)
  s.quadraticCurveTo(132, -98, 100, -98)
  s.lineTo(72, -98)
  s.quadraticCurveTo(56, -98, 50, -76)
  s.lineTo(-50, -76)
  s.quadraticCurveTo(-56, -98, -72, -98)
  s.lineTo(-100, -98)
  s.quadraticCurveTo(-132, -98, -136, -62)
  s.lineTo(-142, 28)
  s.quadraticCurveTo(-142, 70, -100, 70)
  return s
}

function displayTexture() {
  const c = document.createElement('canvas')
  c.width = 256
  c.height = 128
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = '#05070a'
    g.fillRect(0, 0, 256, 128)
    // rev lights
    const cols = ['#2ecc71', '#2ecc71', '#2ecc71', '#2ecc71', '#f01c12', '#f01c12', '#f01c12', '#3fa9f5', '#3fa9f5', '#3fa9f5']
    cols.forEach((col, i) => {
      g.fillStyle = i < 7 ? col : '#1a1d24'
      g.fillRect(14 + i * 23.5, 6, 18, 9)
    })
    g.fillStyle = '#f2f2f5'
    g.font = 'bold 64px monospace'
    g.textAlign = 'center'
    g.fillText('4', 128, 88)
    g.font = 'bold 20px monospace'
    g.textAlign = 'left'
    g.fillStyle = '#00d2be'
    g.fillText('212', 12, 50)
    g.fillStyle = '#9b9eab'
    g.font = '12px monospace'
    g.fillText('km/h', 12, 66)
    g.fillStyle = '#ffb800'
    g.font = 'bold 18px monospace'
    g.textAlign = 'right'
    g.fillText('-0.214', 246, 50)
    g.fillStyle = '#9b9eab'
    g.font = '12px monospace'
    g.fillText('delta', 246, 66)
    // battery bar
    g.fillStyle = '#20202b'
    g.fillRect(12, 104, 232, 12)
    g.fillStyle = '#2ecc71'
    g.fillRect(12, 104, 150, 12)
  }
  const t = new THREE.CanvasTexture(c)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Controls of the steering wheel: position on the wheel face (mm), colour, kind. */
const CONTROLS: { id: ControlId; pos: [number, number]; color: string; kind: 'button' | 'rotary' | 'screen' | 'paddle'; label: string; side?: 'left' | 'right' }[] = [
  { id: 'ecran', pos: [0, 22], color: '', kind: 'screen', label: 'Écran', side: 'right' },
  { id: 'aero', pos: [-112, 40], color: '#2a72c9', kind: 'button', label: 'Aéro active', side: 'left' },
  { id: 'override', pos: [112, 40], color: '#d4140c', kind: 'button', label: 'Override', side: 'right' },
  { id: 'radio', pos: [-112, 6], color: '#27a85f', kind: 'button', label: 'Radio', side: 'left' },
  { id: 'limiteur', pos: [112, 6], color: '#e8e4dc', kind: 'button', label: 'Limiteur stand', side: 'right' },
  { id: 'neutre', pos: [-95, -35], color: '#ffb800', kind: 'button', label: 'Neutre', side: 'left' },
  { id: 'diff', pos: [-48, -40], color: '', kind: 'rotary', label: 'Différentiel', side: 'left' },
  { id: 'freinage', pos: [0, -42], color: '', kind: 'rotary', label: 'Répartition freinage', side: 'right' },
  { id: 'moteur', pos: [48, -40], color: '', kind: 'rotary', label: 'Mode moteur', side: 'right' },
  { id: 'recharge', pos: [95, -35], color: '', kind: 'rotary', label: 'Recharge', side: 'right' },
]

const KEY_LABELS = new Set<ControlId>(['ecran', 'override', 'palettes', 'freinage'])

export default function SteeringScene() {
  const m = useMechMats()
  const focus = useSteerStore((s) => s.focus)
  // without a selection only a few key controls are labelled (readability)
  const shown = (id: ControlId) => (focus ? focus === id : KEY_LABELS.has(id))
  const g = useDisposables(() => {
    const wheel = new THREE.ExtrudeGeometry(steeringWheelShape(), { depth: 28, bevelEnabled: true, bevelThickness: 4, bevelSize: 4, bevelSegments: 2, curveSegments: 10 })
    wheel.translate(0, 0, -14)
    const tyrePts: THREE.Vector2[] = []
    const w = TYRE_W / 2
    for (const [r, y] of [
      [230, -w + 10],
      [250, -w],
      [TYRE_R - 28, -w],
      [TYRE_R, -w + 40],
      [TYRE_R, w - 40],
      [TYRE_R - 28, w],
      [250, w],
      [230, w - 10],
    ] as [number, number][])
      tyrePts.push(new THREE.Vector2(r, y))
    const tyre = new THREE.LatheGeometry(tyrePts, 56)
    tyre.rotateZ(Math.PI / 2)
    return {
      rack: rackGeometry(2 * RACK_HALF - 30),
      pinion: gearGeometry({ teeth: PINION_Z, module: MODULE, bore: 4 }, 18),
      housing: new THREE.CylinderGeometry(24, 24, 160, 24).rotateZ(Math.PI / 2),
      boot: new THREE.TorusGeometry(19, 5, 8, 20).rotateY(Math.PI / 2),
      pinionCase: new THREE.CylinderGeometry(30, 30, 46, 24, 1, true).rotateX(Math.PI / 2),
      tie: unitCyl(7),
      column: unitCyl(11, 16),
      ball: new THREE.SphereGeometry(13, 14, 10),
      uj: new THREE.BoxGeometry(34, 10, 10),
      tyre,
      rim: new THREE.CylinderGeometry(232, 232, TYRE_W - 20, 40, 1, true).rotateZ(Math.PI / 2),
      rimFace: new THREE.CylinderGeometry(232, 232, 8, 40).rotateZ(Math.PI / 2),
      hub: new THREE.CylinderGeometry(55, 55, 50, 20).rotateZ(Math.PI / 2),
      upright: new THREE.BoxGeometry(70, 300, 90),
      kingpin: new THREE.CylinderGeometry(4, 4, 420, 8),
      arm: new THREE.BoxGeometry(22, 22, 1).translate(0, 0, 0.5),
      wheel,
      grip: new THREE.BoxGeometry(40, 120, 34),
      screen: new THREE.PlaneGeometry(108, 54),
      button: cylZ(9, 9, 8, 18),
      rotary: gearGeometry({ teeth: 18, module: 1.3 }, 10),
      mark: new THREE.BoxGeometry(2.5, 9, 2),
      paddle: new THREE.BoxGeometry(62, 38, 5),
      clutch: new THREE.BoxGeometry(48, 30, 5),
      ground: new THREE.PlaneGeometry(2600, 2600).rotateX(-Math.PI / 2),
      screenTex: displayTexture(),
    }
  })
  const local = useDisposables(
    () => ({
      screen: new THREE.MeshBasicMaterial({ map: g.screenTex, toneMapped: false }),
      ground: new THREE.MeshStandardMaterial({ color: '#12151b', roughness: 1 }),
      boot: new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.8 }),
      tyre: new THREE.MeshStandardMaterial({ color: '#1b1c1f', roughness: 0.85, side: THREE.DoubleSide }),
      buttons: CONTROLS.filter((c) => c.kind === 'button').map((c) => new THREE.MeshStandardMaterial({ color: c.color, roughness: 0.4, metalness: 0.2, emissive: c.color, emissiveIntensity: 0.25 })),
    }),
    [g],
  )

  const R = useRef<Record<string, THREE.Object3D | null>>({})
  const ref = (k: string) => (o: THREE.Object3D | null) => {
    R.current[k] = o
  }

  // orientation of the steering wheel: its face (+Z) along the upper column
  const colDir = new THREE.Vector3(WHEEL_POS[0] - UJ_POS[0], WHEEL_POS[1] - UJ_POS[1], WHEEL_POS[2] - UJ_POS[2]).normalize()
  const wheelQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 0, 1), colDir)

  useFrame(() => {
    const o = R.current
    const wheelRad = (sim.wheelDeg * Math.PI) / 180
    // pinion rolls on the rack: rack = r·θp
    const thetaP = sim.rack / PINION_R
    if (o.pinion) o.pinion.rotation.z = thetaP - Math.PI / 2 + Math.PI / PINION_Z
    if (o.rack) o.rack.position.x = sim.rack
    if (o.ujYoke) o.ujYoke.rotation.z = thetaP
    if (o.wheelSpin) o.wheelSpin.rotation.z = -wheelRad
    if (o.kpL) o.kpL.rotation.y = sim.yawL
    if (o.kpR) o.kpR.rotation.y = sim.yawR
    for (const side of [-1, 1] as const) {
      const a = armEnd(side, side < 0 ? sim.yawL : sim.yawR)
      const t = innerJoint(side, sim.rack)
      span(side < 0 ? o.tieL : o.tieR, [t[0], RACK_Y, t[1]], [a[0], RACK_Y, a[1]])
      const ball = side < 0 ? o.ballL : o.ballR
      ball?.position.set(t[0], RACK_Y, t[1])
    }
  })

  return (
    <>
      <MechStage target={[0, 0.7, 1.6]} minDistance={1.5} maxDistance={16} />
      <group scale={S}>
        <mesh geometry={g.ground} material={local.ground} position={[0, 0, 300]} />
        {/* front wheels on their kingpins */}
        {([-1, 1] as const).map((side) => (
          <group key={side} ref={ref(side < 0 ? 'kpL' : 'kpR')} position={[side * KINGPIN_X, TYRE_R, 0]}>
            <mesh geometry={g.kingpin} material={m.polished} />
            <mesh geometry={g.upright} material={m.titanium} position={[side * 30, 0, 0]} />
            {/* steering arm: from the kingpin to the tie-rod joint, at rack height */}
            <mesh geometry={g.arm} material={m.titanium} position={[0, RACK_Y - TYRE_R, 0]} scale={[1, 1, Math.hypot(ARM[0], ARM[1])]} rotation={[0, Math.atan2(ARM[0] * side, ARM[1]), 0]} />
            <group position={[side * 150, 0, 0]}>
              <mesh geometry={g.tyre} material={local.tyre} />
              <mesh geometry={g.rim} material={m.darkSteel} />
              <mesh geometry={g.rimFace} material={m.darkSteel} position={[side * (TYRE_W / 2 - 16), 0, 0]} />
              <mesh geometry={g.hub} material={m.red} position={[side * (TYRE_W / 2), 0, 0]} />
            </group>
          </group>
        ))}
        {/* tie rods */}
        <mesh ref={ref('tieL')} geometry={g.tie} material={m.steel} />
        <mesh ref={ref('tieR')} geometry={g.tie} material={m.steel} />
        <mesh ref={ref('ballL')} geometry={g.ball} material={m.polished} />
        <mesh ref={ref('ballR')} geometry={g.ball} material={m.polished} />
        {/* rack housing with a window around the pinion */}
        <mesh geometry={g.housing} material={m.alu} position={[-140, RACK_Y, RACK_Z]} />
        <mesh geometry={g.housing} material={m.alu} position={[140, RACK_Y, RACK_Z]} />
        {[-1, 1].map((s) =>
          [0, 1, 2, 3].map((k) => <mesh key={`${s}${k}`} geometry={g.boot} material={local.boot} position={[s * (226 + k * 9), RACK_Y, RACK_Z]} />),
        )}
        <group ref={ref('rack')} position={[0, RACK_Y - 1, RACK_Z]}>
          <mesh geometry={g.rack} material={m.steel} />
        </group>
        <mesh ref={ref('pinion')} geometry={g.pinion} material={m.gold} position={[0, PINION_Y, RACK_Z]} />
        {/* column: pinion -> universal joint -> steering wheel */}
        <mesh geometry={g.column} material={m.darkSteel} position={[0, PINION_Y, RACK_Z]} rotation={[Math.PI / 2, 0, 0]} scale={[1, UJ_POS[2] - RACK_Z, 1]} />
        <group position={UJ_POS}>
          <mesh geometry={g.ball} material={m.polished} scale={1.4} />
          <mesh ref={ref('ujYoke')} geometry={g.uj} material={m.titanium} />
        </group>
        <mesh
          geometry={g.column}
          material={m.darkSteel}
          position={UJ_POS}
          quaternion={new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), colDir)}
          scale={[1, new THREE.Vector3(...WHEEL_POS).distanceTo(new THREE.Vector3(...UJ_POS)) - 20, 1]}
        />
        {/* steering wheel */}
        <group position={WHEEL_POS} quaternion={wheelQuat} scale={WHEEL_ZOOM}>
          <group ref={ref('wheelSpin')}>
            <mesh geometry={g.wheel} material={m.carbon} />
            <mesh geometry={g.grip} material={m.rubber} position={[-122, -25, 0]} />
            <mesh geometry={g.grip} material={m.rubber} position={[122, -25, 0]} />
            <mesh geometry={g.screen} material={local.screen} position={[0, 22, 19]} />
            {CONTROLS.filter((c) => c.kind === 'button').map((c, i) => (
              <mesh key={c.id} geometry={g.button} material={local.buttons[i]} position={[c.pos[0], c.pos[1], 20]} />
            ))}
            {CONTROLS.filter((c) => c.kind === 'rotary').map((c) => (
              <group key={c.id} position={[c.pos[0], c.pos[1], 22]}>
                <mesh geometry={g.rotary} material={m.alu} />
                <mesh geometry={g.mark} material={m.ceramic} position={[0, 7, 5]} />
              </group>
            ))}
            {/* paddles behind the wheel */}
            <mesh geometry={g.paddle} material={m.carbon} position={[-118, 18, -26]} rotation={[0, 0, 0.25]} />
            <mesh geometry={g.paddle} material={m.carbon} position={[118, 18, -26]} rotation={[0, 0, -0.25]} />
            <mesh geometry={g.clutch} material={m.titanium} position={[-92, -58, -30]} />
            <mesh geometry={g.clutch} material={m.titanium} position={[92, -58, -30]} />
            {CONTROLS.filter((c) => shown(c.id)).map((c) => (
              <Tag key={c.id} position={[c.pos[0], c.pos[1], 30]} side={c.side} tone={focus === c.id ? 'accent' : 'text'}>
                {c.label}
              </Tag>
            ))}
            {shown('palettes') && (
              <Tag position={[-140, 30, -30]} side="left" tone={focus === 'palettes' ? 'accent' : 'text'}>
                Palettes de vitesses
              </Tag>
            )}
            {shown('embrayage') && (
              <Tag position={[-110, -60, -30]} side="left" tone={focus === 'embrayage' ? 'accent' : 'text'}>
                Palettes d’embrayage
              </Tag>
            )}
          </group>
        </group>
        {/* mechanism labels */}
        <Tag position={[0, PINION_Y + 30, RACK_Z]} tone="warn" side="right">
          Pignon (14 dents)
        </Tag>
        <Tag position={[-60, RACK_Y - 30, RACK_Z + 20]} tone="accent" side="left">
          Crémaillère
        </Tag>
        <Tag position={[-430, RACK_Y + 10, RACK_Z]} side="left">
          Biellette
        </Tag>
        <Tag position={[KINGPIN_X, RACK_Y - 10, RACK_Z + 40]} side="right">
          Bras de direction
        </Tag>
        <Tag position={[-KINGPIN_X, TYRE_R + 220, 0]} side="left">
          Pivot (axe de fusée)
        </Tag>
        <Tag position={[0, (PINION_Y + WHEEL_POS[1]) / 2 + 30, (UJ_POS[2] + WHEEL_POS[2]) / 2]} side="left">
          Colonne de direction
        </Tag>
      </group>
    </>
  )
}
