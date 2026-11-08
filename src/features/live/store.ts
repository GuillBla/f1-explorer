import { create } from 'zustand'

export type Speed = 1 | 5 | 20

interface ReplayState {
  /** true = replay mode: every view is pinned on `t`. */
  replay: boolean
  playing: boolean
  speed: Speed
  /** Replay time (epoch ms). */
  t: number
  /** "Now" for the live/final mode, refreshed by the poller (epoch ms). */
  now: number
  start: (t: number) => void
  stop: () => void
  setPlaying: (p: boolean) => void
  setSpeed: (s: Speed) => void
  seek: (t: number) => void
  setNow: (t: number) => void
}

export const useReplay = create<ReplayState>((set) => ({
  replay: false,
  playing: false,
  speed: 5,
  t: 0,
  now: Date.now(),
  start: (t) => set({ replay: true, playing: true, t }),
  stop: () => set({ replay: false, playing: false }),
  setPlaying: (playing) => set({ playing }),
  setSpeed: (speed) => set({ speed }),
  seek: (t) => set({ t }),
  setNow: (now) => set({ now }),
}))
