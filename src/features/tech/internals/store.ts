import { useEffect, useState } from 'react'
import { create } from 'zustand'

/**
 * Playback state shared by every "Mécanique" scene: play / pause, slow motion factor,
 * labels and cut-away toggles. Each system keeps its own physical state in a mutable
 * `sim` object advanced by the shell's animation loop (see MechShell).
 */
interface MechState {
  playing: boolean
  /** Time scale, 0.01 (x0,01) … 1 (real time). */
  speed: number
  labels: boolean
  /** Cut-away view (clipping planes on housings). */
  cut: boolean
  set: (patch: Partial<Pick<MechState, 'playing' | 'speed' | 'labels' | 'cut'>>) => void
}

export const useMechStore = create<MechState>((set) => ({
  playing: true,
  speed: 0.05,
  labels: true,
  cut: true,
  set: (patch) => set(patch),
}))

export const SPEED_MIN = 0.01
export const SPEED_MAX = 1

/** Slider position 0..100 <-> logarithmic time scale. */
export const speedFromSlider = (v: number) => SPEED_MIN * Math.pow(SPEED_MAX / SPEED_MIN, v / 100)
export const sliderFromSpeed = (s: number) => (100 * Math.log(s / SPEED_MIN)) / Math.log(SPEED_MAX / SPEED_MIN)

export function fmtSpeed(s: number) {
  const d = s >= 0.1 ? 2 : 3
  return `x${Number(s.toFixed(d)).toLocaleString('fr-FR')}`
}

/** Re-renders the calling component `hz` times per second (used by panels that read a mutable sim). */
export function useTick(hz = 8) {
  const [, setN] = useState(0)
  useEffect(() => {
    const id = window.setInterval(() => setN((n) => (n + 1) % 1_000_000), 1000 / hz)
    return () => window.clearInterval(id)
  }, [hz])
}

/** Small numeric helpers shared by the systems. */
export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t
export const smooth = (t: number) => {
  const x = clamp(t, 0, 1)
  return x * x * (3 - 2 * x)
}
export const fmt = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d })
export const DEG = Math.PI / 180
