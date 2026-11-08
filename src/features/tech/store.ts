import { create } from 'zustand'
import type { PartId } from './types'

/* ------------------------------------------------------------------ */
/* 3D explorer                                                         */
/* ------------------------------------------------------------------ */

interface ExplorerState {
  hovered: PartId | null
  selected: PartId | null
  exploded: boolean
  xray: boolean
  autoRotate: boolean
  /** Incremented to ask the camera rig to go back to the overview. */
  resetToken: number
  setHovered: (id: PartId | null) => void
  select: (id: PartId | null) => void
  toggleExploded: () => void
  toggleXray: () => void
  toggleAutoRotate: () => void
  resetView: () => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  hovered: null,
  selected: null,
  exploded: false,
  xray: false,
  autoRotate: false,
  resetToken: 0,
  setHovered: (hovered) => set({ hovered }),
  select: (selected) => set({ selected, autoRotate: false }),
  toggleExploded: () => set((s) => ({ exploded: !s.exploded })),
  toggleXray: () => set((s) => ({ xray: !s.xray })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  resetView: () => set((s) => ({ selected: null, resetToken: s.resetToken + 1 })),
}))

/* ------------------------------------------------------------------ */
/* Virtual wind tunnel                                                 */
/* ------------------------------------------------------------------ */

export type FlowDisplay = 'particles' | 'streamlines' | 'both'
export type ColorBy = 'speed' | 'pressure'

export interface TunnelSettings {
  /** Air speed, km/h. */
  speed: number
  /** Rear wing open (DRS) / 2026 straight-line mode (front + rear flaps open). */
  drs: boolean
  /** Static ride height at the plank, mm. */
  rideHeight: number
  showVortices: boolean
  showDirtyAir: boolean
  /** Distance to the following car, m. */
  followDistance: number
  display: FlowDisplay
  colorBy: ColorBy
  /** Pauses particle advection. */
  paused: boolean
}

interface TunnelState extends TunnelSettings {
  set: (patch: Partial<TunnelSettings>) => void
  reset: () => void
}

export const TUNNEL_DEFAULTS: TunnelSettings = {
  speed: 250,
  drs: false,
  rideHeight: 30,
  showVortices: false,
  showDirtyAir: false,
  followDistance: 15,
  display: 'both',
  colorBy: 'speed',
  paused: false,
}

export const useTunnelStore = create<TunnelState>((set) => ({
  ...TUNNEL_DEFAULTS,
  set: (patch) => set(patch),
  reset: () => set(TUNNEL_DEFAULTS),
}))

/* Camera presets of the wind tunnel */
export type TunnelView = 'trois-quarts' | 'profil' | 'dessus' | 'arriere' | 'dessous'

export const useTunnelView = create<{ view: TunnelView; token: number; go: (v: TunnelView) => void }>((set) => ({
  view: 'trois-quarts',
  token: 0,
  go: (view) => set((s) => ({ view, token: s.token + 1 })),
}))
