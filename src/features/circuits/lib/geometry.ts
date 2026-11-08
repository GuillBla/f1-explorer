/**
 * Track geometry helpers (pure, no DOM / d3 dependency).
 * Resampling, curvature, a simple quasi-static lap-speed model and corner detection.
 *
 * The speed model is a pedagogical estimate (lateral-grip limited corner speed +
 * forward/backward acceleration passes), NOT telemetry.
 */

export type LonLat = [number, number]

export interface TrackSample {
  /** lon/lat of the sample (for projection) */
  ll: LonLat
  /** local metric coordinates (x east, y north) */
  x: number
  y: number
  /** distance from the start line, metres */
  s: number
  /** signed curvature 1/m (positive = left turn) */
  k: number
  /** estimated speed, m/s */
  v: number
}

export interface TrackModel {
  samples: TrackSample[]
  /** total length in metres (geometry, may differ slightly from the official length) */
  length: number
  /** estimated lap time in seconds (model) */
  lapTime: number
  /** cumulative time at each sample, seconds */
  t: number[]
  vMax: number
  vMin: number
  /** +1 = clockwise, -1 = anticlockwise, 0 = undetermined (figure-of-eight) */
  rotation: 1 | -1 | 0
}

export interface DetectedCorner {
  /** fraction of lap 0..1 at the apex */
  frac: number
  dir: 'G' | 'D'
  /** minimum estimated speed, km/h */
  vKmh: number
  /** total heading change, degrees */
  angle: number
}

const R_EARTH = 6_371_000

export interface SpeedModelOptions {
  /** top speed m/s */
  vMax?: number
  /** lateral acceleration available, m/s² */
  aLat?: number
  /** braking deceleration, m/s² */
  aBrake?: number
  /** acceleration at low speed, m/s² (decreases linearly to 0 at vMax) */
  aAcc?: number
  /** reverse the polyline (when the source is drawn against the race direction) */
  reverse?: boolean
  /** lap fraction (in source order, after reversal) where the start/finish line is */
  startFrac?: number
}

/** Ensure the ring is open (no duplicated closing point). */
function openRing(coords: LonLat[]): LonLat[] {
  if (coords.length > 2) {
    const a = coords[0], b = coords[coords.length - 1]
    if (a[0] === b[0] && a[1] === b[1]) return coords.slice(0, -1)
  }
  return coords
}

export function buildTrackModel(rawCoords: LonLat[], opts: SpeedModelOptions = {}, step = 5): TrackModel {
  let coords = openRing(rawCoords)
  if (opts.reverse) coords = [coords[0], ...coords.slice(1).reverse()]
  const n0 = coords.length
  const lat0 = (coords.reduce((a, c) => a + c[1], 0) / n0) * Math.PI / 180
  const lon0 = coords.reduce((a, c) => a + c[0], 0) / n0
  const latM = coords.reduce((a, c) => a + c[1], 0) / n0
  const toXY = ([lon, lat]: LonLat): [number, number] => [
    ((lon - lon0) * Math.PI / 180) * R_EARTH * Math.cos(lat0),
    ((lat - latM) * Math.PI / 180) * R_EARTH,
  ]
  const pts = coords.map(toXY)

  // cumulative distance on the closed polyline
  const cum: number[] = [0]
  for (let i = 1; i <= n0; i++) {
    const a = pts[i - 1], b = pts[i % n0]
    cum.push(cum[i - 1] + Math.hypot(b[0] - a[0], b[1] - a[1]))
  }
  const total = cum[n0]
  const n = Math.max(50, Math.round(total / step))
  const ds = total / n

  // uniform resampling
  const rx: number[] = [], ry: number[] = [], rll: LonLat[] = []
  let seg = 0
  for (let j = 0; j < n; j++) {
    const s = j * ds
    while (seg < n0 - 1 && cum[seg + 1] < s) seg++
    const a = seg, b = (seg + 1) % n0
    const segLen = cum[seg + 1] - cum[seg] || 1
    const u = (s - cum[seg]) / segLen
    rx.push(pts[a][0] + (pts[b][0] - pts[a][0]) * u)
    ry.push(pts[a][1] + (pts[b][1] - pts[a][1]) * u)
    rll.push([coords[a][0] + (coords[b][0] - coords[a][0]) * u, coords[a][1] + (coords[b][1] - coords[a][1]) * u])
  }

  // move the start to the start/finish line
  if (opts.startFrac) {
    const k0 = Math.round(opts.startFrac * n) % n
    const rotate = <T,>(a: T[]) => {
      const r = [...a.slice(k0), ...a.slice(0, k0)]
      a.splice(0, a.length, ...r)
    }
    rotate(rx); rotate(ry); rotate(rll)
  }

  // circular smoothing of the metric coordinates (removes polyline vertex spikes)
  const smooth = (arr: number[], w: number) => {
    const out = new Array<number>(n)
    for (let i = 0; i < n; i++) {
      let acc = 0
      for (let k = -w; k <= w; k++) acc += arr[(i + k + n) % n]
      out[i] = acc / (2 * w + 1)
    }
    return out
  }
  const w = Math.max(2, Math.round(12 / ds))
  const sx = smooth(smooth(rx, w), w)
  const sy = smooth(smooth(ry, w), w)

  // curvature from heading change over ±h samples
  const h = Math.max(2, Math.round(15 / ds))
  const heading = (i: number) => {
    const a = (i - 1 + n) % n, b = (i + 1) % n
    return Math.atan2(sy[b] - sy[a], sx[b] - sx[a])
  }
  const hd = Array.from({ length: n }, (_, i) => heading(i))
  const k: number[] = new Array(n)
  let turnSum = 0
  for (let i = 0; i < n; i++) {
    let d = hd[(i + h) % n] - hd[(i - h + n) % n]
    while (d > Math.PI) d -= 2 * Math.PI
    while (d < -Math.PI) d += 2 * Math.PI
    k[i] = d / (2 * h * ds)
    let d1 = hd[(i + 1) % n] - hd[i]
    while (d1 > Math.PI) d1 -= 2 * Math.PI
    while (d1 < -Math.PI) d1 += 2 * Math.PI
    turnSum += d1
  }
  const turns = Math.round(turnSum / (2 * Math.PI))
  const rotation: 1 | -1 | 0 = turns === 1 ? -1 : turns === -1 ? 1 : 0

  // speed model
  const vMax = opts.vMax ?? 92 // ~330 km/h
  const aLat = opts.aLat ?? 40
  const aBrake = opts.aBrake ?? 42
  const aAcc = opts.aAcc ?? 13
  const v = k.map((kk) => Math.min(vMax, Math.sqrt(aLat / Math.max(Math.abs(kk), 1e-6))))
  // iterate passes twice to settle the wrap-around
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 1; i <= n; i++) {
      const prev = v[(i - 1) % n], cur = i % n
      const acc = aAcc * Math.max(0.08, 1 - prev / vMax)
      v[cur] = Math.min(v[cur], Math.sqrt(prev * prev + 2 * acc * ds))
    }
    for (let i = n - 1; i >= -1; i--) {
      const cur = (i + n) % n, next = v[(i + 1 + n) % n]
      v[cur] = Math.min(v[cur], Math.sqrt(next * next + 2 * aBrake * ds))
    }
  }
  const t: number[] = [0]
  for (let i = 1; i < n; i++) t.push(t[i - 1] + (2 * ds) / (v[i - 1] + v[i]))
  const lapTime = t[n - 1] + (2 * ds) / (v[n - 1] + v[0])

  const samples: TrackSample[] = rll.map((ll, i) => ({ ll, x: sx[i], y: sy[i], s: i * ds, k: k[i], v: v[i] }))
  return { samples, length: total, lapTime, t, vMax: Math.max(...v), vMin: Math.min(...v), rotation }
}

/** Detect corners as clusters of significant curvature. Useful for automatic markers / analysis. */
export function detectCorners(m: TrackModel, minAngleDeg = 25): DetectedCorner[] {
  const S = m.samples, n = S.length
  const kThr = 1 / 400 // radius < 400 m counts as "turning"
  // start scanning from a straight point so clusters don't wrap
  let start = 0
  while (start < n && Math.abs(S[start].k) > kThr) start++
  const out: DetectedCorner[] = []
  let i = 0
  while (i < n) {
    const idx = (start + i) % n
    if (Math.abs(S[idx].k) <= kThr) { i++; continue }
    const sign = Math.sign(S[idx].k)
    let j = i, angle = 0, apex = idx, vmin = Infinity
    while (j < n) {
      const id = (start + j) % n
      if (Math.abs(S[id].k) <= kThr || Math.sign(S[id].k) !== sign) break
      const ds = m.length / n
      angle += S[id].k * ds
      if (S[id].v < vmin) { vmin = S[id].v; apex = id }
      j++
    }
    const deg = Math.abs(angle) * 180 / Math.PI
    if (deg >= minAngleDeg) out.push({ frac: apex / n, dir: sign > 0 ? 'G' : 'D', vKmh: Math.round(vmin * 3.6), angle: Math.round(deg) })
    i = j
  }
  return out.sort((a, b) => a.frac - b.frac)
}

/** Index of the sample closest to a lap fraction. */
export function sampleAt(m: TrackModel, frac: number) {
  const n = m.samples.length
  return ((Math.round(frac * n) % n) + n) % n
}

/** Lowest speed (km/h) within ±window metres around a lap fraction. */
export function minSpeedAround(m: TrackModel, frac: number, windowM = 60) {
  const n = m.samples.length
  const c = sampleAt(m, frac)
  const w = Math.round(windowM / (m.length / n))
  let vmin = Infinity
  for (let k = -w; k <= w; k++) vmin = Math.min(vmin, m.samples[(c + k + n) % n].v)
  return vmin * 3.6
}

/** Rough gear estimate from speed for a modern F1 car (8 gears). Pedagogical only. */
export function estimateGear(kmh: number) {
  const thresholds = [0, 85, 120, 150, 185, 220, 255, 290]
  let g = 1
  for (let i = 0; i < thresholds.length; i++) if (kmh >= thresholds[i]) g = i + 1
  return g
}

/** Long low-curvature stretches (candidate straights), sorted by length desc. */
export function findStraights(m: TrackModel, minLen = 300) {
  const S = m.samples, n = S.length, ds = m.length / n
  const kThr = 1 / 700
  let start = 0
  while (start < n && Math.abs(S[start].k) < kThr) start++
  if (start >= n) return [{ from: 0, to: 1, length: m.length }]
  const out: { from: number; to: number; length: number }[] = []
  let i = 0
  while (i < n) {
    const idx = (start + i) % n
    if (Math.abs(S[idx].k) >= kThr) { i++; continue }
    let j = i
    while (j < n && Math.abs(S[(start + j) % n].k) < kThr) j++
    const len = (j - i) * ds
    if (len >= minLen) out.push({ from: idx / n, to: ((start + j) % n) / n, length: len })
    i = j
  }
  return out.sort((a, b) => b.length - a.length)
}
