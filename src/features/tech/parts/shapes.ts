import { mirrorHalf, smoothClosed, type P2 } from './surface'

/**
 * Cross-section stations of the bodywork (metres). Each family is lofted along X with a spline
 * through the stations (see surface.ts). The numbers are shared with the airflow obstacle model.
 */

/* ------------------------------------------------------------------ */
/* Monocoque and nose                                                  */
/* ------------------------------------------------------------------ */

export interface TubStation extends Record<string, number> {
  x: number
  /** Bottom / top of the section. */
  yb: number
  yt: number
  /** Half widths: bottom corner, top shoulder, maximum (at ym). */
  wb: number
  wt: number
  wm: number
  ym: number
}

/** Nose: high and slim (2026), sitting on the front wing main plane; ends at the front bulkhead. */
export const NOSE: TubStation[] = [
  { x: 2.835, yb: 0.162, yt: 0.2, wb: 0.022, wt: 0.018, wm: 0.026, ym: 0.18 },
  { x: 2.8, yb: 0.15, yt: 0.222, wb: 0.042, wt: 0.034, wm: 0.048, ym: 0.185 },
  { x: 2.7, yb: 0.142, yt: 0.258, wb: 0.062, wt: 0.05, wm: 0.068, ym: 0.196 },
  { x: 2.5, yb: 0.138, yt: 0.31, wb: 0.082, wt: 0.068, wm: 0.088, ym: 0.218 },
  { x: 2.3, yb: 0.135, yt: 0.36, wb: 0.098, wt: 0.083, wm: 0.106, ym: 0.24 },
  { x: 2.15, yb: 0.133, yt: 0.395, wb: 0.108, wt: 0.093, wm: 0.118, ym: 0.26 },
]

/** Survival cell (monocoque): from the front bulkhead to behind the fuel cell. */
export const TUB: TubStation[] = [
  { x: 2.15, yb: 0.133, yt: 0.395, wb: 0.108, wt: 0.093, wm: 0.118, ym: 0.26 },
  { x: 1.95, yb: 0.13, yt: 0.44, wb: 0.122, wt: 0.104, wm: 0.136, ym: 0.285 },
  { x: 1.65, yb: 0.124, yt: 0.505, wb: 0.148, wt: 0.122, wm: 0.168, ym: 0.32 },
  { x: 1.3, yb: 0.108, yt: 0.568, wb: 0.188, wt: 0.148, wm: 0.212, ym: 0.35 },
  { x: 0.95, yb: 0.09, yt: 0.615, wb: 0.228, wt: 0.175, wm: 0.258, ym: 0.375 },
  { x: 0.62, yb: 0.08, yt: 0.645, wb: 0.258, wt: 0.198, wm: 0.288, ym: 0.395 },
  { x: 0.25, yb: 0.078, yt: 0.66, wb: 0.268, wt: 0.214, wm: 0.298, ym: 0.405 },
  { x: -0.05, yb: 0.078, yt: 0.655, wb: 0.268, wt: 0.214, wm: 0.292, ym: 0.405 },
  { x: -0.35, yb: 0.08, yt: 0.6, wb: 0.25, wt: 0.2, wm: 0.27, ym: 0.4 },
]

export function tubSection(s: TubStation): P2[] {
  const h = s.yt - s.yb
  const r = Math.min(0.06, h * 0.22)
  const half: P2[] = [
    [0, s.yt],
    [s.wt - r * 0.7, s.yt - r * 0.06],
    [s.wt, s.yt - r * 0.75],
    [s.wm, s.ym],
    [s.wb, s.yb + r * 0.7],
    [s.wb - r * 0.7, s.yb],
    [0, s.yb],
  ]
  return smoothClosed(mirrorHalf(half), 4)
}

/* ------------------------------------------------------------------ */
/* Sidepods (right side, mirrored)                                     */
/* ------------------------------------------------------------------ */

export interface PodStation extends Record<string, number> {
  x: number
  /** Inner edge (buried in the chassis / engine cover). */
  zi: number
  /** Outer shoulder. */
  zo: number
  /** Top, outer face height, bottom. */
  yt: number
  ym: number
  yb: number
  /** Deepest point of the undercut (z). */
  zu: number
}

/** Deep undercut under the inlet, then a downwash ramp and a tight "coke bottle" towards the gearbox. */
export const POD: PodStation[] = [
  { x: 0.63, zi: 0.2, zo: 0.5, yt: 0.555, ym: 0.44, yb: 0.31, zu: 0.45 },
  { x: 0.55, zi: 0.2, zo: 0.56, yt: 0.58, ym: 0.45, yb: 0.255, zu: 0.45 },
  { x: 0.35, zi: 0.2, zo: 0.588, yt: 0.585, ym: 0.44, yb: 0.17, zu: 0.39 },
  { x: 0.05, zi: 0.2, zo: 0.582, yt: 0.56, ym: 0.405, yb: 0.1, zu: 0.34 },
  { x: -0.3, zi: 0.19, zo: 0.545, yt: 0.515, ym: 0.36, yb: 0.08, zu: 0.31 },
  { x: -0.7, zi: 0.17, zo: 0.47, yt: 0.435, ym: 0.3, yb: 0.08, zu: 0.285 },
  { x: -1.05, zi: 0.15, zo: 0.37, yt: 0.35, ym: 0.24, yb: 0.08, zu: 0.25 },
  { x: -1.35, zi: 0.12, zo: 0.27, yt: 0.275, ym: 0.195, yb: 0.08, zu: 0.2 },
  { x: -1.58, zi: 0.1, zo: 0.19, yt: 0.22, ym: 0.165, yb: 0.085, zu: 0.155 },
]

export function podSection(s: PodStation): P2[] {
  const ctrl: P2[] = [
    [s.zi, s.yt - 0.005],
    [s.zi + (s.zo - s.zi) * 0.55, s.yt],
    [s.zo, s.yt - Math.min(0.06, (s.yt - s.ym) * 0.55)],
    [s.zo + 0.004, s.ym],
    [s.zu, s.yb + (s.ym - s.yb) * 0.42],
    [s.zu - 0.01, s.yb],
    [s.zi, s.yb],
  ]
  return smoothClosed(ctrl, 5)
}

/* ------------------------------------------------------------------ */
/* Engine cover and airbox                                             */
/* ------------------------------------------------------------------ */

export interface CoverStation extends Record<string, number> {
  x: number
  /** Spine (airbox / fin root): top and half width. */
  yt: number
  wt: number
  /** Shoulder over the sidepods. */
  ys: number
  ws: number
  /** Bottom. */
  yb: number
  wb: number
}

export const COVER: CoverStation[] = [
  { x: -0.03, yt: 0.95, wt: 0.08, ys: 0.665, ws: 0.215, yb: 0.42, wb: 0.2 },
  { x: -0.15, yt: 0.975, wt: 0.1, ys: 0.645, ws: 0.245, yb: 0.35, wb: 0.235 },
  { x: -0.4, yt: 0.93, wt: 0.108, ys: 0.6, ws: 0.25, yb: 0.3, wb: 0.23 },
  { x: -0.75, yt: 0.8, wt: 0.1, ys: 0.52, ws: 0.22, yb: 0.25, wb: 0.2 },
  { x: -1.1, yt: 0.665, wt: 0.088, ys: 0.43, ws: 0.17, yb: 0.2, wb: 0.16 },
  { x: -1.45, yt: 0.545, wt: 0.074, ys: 0.365, ws: 0.12, yb: 0.18, wb: 0.12 },
  { x: -1.75, yt: 0.475, wt: 0.06, ys: 0.34, ws: 0.085, yb: 0.2, wb: 0.085 },
  { x: -1.99, yt: 0.45, wt: 0.05, ys: 0.35, ws: 0.06, yb: 0.27, wb: 0.058 },
]

export function coverSection(s: CoverStation): P2[] {
  const half: P2[] = [
    [0, s.yt],
    [s.wt * 0.8, s.yt - 0.008],
    [s.wt * 1.12, s.ys + (s.yt - s.ys) * 0.5],
    [s.ws * 0.92, s.ys + 0.015],
    [s.ws, s.ys - 0.03],
    [s.wb, s.yb + 0.03],
    [0, s.yb],
  ]
  return smoothClosed(mirrorHalf(half), 4)
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Linear interpolation of a station key at position x (clamped). Stations sorted by decreasing x. */
export function at<T extends { x: number }>(st: T[], x: number, key: keyof T): number {
  if (x >= st[0].x) return st[0][key] as number
  for (let i = 1; i < st.length; i++) {
    if (x >= st[i].x) {
      const a = st[i - 1]
      const b = st[i]
      const t = (x - a.x) / (b.x - a.x)
      return (a[key] as number) + ((b[key] as number) - (a[key] as number)) * t
    }
  }
  return st[st.length - 1][key] as number
}

export const clamp01 = (v: number) => Math.min(1, Math.max(0, v))
