import { useEffect, useMemo, type DependencyList } from 'react'
import * as THREE from 'three'

/** Materials of the mechanical scenes (metals, titanium, carbon, cut faces…). */
export type MechMatKey =
  | 'steel'
  | 'polished'
  | 'darkSteel'
  | 'titanium'
  | 'alu'
  | 'carbon'
  | 'copper'
  | 'gold'
  | 'rubber'
  | 'red'
  | 'blue'
  | 'green'
  | 'ceramic'
  | 'ring'

export type MechMats = Record<MechMatKey, THREE.MeshStandardMaterial>

let carbonTex: THREE.CanvasTexture | null = null
let carbonUsers = 0

/** Procedural 2x2 twill carbon weave. */
function makeCarbonTexture() {
  const c = document.createElement('canvas')
  c.width = c.height = 64
  const g = c.getContext('2d')
  if (g) {
    g.fillStyle = '#121418'
    g.fillRect(0, 0, 64, 64)
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const k = (x + y) % 4 < 2
        const grad = k ? g.createLinearGradient(x * 8, 0, x * 8 + 8, 0) : g.createLinearGradient(0, y * 8, 0, y * 8 + 8)
        grad.addColorStop(0, '#1a1d23')
        grad.addColorStop(0.5, '#3a3f49')
        grad.addColorStop(1, '#1a1d23')
        g.fillStyle = grad
        g.fillRect(x * 8 + 0.5, y * 8 + 0.5, 7, 7)
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = t.wrapT = THREE.RepeatWrapping
  t.repeat.set(6, 6)
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

function std(p: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial(p)
}

export function createMechMats(): MechMats {
  carbonTex ??= makeCarbonTexture()
  carbonUsers++
  return {
    steel: std({ color: '#a9b0bd', metalness: 0.95, roughness: 0.32 }),
    polished: std({ color: '#dfe3ea', metalness: 1, roughness: 0.14 }),
    darkSteel: std({ color: '#565c68', metalness: 0.9, roughness: 0.42 }),
    titanium: std({ color: '#bdb6a8', metalness: 1, roughness: 0.26 }),
    alu: std({ color: '#8f97a5', metalness: 0.75, roughness: 0.48 }),
    carbon: new THREE.MeshPhysicalMaterial({ color: '#ffffff', map: carbonTex, metalness: 0.3, roughness: 0.4, clearcoat: 1, clearcoatRoughness: 0.2 }),
    copper: std({ color: '#c8743f', metalness: 1, roughness: 0.32 }),
    gold: std({ color: '#d9ad4a', metalness: 1, roughness: 0.25 }),
    rubber: std({ color: '#1b1c1f', metalness: 0, roughness: 0.9 }),
    red: std({ color: '#d4140c', metalness: 0.5, roughness: 0.35 }),
    blue: std({ color: '#2a72c9', metalness: 0.6, roughness: 0.35 }),
    green: std({ color: '#27a85f', metalness: 0.3, roughness: 0.5 }),
    ceramic: std({ color: '#e8e4dc', metalness: 0, roughness: 0.6 }),
    ring: std({ color: '#2b2e35', metalness: 0.9, roughness: 0.3 }),
  }
}

export function disposeMechMats(m: MechMats) {
  for (const mat of Object.values(m)) mat.dispose()
  carbonUsers--
  if (carbonUsers <= 0 && carbonTex) {
    carbonTex.dispose()
    carbonTex = null
    carbonUsers = 0
  }
}

/** Mechanical material set, created once per scene and disposed on unmount. */
export function useMechMats(): MechMats {
  const m = useMemo(createMechMats, [])
  useEffect(() => () => disposeMechMats(m), [m])
  return m
}

type Disposable = { dispose: () => void }

/** useMemo for a record of disposables (geometries, materials, textures), disposed on unmount / deps change. */
export function useDisposables<T extends Record<string, Disposable | Disposable[]>>(factory: () => T, deps: DependencyList = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(factory, deps)
  useEffect(
    () => () => {
      for (const d of Object.values(v)) {
        if (Array.isArray(d)) d.forEach((x) => x.dispose())
        else d.dispose()
      }
    },
    [v],
  )
  return v
}

/**
 * Housing material pair for cut-away views: the outer skin (front faces) and a flat "section" colour
 * drawn on back faces, which reads as the cut surface (classic technical cut-away look).
 */
export function createHousing(color: string, planes: THREE.Plane[], opts: { metalness?: number; roughness?: number; section?: string; map?: THREE.Texture } = {}) {
  const skin = new THREE.MeshStandardMaterial({
    color,
    metalness: opts.metalness ?? 0.7,
    roughness: opts.roughness ?? 0.5,
    map: opts.map ?? null,
    clippingPlanes: planes,
    side: THREE.FrontSide,
  })
  const section = new THREE.MeshStandardMaterial({
    color: opts.section ?? '#8a1c16',
    metalness: 0.1,
    roughness: 0.9,
    emissive: opts.section ?? '#8a1c16',
    emissiveIntensity: 0.25,
    clippingPlanes: planes,
    side: THREE.BackSide,
  })
  return { skin, section }
}

/** Turns clipping on/off on a list of materials. */
export function setClipping(mats: THREE.Material[], planes: THREE.Plane[] | null) {
  for (const m of mats) {
    m.clippingPlanes = planes
    m.needsUpdate = true
  }
}

let spriteTex: THREE.CanvasTexture | null = null
/** Round soft sprite used by particle flows (shared, never disposed: 32x32). */
export function softSprite() {
  if (spriteTex) return spriteTex
  const c = document.createElement('canvas')
  c.width = c.height = 32
  const g = c.getContext('2d')
  if (g) {
    const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.8)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, 32, 32)
  }
  spriteTex = new THREE.CanvasTexture(c)
  return spriteTex
}
