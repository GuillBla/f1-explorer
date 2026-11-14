import * as THREE from 'three'

/**
 * Material palette of the car. Generic "FIA prototype" livery: pearl white, F1 red and exposed
 * carbon fibre, deliberately not inspired by any real team.
 */
export type MatKey =
  | 'paint'
  | 'accent'
  | 'teal'
  | 'carbon'
  | 'carbonMatte'
  | 'metal'
  | 'titanium'
  | 'rubber'
  | 'rim'
  | 'visor'
  | 'helmet'
  | 'dark'
  | 'wood'
  | 'disc'
  | 'tyreBand'
  | 'graphite'
  | 'discVent'
  | 'caliper'
  | 'exhaust'
  | 'led'
  | 'glass'
  | 'suit'
  | 'pad'

export type MatSet = Record<MatKey, THREE.MeshStandardMaterial>

/** Power unit internals, only visible in x-ray / exploded mode. */
export type PuKey = 'block' | 'head' | 'turbo' | 'mguk' | 'battery' | 'fuel' | 'gearbox' | 'radiator' | 'exhaust'
export type PuSet = Record<PuKey, THREE.MeshStandardMaterial>

function std(params: THREE.MeshStandardMaterialParameters) {
  return new THREE.MeshStandardMaterial(params)
}
function phys(params: THREE.MeshPhysicalMaterialParameters) {
  return new THREE.MeshPhysicalMaterial(params)
}

/* ------------------------------------------------------------------ */
/* Procedural textures (canvas): carbon twill, ventilated disc edge    */
/* ------------------------------------------------------------------ */

/** UVs of the car geometry are in metres: one carbon tile = 4 cm (8 tows of 5 mm, exaggerated for legibility). */
const CARBON_TILE_M = 0.04

function makeCanvas(size: number) {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  return c
}

/** 2×2 twill weave: each tow is a gradient strip, warp and weft alternate in a diagonal pattern. */
function carbonTexture(): THREE.Texture {
  const size = 256
  const c = makeCanvas(size)
  const ctx = c.getContext('2d')
  if (!ctx) return new THREE.Texture()
  const n = 8
  const s = size / n
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const warpOnTop = (i + j) % 4 < 2
      const x = i * s
      const y = j * s
      const g = warpOnTop ? ctx.createLinearGradient(x, 0, x + s, 0) : ctx.createLinearGradient(0, y, 0, y + s)
      const hi = warpOnTop ? '#3a3f4a' : '#2b2f38'
      g.addColorStop(0, '#0d0f13')
      g.addColorStop(0.18, '#1b1e25')
      g.addColorStop(0.5, hi)
      g.addColorStop(0.82, '#1b1e25')
      g.addColorStop(1, '#0d0f13')
      ctx.fillStyle = g
      ctx.fillRect(x, y, s, s)
      // fibre lines along the tow
      ctx.strokeStyle = 'rgba(255,255,255,0.035)'
      ctx.lineWidth = 1
      for (let k = 3; k < s; k += 4) {
        ctx.beginPath()
        if (warpOnTop) {
          ctx.moveTo(x + k, y)
          ctx.lineTo(x + k, y + s)
        } else {
          ctx.moveTo(x, y + k)
          ctx.lineTo(x + s, y + k)
        }
        ctx.stroke()
      }
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.RepeatWrapping
  t.repeat.set(1 / CARBON_TILE_M, 1 / CARBON_TILE_M)
  t.anisotropy = 8
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

/** Edge of a carbon-carbon disc: rows of small radial ventilation holes (≈ 1000+ on a real disc). */
function ventTexture(): THREE.Texture {
  const w = 512
  const h = 32
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) return new THREE.Texture()
  ctx.fillStyle = '#3b3d42'
  ctx.fillRect(0, 0, w, h)
  ctx.fillStyle = '#0a0a0c'
  for (let row = 0; row < 4; row++) {
    for (let i = 0; i < 64; i++) {
      const x = (i + (row % 2) * 0.5) * (w / 64)
      ctx.beginPath()
      ctx.arc(x, 4 + row * 8, 2.6, 0, Math.PI * 2)
      ctx.fill()
    }
  }
  const t = new THREE.CanvasTexture(c)
  t.wrapS = THREE.RepeatWrapping
  t.wrapT = THREE.ClampToEdgeWrapping
  t.colorSpace = THREE.SRGBColorSpace
  return t
}

interface Textures {
  carbon: THREE.Texture
  vent: THREE.Texture
}

const OWNED_TEXTURES = new WeakMap<THREE.Material, Textures>()

export function createMatSet(): MatSet {
  const tex: Textures = { carbon: carbonTexture(), vent: ventTexture() }
  const set: MatSet = {
    paint: phys({ color: '#eef0f3', metalness: 0.15, roughness: 0.3, clearcoat: 1, clearcoatRoughness: 0.06, sheen: 0.3, sheenColor: '#ffffff' }),
    accent: phys({ color: '#d70a00', metalness: 0.2, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.08 }),
    teal: phys({ color: '#00b3a1', metalness: 0.3, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    carbon: phys({ color: '#ffffff', map: tex.carbon, metalness: 0.25, roughness: 0.42, clearcoat: 1, clearcoatRoughness: 0.07 }),
    carbonMatte: std({ color: '#c8c8c8', map: tex.carbon, metalness: 0.15, roughness: 0.78 }),
    metal: std({ color: '#a4abb8', metalness: 0.95, roughness: 0.3 }),
    titanium: std({ color: '#b9bfc9', metalness: 1, roughness: 0.26 }),
    rubber: std({ color: '#1b1b1d', metalness: 0, roughness: 0.88 }),
    rim: std({ color: '#2a2d33', metalness: 0.8, roughness: 0.38 }),
    visor: phys({ color: '#0b0f18', metalness: 0.7, roughness: 0.05, clearcoat: 1, transparent: true, opacity: 0.88 }),
    helmet: phys({ color: '#f4f5f7', metalness: 0.1, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05 }),
    dark: std({ color: '#050608', metalness: 0, roughness: 1, side: THREE.DoubleSide }),
    wood: std({ color: '#a9895e', metalness: 0, roughness: 0.8 }),
    disc: std({ color: '#2c2c30', metalness: 0.2, roughness: 0.75, emissive: '#ff5a1f', emissiveIntensity: 0 }),
    tyreBand: std({ color: '#ff3333', metalness: 0, roughness: 0.6 }),
    graphite: phys({ color: '#24272e', metalness: 0.4, roughness: 0.38, clearcoat: 0.8, clearcoatRoughness: 0.15 }),
    discVent: std({ color: '#ffffff', map: tex.vent, metalness: 0.2, roughness: 0.8 }),
    caliper: std({ color: '#9aa0aa', metalness: 0.7, roughness: 0.35 }),
    exhaust: std({ color: '#b5926a', metalness: 1, roughness: 0.32 }),
    led: std({ color: '#ff2a2a', emissive: '#ff1010', emissiveIntensity: 2.2, toneMapped: false }),
    glass: phys({ color: '#9fb4c8', metalness: 1, roughness: 0.02 }),
    suit: std({ color: '#d9dce2', metalness: 0, roughness: 0.75 }),
    pad: std({ color: '#2a2c33', metalness: 0, roughness: 0.9 }),
  }
  // textures are shared by every clone of the set, released with the base set
  // (kept out of userData: Material.clone() deep-copies userData through JSON)
  OWNED_TEXTURES.set(set.paint, tex)
  return set
}

export function createPuSet(): PuSet {
  return {
    block: std({ color: '#b9c0cc', metalness: 0.9, roughness: 0.35 }),
    head: std({ color: '#e10600', metalness: 0.5, roughness: 0.4, emissive: '#5a0200', emissiveIntensity: 0.4 }),
    turbo: std({ color: '#ffb800', metalness: 0.8, roughness: 0.3, emissive: '#5a3c00', emissiveIntensity: 0.4 }),
    mguk: std({ color: '#3fa9f5', metalness: 0.6, roughness: 0.35, emissive: '#0d3a5c', emissiveIntensity: 0.6 }),
    battery: std({ color: '#2ecc71', metalness: 0.4, roughness: 0.45, emissive: '#0c4a26', emissiveIntensity: 0.6 }),
    fuel: std({ color: '#ffd27a', metalness: 0.1, roughness: 0.6, transparent: true, opacity: 0.55 }),
    gearbox: std({ color: '#6c7385', metalness: 0.85, roughness: 0.35 }),
    radiator: std({ color: '#00d2be', metalness: 0.5, roughness: 0.5, emissive: '#00453f', emissiveIntensity: 0.5 }),
    exhaust: std({ color: '#c9a27a', metalness: 1, roughness: 0.3 }),
  }
}

function prepClone(m: THREE.MeshStandardMaterial) {
  const c = m.clone()
  c.userData = {
    baseOpacity: m.opacity,
    baseTransparent: m.transparent,
    baseEmissive: m.emissive.clone(),
    baseEmissiveIntensity: m.emissiveIntensity,
  }
  return c
}

export function cloneSet<T extends Record<string, THREE.MeshStandardMaterial>>(set: T): T {
  const out = {} as Record<string, THREE.MeshStandardMaterial>
  for (const [k, m] of Object.entries(set)) out[k] = prepClone(m)
  return out as T
}

/** Disposes the materials of a set (and the shared procedural textures of a base set). */
export function disposeSet(set: Record<string, THREE.Material>) {
  for (const m of Object.values(set)) {
    const tex = OWNED_TEXTURES.get(m)
    if (tex) {
      tex.carbon.dispose()
      tex.vent.dispose()
    }
    m.dispose()
  }
}

const HIGHLIGHT = new THREE.Color('#00d2be')

export interface VisualState {
  hovered: boolean
  selected: boolean
  /** Make the material ghost-like (x-ray / isolation). */
  ghost: boolean
  /** Opacity used when ghosted (default 0.1). */
  ghostOpacity?: number
}

function applyOne(m: THREE.MeshStandardMaterial, st: VisualState) {
  const baseT = m.userData.baseTransparent as boolean
  const baseO = m.userData.baseOpacity as number
  const wantTransparent = st.ghost || baseT
  const opacity = st.ghost ? (st.hovered || st.selected ? 0.32 : (st.ghostOpacity ?? 0.1)) : baseO
  if (m.transparent !== wantTransparent) {
    m.transparent = wantTransparent
    m.needsUpdate = true
  }
  m.opacity = opacity
  m.depthWrite = !st.ghost
  m.userData.ghost = st.ghost
  if (st.selected || st.hovered) {
    m.emissive.copy(HIGHLIGHT)
    m.emissiveIntensity = st.selected ? 0.4 : 0.25
  } else {
    m.emissive.copy(m.userData.baseEmissive as THREE.Color)
    m.emissiveIntensity = m.userData.baseEmissiveIntensity as number
  }
}

export function applyVisualState(set: Record<string, THREE.MeshStandardMaterial>, st: VisualState) {
  for (const m of Object.values(set)) applyOne(m, st)
}

/**
 * Lazily cloned material set: a clone is only created when a mesh actually reads `set.key`.
 * Each clickable sub-component owns one, so it can be highlighted / ghosted on its own without
 * cloning the whole palette dozens of times.
 */
export class MatBank<K extends string> {
  private cache = new Map<K, THREE.MeshStandardMaterial>()
  private state: VisualState = { hovered: false, selected: false, ghost: false }
  readonly set: Record<K, THREE.MeshStandardMaterial>
  private base: Record<K, THREE.MeshStandardMaterial>

  constructor(base: Record<K, THREE.MeshStandardMaterial>) {
    this.base = base
    const set = {} as Record<K, THREE.MeshStandardMaterial>
    for (const k of Object.keys(base) as K[]) Object.defineProperty(set, k, { get: () => this.get(k), enumerable: false })
    this.set = set
  }

  get(k: K) {
    let m = this.cache.get(k)
    if (!m) {
      m = prepClone(this.base[k])
      applyOne(m, this.state)
      this.cache.set(k, m)
    }
    return m
  }

  apply(st: VisualState) {
    this.state = st
    for (const m of this.cache.values()) applyOne(m, st)
  }

  dispose() {
    for (const m of this.cache.values()) m.dispose()
    this.cache.clear()
  }
}
