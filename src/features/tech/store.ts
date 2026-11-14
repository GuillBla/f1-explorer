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
  /** Selected sub-component of the selected part (e.g. 'fw.flap1'), see content/parts.ts SUBS. */
  sub: string | null
  /** Hovered sub-component (of `hovered`). */
  hoveredSub: string | null
  /** Isolation mode: everything but the selection fades out. */
  isolate: boolean
  /** 2026 active aero: Z = corner mode (flaps closed, max downforce), X = straight-line mode (flaps open). */
  aeroMode: 'Z' | 'X'
  /** Demo speed of the explorer car, km/h (wheel rotation). */
  demoSpeed: number
  /** Front wheel steering angle, degrees (+ = left turn). */
  steer: number
  setHovered: (id: PartId | null, sub?: string | null) => void
  select: (id: PartId | null) => void
  selectSub: (id: PartId, sub: string | null) => void
  toggleExploded: () => void
  toggleXray: () => void
  toggleAutoRotate: () => void
  toggleIsolate: () => void
  setAeroMode: (m: 'Z' | 'X') => void
  setDemo: (patch: { demoSpeed?: number; steer?: number }) => void
  resetView: () => void
}

export const useExplorerStore = create<ExplorerState>((set) => ({
  hovered: null,
  selected: null,
  exploded: false,
  xray: false,
  autoRotate: false,
  resetToken: 0,
  sub: null,
  hoveredSub: null,
  isolate: false,
  aeroMode: 'Z',
  demoSpeed: 0,
  steer: 0,
  setHovered: (hovered, sub) => set({ hovered, hoveredSub: hovered ? (sub ?? null) : null }),
  select: (selected) => set({ selected, sub: null, autoRotate: false }),
  selectSub: (selected, sub) => set({ selected, sub, autoRotate: false }),
  toggleExploded: () => set((s) => ({ exploded: !s.exploded })),
  toggleXray: () => set((s) => ({ xray: !s.xray })),
  toggleAutoRotate: () => set((s) => ({ autoRotate: !s.autoRotate })),
  toggleIsolate: () => set((s) => ({ isolate: !s.isolate })),
  setAeroMode: (aeroMode) => set({ aeroMode }),
  setDemo: (patch) => set(patch),
  resetView: () => set((s) => ({ selected: null, sub: null, resetToken: s.resetToken + 1 })),
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
