import * as THREE from 'three'
import { plateXY, plateXZ } from './geometry'
import { Explode, Part, useGeometries, useMats } from './Part'

/** Floor top-view outline (x, z), right side then left side, centre cut out for the diffuser. */
const FLOOR_RIGHT: [number, number][] = [
  [1.3, 0.22],
  [1.12, 0.56],
  [0.9, 0.76],
  [0.55, 0.8],
  [-0.95, 0.8],
  [-1.25, 0.62],
  [-1.5, 0.56],
  [-1.5, 0.5],
  [-1.0, 0.5],
]
const FLOOR_OUTLINE: [number, number][] = [
  ...FLOOR_RIGHT,
  ...FLOOR_RIGHT.slice()
    .reverse()
    .map(([x, z]) => [x, -z] as [number, number]),
]

export const FLOOR_Y = 0.07

/* ------------------------------------------------------------------ */
/* Floor and Venturi tunnels                                           */
/* ------------------------------------------------------------------ */

export function Floor() {
  return (
    <Part id="floor">
      <Explode dir={[0, -0.42, 0]}>
        <FloorMeshes />
      </Explode>
    </Part>
  )
}

function FloorMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    plate: plateXZ(FLOOR_OUTLINE, 0.022),
    fence: new THREE.BoxGeometry(1, 0.05, 0.008),
    edge: new THREE.BoxGeometry(1.5, 0.03, 0.01),
    edgeStripe: new THREE.BoxGeometry(1.5, 0.006, 0.04),
  }))
  // fences: two straight segments each, curving outwards towards the rear (Venturi inlets)
  const fences = [0.28, 0.4, 0.52, 0.64].flatMap((z0, i) =>
    ([1, -1] as const).flatMap((s) => {
      const z1 = z0 + 0.06 + i * 0.02
      return [
        { a: [1.25, z0 * 0.8] as const, b: [0.75, z0] as const, s },
        { a: [0.75, z0] as const, b: [0.25, z1] as const, s },
      ]
    }),
  )
  return (
    <group>
      <mesh geometry={geo.plate} material={m.carbonMatte} position={[0, FLOOR_Y, 0]} castShadow receiveShadow />
      {fences.map((f, i) => {
        const dx = f.b[0] - f.a[0]
        const dz = (f.b[1] - f.a[1]) * f.s
        const len = Math.hypot(dx, dz)
        return (
          <mesh
            key={i}
            geometry={geo.fence}
            material={m.carbon}
            position={[(f.a[0] + f.b[0]) / 2, FLOOR_Y - 0.022, (f.s * (f.a[1] + f.b[1])) / 2]}
            rotation={[0, -Math.atan2(dz, dx), 0]}
            scale={[len, 1, 1]}
          />
        )
      })}
      {[1, -1].map((s) => (
        <group key={s}>
          <mesh geometry={geo.edge} material={m.carbon} position={[-0.2, FLOOR_Y + 0.035, s * 0.795]} rotation={[s * 0.35, 0, 0]} />
          <mesh geometry={geo.edgeStripe} material={m.teal} position={[-0.2, FLOOR_Y + 0.025, s * 0.77]} />
        </group>
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Plank and skids                                                     */
/* ------------------------------------------------------------------ */

export function Plank() {
  return (
    <Part id="plank">
      <Explode dir={[0, -0.75, 0]}>
        <PlankMeshes />
      </Explode>
    </Part>
  )
}

function PlankMeshes() {
  const m = useMats()
  const geo = useGeometries(() => ({
    plank: new THREE.BoxGeometry(2.5, 0.01, 0.3),
    skid: new THREE.BoxGeometry(0.16, 0.004, 0.06),
    hole: new THREE.CylinderGeometry(0.02, 0.02, 0.012, 16),
  }))
  return (
    <group>
      <mesh geometry={geo.plank} material={m.wood} position={[-0.15, 0.035, 0]} castShadow />
      {[0.7, -0.15, -1.0].map((x) => (
        <mesh key={x} geometry={geo.skid} material={m.titanium} position={[x, 0.029, 0]} />
      ))}
      {[0.35, -0.55].map((x) => (
        <mesh key={x} geometry={geo.hole} material={m.dark} position={[x, 0.035, 0]} />
      ))}
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Diffuser                                                            */
/* ------------------------------------------------------------------ */

const RAMP = { x0: -1.0, y0: FLOOR_Y, x1: -1.95, y1: 0.34 }

export function Diffuser() {
  return (
    <Part id="diffuser">
      <Explode dir={[-0.55, -0.3, 0]}>
        <DiffuserMeshes />
      </Explode>
    </Part>
  )
}

function DiffuserMeshes() {
  const m = useMats()
  const len = Math.hypot(RAMP.x1 - RAMP.x0, RAMP.y1 - RAMP.y0)
  const angle = Math.atan2(RAMP.y1 - RAMP.y0, RAMP.x0 - RAMP.x1)
  const geo = useGeometries(() => ({
    ramp: new THREE.BoxGeometry(len, 0.018, 1.0),
    wall: plateXY(
      [
        [RAMP.x0, RAMP.y0],
        [RAMP.x1, RAMP.y0 + 0.02],
        [RAMP.x1, RAMP.y1 + 0.03],
        [RAMP.x0, RAMP.y0 + 0.03],
      ],
      0.012,
    ),
    strake: plateXY(
      [
        [RAMP.x0 - 0.1, RAMP.y0 + 0.02],
        [RAMP.x1, RAMP.y1],
        [RAMP.x1, RAMP.y1 - 0.15],
        [RAMP.x0 - 0.35, RAMP.y0 + 0.01],
      ],
      0.008,
    ),
    lip: new THREE.BoxGeometry(0.03, 0.03, 1.0),
  }))
  return (
    <group>
      <mesh
        geometry={geo.ramp}
        material={m.carbon}
        position={[(RAMP.x0 + RAMP.x1) / 2, (RAMP.y0 + RAMP.y1) / 2 + 0.01, 0]}
        rotation={[0, 0, -angle]}
        castShadow
        receiveShadow
      />
      {[0.5, -0.5].map((z) => (
        <mesh key={z} geometry={geo.wall} material={m.carbon} position={[0, 0, z]} />
      ))}
      {[0.17, -0.17, 0.33, -0.33].map((z) => (
        <mesh key={z} geometry={geo.strake} material={m.carbonMatte} position={[0, 0, z]} />
      ))}
      <mesh geometry={geo.lip} material={m.accent} position={[RAMP.x1 - 0.01, RAMP.y1 + 0.03, 0]} />
    </group>
  )
}
