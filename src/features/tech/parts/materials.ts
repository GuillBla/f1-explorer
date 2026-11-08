import * as THREE from 'three'

/**
 * Material palette of the car. Generic stylised livery (graphite, red and teal accents),
 * deliberately not inspired by any real team.
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

export function createMatSet(): MatSet {
  return {
    paint: phys({ color: '#2a3140', metalness: 0.55, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.12 }),
    accent: phys({ color: '#e10600', metalness: 0.3, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.15 }),
    teal: phys({ color: '#00d2be', metalness: 0.3, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.2 }),
    carbon: phys({ color: '#14161b', metalness: 0.35, roughness: 0.38, clearcoat: 0.9, clearcoatRoughness: 0.25 }),
    carbonMatte: std({ color: '#101216', metalness: 0.2, roughness: 0.7 }),
    metal: std({ color: '#9aa3b5', metalness: 0.95, roughness: 0.28 }),
    titanium: std({ color: '#c7ccd6', metalness: 1, roughness: 0.22 }),
    rubber: std({ color: '#1a1a1c', metalness: 0, roughness: 0.92 }),
    rim: std({ color: '#2b2f38', metalness: 0.85, roughness: 0.35 }),
    visor: phys({ color: '#0d1422', metalness: 0.6, roughness: 0.08, clearcoat: 1 }),
    helmet: phys({ color: '#f2f4f8', metalness: 0.2, roughness: 0.3, clearcoat: 1 }),
    dark: std({ color: '#050608', metalness: 0, roughness: 1 }),
    wood: std({ color: '#b08a5a', metalness: 0, roughness: 0.8 }),
    disc: std({ color: '#2a2a2e', metalness: 0.2, roughness: 0.75, emissive: '#ff5a1f', emissiveIntensity: 0 }),
    tyreBand: std({ color: '#ff3333', metalness: 0, roughness: 0.6 }),
  }
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

export function cloneSet<T extends Record<string, THREE.MeshStandardMaterial>>(set: T): T {
  const out = {} as Record<string, THREE.MeshStandardMaterial>
  for (const [k, m] of Object.entries(set)) {
    const c = m.clone()
    c.userData.baseOpacity = m.opacity
    c.userData.baseTransparent = m.transparent
    c.userData.baseEmissive = m.emissive.clone()
    c.userData.baseEmissiveIntensity = m.emissiveIntensity
    out[k] = c
  }
  return out as T
}

export function disposeSet(set: Record<string, THREE.Material>) {
  for (const m of Object.values(set)) m.dispose()
}

const HIGHLIGHT = new THREE.Color('#00d2be')

export interface VisualState {
  hovered: boolean
  selected: boolean
  /** Make the material ghost-like (x-ray). */
  ghost: boolean
  /** Opacity used when ghosted (default 0.1). */
  ghostOpacity?: number
}

export function applyVisualState(set: Record<string, THREE.MeshStandardMaterial>, st: VisualState) {
  for (const m of Object.values(set)) {
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
    if (st.selected || st.hovered) {
      m.emissive.copy(HIGHLIGHT)
      m.emissiveIntensity = st.selected ? 0.45 : 0.28
    } else {
      m.emissive.copy(m.userData.baseEmissive as THREE.Color)
      m.emissiveIntensity = m.userData.baseEmissiveIntensity as number
    }
  }
}
