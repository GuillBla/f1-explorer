import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { geoMercator } from 'd3-geo'
import { select } from 'd3-selection'
import 'd3-transition'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { interpolateTurbo } from 'd3-scale-chromatic'
import { Pause, Play, RotateCcw } from 'lucide-react'
import type { CircuitInfo, CornerInfo } from '../data/types'
import type { TrackFeature } from '../lib/data'
import { detectCorners, estimateGear, findStraights, minSpeedAround, sampleAt, type TrackModel } from '../lib/geometry'
import { fmtLapTime, SECTOR_COLORS } from '../lib/format'

const W = 800, H = 560, PAD = 48
type Pt = [number, number]
type ColorMode = 'sectors' | 'speed'

interface Marker {
  key: string
  corner?: CornerInfo
  idx: number
  /** marker position (offset outside the curve) */
  m: Pt
  /** point on the track */
  p: Pt
  vKmh: number
  dir: 'G' | 'D' | null
}

function polyline(pts: Pt[], from: number, to: number) {
  const n = pts.length
  let d = ''
  for (let i = from; i <= to; i++) {
    const p = pts[i % n]
    d += `${i === from ? 'M' : 'L'}${p[0].toFixed(1)},${p[1].toFixed(1)}`
  }
  return d
}

export function TrackMap({ info, model, feature }: { info: CircuitInfo; model: TrackModel; feature: TrackFeature }) {
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [zt, setZt] = useState<ZoomTransform>(zoomIdentity)
  const [hover, setHover] = useState<Marker | null>(null)
  const [mode, setMode] = useState<ColorMode>('sectors')
  const [showAuto, setShowAuto] = useState(false)

  // ---- geometry (memoised) ----
  const pts = useMemo<Pt[]>(() => {
    const proj = geoMercator().fitExtent([[PAD, PAD], [W - PAD, H - PAD]], feature)
    return model.samples.map((s) => (proj(s.ll) ?? [0, 0]) as Pt)
  }, [model, feature])
  const n = pts.length

  const fullPath = useMemo(() => polyline(pts, 0, n), [pts, n])
  const sectorPaths = useMemo(() => [0, 1, 2].map((s) => polyline(pts, Math.floor((s * n) / 3), Math.floor(((s + 1) * n) / 3))), [pts, n])
  const speedSegments = useMemo(() => {
    const out: { d: string; c: string }[] = []
    const step = 4
    const span = Math.max(1, model.vMax - model.vMin)
    for (let i = 0; i < n; i += step) {
      const v = model.samples[i].v
      out.push({ d: polyline(pts, i, Math.min(i + step, n)), c: interpolateTurbo(0.1 + 0.8 * ((v - model.vMin) / span)) })
    }
    return out
  }, [pts, n, model])

  const straights = useMemo(() => {
    const all = findStraights(model, 250)
    const count = info.drsZones2025
    const chosen = count !== undefined ? all.slice(0, count) : all.filter((s) => s.length >= 600).slice(0, 3)
    return chosen.map((s) => {
      const a = Math.round(s.from * n), b = Math.round(s.to * n)
      // keep the zone in the second half of the straight (DRS / straight-line mode opens after the exit)
      const len = (b - a + n) % n
      const start = a + Math.round(len * 0.25)
      return polyline(pts, start, a + len)
    })
  }, [model, info.drsZones2025, pts, n])

  const arrows = useMemo(() => {
    const count = 10
    return Array.from({ length: count }, (_, i) => {
      const idx = Math.floor(((i + 0.5) / count) * n)
      const a = pts[(idx - 2 + n) % n], b = pts[(idx + 2) % n]
      return { p: pts[idx], angle: (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI }
    })
  }, [pts, n])

  const startLine = useMemo(() => {
    const a = pts[n - 2], b = pts[2], p = pts[0]
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0])
    return { p, angle: (ang * 180) / Math.PI }
  }, [pts, n])

  const makeMarker = useCallback((key: string, idx: number, corner?: CornerInfo, dir: 'G' | 'D' | null = null): Marker => {
    const p = pts[idx]
    // place the label outside the curve: away from the centroid of the neighbouring arc
    let cx = 0, cy = 0
    const w = 25
    for (let k = -w; k <= w; k++) { const q = pts[(idx + k + n) % n]; cx += q[0]; cy += q[1] }
    cx /= 2 * w + 1; cy /= 2 * w + 1
    let dx = p[0] - cx, dy = p[1] - cy
    const len = Math.hypot(dx, dy)
    if (len < 0.5) {
      const a = pts[(idx - 2 + n) % n], b = pts[(idx + 2) % n]
      dx = -(b[1] - a[1]); dy = b[0] - a[0]
    }
    const l2 = Math.hypot(dx, dy) || 1
    const off = 20
    const frac = idx / n
    return {
      key, idx, corner, p, dir,
      m: [p[0] + (dx / l2) * off, p[1] + (dy / l2) * off],
      vKmh: Math.round(minSpeedAround(model, frac)),
    }
  }, [pts, n, model])

  const markers = useMemo(() => (info.corners ?? []).map((c, i) => {
    const idx = sampleAt(model, c.frac)
    const k = model.samples[idx].k
    return makeMarker(`c${i}`, idx, c, Math.abs(k) > 1 / 400 ? (k > 0 ? 'G' : 'D') : null)
  }), [info.corners, model, makeMarker])

  const autoMarkers = useMemo(() => detectCorners(model).map((c, i) => makeMarker(`a${i}`, sampleAt(model, c.frac), undefined, c.dir)), [model, makeMarker])

  // ---- zoom / pan ----
  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const z = zoom<SVGSVGElement, unknown>().scaleExtent([1, 8]).on('zoom', (e) => setZt(e.transform))
    zoomRef.current = z
    select(el).call(z).on('dblclick.zoom', null)
    return () => { select(el).on('.zoom', null) }
  }, [])
  const resetZoom = () => { if (svgRef.current && zoomRef.current) select(svgRef.current).transition().duration(300).call(zoomRef.current.transform, zoomIdentity) }
  const k = zt.k

  // ---- lap animation (imperative updates, no React re-render per frame) ----
  const carRef = useRef<SVGCircleElement>(null)
  const haloRef = useRef<SVGCircleElement>(null)
  const speedRef = useRef<HTMLSpanElement>(null)
  const gearRef = useRef<HTMLSpanElement>(null)
  const timeRef = useRef<HTMLSpanElement>(null)
  const cursorRef = useRef<SVGLineElement>(null)
  const [playing, setPlaying] = useState(false)
  const [mult, setMult] = useState(2)
  const tRef = useRef(0)

  const place = useCallback((t: number) => {
    const T = model.t
    const lt = ((t % model.lapTime) + model.lapTime) % model.lapTime
    // binary search for the sample
    let lo = 0, hi = T.length - 1
    while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (T[mid] <= lt) lo = mid; else hi = mid - 1 }
    const i = lo, j = (i + 1) % n
    const tNext = j === 0 ? model.lapTime : T[j]
    const u = Math.min(1, Math.max(0, (lt - T[i]) / Math.max(1e-6, tNext - T[i])))
    const x = pts[i][0] + (pts[j][0] - pts[i][0]) * u
    const y = pts[i][1] + (pts[j][1] - pts[i][1]) * u
    const v = (model.samples[i].v + (model.samples[j].v - model.samples[i].v) * u) * 3.6
    carRef.current?.setAttribute('cx', String(x)); carRef.current?.setAttribute('cy', String(y))
    haloRef.current?.setAttribute('cx', String(x)); haloRef.current?.setAttribute('cy', String(y))
    if (speedRef.current) speedRef.current.textContent = String(Math.round(v))
    if (gearRef.current) gearRef.current.textContent = String(estimateGear(v))
    if (timeRef.current) timeRef.current.textContent = fmtLapTime(lt)
    const cx = ((i + u) / n) * 100
    cursorRef.current?.setAttribute('x1', String(cx)); cursorRef.current?.setAttribute('x2', String(cx))
  }, [model, pts, n])

  useEffect(() => { place(tRef.current) }, [place])

  useEffect(() => {
    if (!playing) return
    let raf = 0
    let last = performance.now()
    const tick = (now: number) => {
      tRef.current += ((now - last) / 1000) * mult
      last = now
      place(tRef.current)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [playing, mult, place])

  const restart = () => { tRef.current = 0; place(0) }

  // mini speed trace (0..100 x, 0..30 y)
  const trace = useMemo(() => {
    const step = Math.max(1, Math.floor(n / 300))
    let d = ''
    for (let i = 0; i < n; i += step) {
      const x = (i / n) * 100
      const y = 30 - ((model.samples[i].v - model.vMin) / Math.max(1, model.vMax - model.vMin)) * 28 - 1
      d += `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`
    }
    return d
  }, [model, n])

  const tip = hover
  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-xl border border-border bg-bg">
        <style>{`@keyframes circuits-flow { to { stroke-dashoffset: -32; } } .circuits-flow { animation: circuits-flow 1.2s linear infinite; } @media (prefers-reduced-motion: reduce) { .circuits-flow { animation: none; } }`}</style>
        <svg
          ref={svgRef}
          viewBox={`0 0 ${W} ${H}`}
          className="block h-auto w-full touch-none select-none cursor-grab active:cursor-grabbing"
          role="img"
          aria-label={`Tracé de ${info.name}`}
        >
          <g transform={zt.toString()}>
            {/* base */}
            <path d={fullPath} fill="none" className="stroke-surface-2" strokeWidth={14 / Math.sqrt(k)} strokeLinejoin="round" strokeLinecap="round" />
            {mode === 'sectors'
              ? sectorPaths.map((d, i) => (
                <path key={i} d={d} fill="none" stroke={SECTOR_COLORS[i]} strokeWidth={5 / Math.sqrt(k)} strokeLinejoin="round" strokeLinecap="round" />
              ))
              : speedSegments.map((s, i) => (
                <path key={i} d={s.d} fill="none" stroke={s.c} strokeWidth={5 / Math.sqrt(k)} strokeLinecap="round" />
              ))}
            {/* straight-line / DRS zones */}
            {straights.map((d, i) => (
              <path key={i} d={d} fill="none" className="stroke-accent" strokeOpacity={0.45} strokeWidth={14 / Math.sqrt(k)} strokeLinecap="round" />
            ))}
            {/* animated flow showing the race direction */}
            <path d={fullPath} fill="none" stroke="white" strokeOpacity={0.75} strokeWidth={1.4 / Math.sqrt(k)} strokeDasharray="2 14" className="circuits-flow" />
            {arrows.map((a, i) => (
              <path
                key={i}
                d="M-5,-5 L3,0 L-5,5"
                transform={`translate(${a.p[0]},${a.p[1]}) rotate(${a.angle}) scale(${1 / Math.sqrt(k)})`}
                fill="none" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" opacity={0.9}
              />
            ))}
            {/* start / finish line */}
            <g transform={`translate(${startLine.p[0]},${startLine.p[1]}) rotate(${startLine.angle}) scale(${1 / Math.sqrt(k)})`}>
              {[-3, -1, 1].map((y, r) => [0, 1].map((c) => (
                <rect key={`${r}${c}`} x={-2 + c * 2} y={y * 3 - 3} width={2} height={6} fill={(r + c) % 2 ? '#111' : '#fff'} />
              )))}
              <text x={0} y={-16} textAnchor="middle" fontSize={10} className="fill-text font-bold">DÉPART</text>
            </g>
            {/* auto-detected corners */}
            {showAuto && autoMarkers.map((m) => (
              <circle
                key={m.key} cx={m.p[0]} cy={m.p[1]} r={3.5 / k}
                className="fill-muted stroke-bg cursor-help" strokeWidth={1 / k}
                onMouseEnter={() => setHover(m)} onMouseLeave={() => setHover(null)}
              />
            ))}
            {/* editorial corners */}
            {markers.map((m) => {
              const label = m.corner?.n ?? '•'
              const active = hover?.key === m.key
              const r = (label.length > 2 ? 11 : 9) / k
              return (
                <g
                  key={m.key}
                  className="cursor-help"
                  onMouseEnter={() => setHover(m)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => setHover(m)}
                >
                  <line x1={m.p[0]} y1={m.p[1]} x2={m.m[0]} y2={m.m[1]} className="stroke-muted" strokeWidth={1 / k} />
                  <circle cx={m.m[0]} cy={m.m[1]} r={r} className={active ? 'fill-f1 stroke-text' : 'fill-surface stroke-f1'} strokeWidth={1.5 / k} />
                  <text x={m.m[0]} y={m.m[1]} dy="0.35em" textAnchor="middle" fontSize={(label.length > 2 ? 7 : 9) / k} className="fill-text font-bold pointer-events-none">
                    {label}
                  </text>
                  {m.corner && k >= 1.6 && (
                    <text x={m.m[0]} y={m.m[1] + r + 9 / k} textAnchor="middle" fontSize={8 / k} className="fill-muted pointer-events-none">
                      {m.corner.name}
                    </text>
                  )}
                </g>
              )
            })}
            {/* car */}
            <circle ref={haloRef} r={10 / Math.sqrt(k)} className="fill-f1" opacity={0.25} />
            <circle ref={carRef} r={5 / Math.sqrt(k)} className="fill-f1 stroke-white" strokeWidth={1.5 / Math.sqrt(k)} />
          </g>
        </svg>

        <button onClick={resetZoom} className="absolute right-2 top-2 rounded-md border border-border bg-surface/90 p-1.5 text-muted hover:text-text" title="Réinitialiser le zoom">
          <RotateCcw size={14} />
        </button>

        {tip && (
          <div className="pointer-events-none absolute left-2 top-2 max-w-[18rem] rounded-lg border border-border bg-surface/95 p-3 text-sm shadow-xl">
            <p className="font-bold">
              {tip.corner?.n && <span className="mr-1 text-f1">V{tip.corner.n}</span>}
              {tip.corner?.name ?? 'Virage détecté'}
            </p>
            {tip.corner?.desc && <p className="mt-1 text-xs text-muted">{tip.corner.desc}</p>}
            <div className="mt-2 grid grid-cols-3 gap-2 text-center text-xs">
              <div className="rounded bg-surface-2 p-1"><p className="text-muted">Vitesse*</p><p className="font-mono font-bold">≈{tip.vKmh}</p></div>
              <div className="rounded bg-surface-2 p-1"><p className="text-muted">Rapport*</p><p className="font-mono font-bold">{estimateGear(tip.vKmh)}</p></div>
              <div className="rounded bg-surface-2 p-1"><p className="text-muted">Sens</p><p className="font-bold">{tip.dir === 'G' ? 'Gauche' : tip.dir === 'D' ? 'Droite' : '—'}</p></div>
            </div>
            <p className="mt-1 text-[10px] text-muted">* estimations du modèle (km/h), pas de la télémétrie.</p>
          </div>
        )}
      </div>

      {/* lap animation controls */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-3">
        <button
          onClick={() => setPlaying((p) => !p)}
          className="flex items-center gap-1.5 rounded-md bg-f1 px-3 py-1.5 text-sm font-bold text-white"
        >
          {playing ? <Pause size={14} /> : <Play size={14} />} {playing ? 'Pause' : 'Animer un tour'}
        </button>
        <button onClick={restart} className="rounded-md border border-border px-2 py-1.5 text-xs text-muted hover:text-text">Recommencer</button>
        <div className="flex items-center gap-1 text-xs">
          {[1, 2, 4, 8].map((m) => (
            <button key={m} onClick={() => setMult(m)} className={clsx('rounded px-2 py-1 font-mono', mult === m ? 'bg-surface-2 text-text' : 'text-muted')}>×{m}</button>
          ))}
        </div>
        <div className="ml-auto flex items-baseline gap-4 font-mono">
          <span className="text-2xl font-black tabular-nums"><span ref={speedRef}>0</span><span className="ml-1 text-xs text-muted">km/h</span></span>
          <span className="text-lg font-bold tabular-nums"><span className="mr-1 text-xs text-muted">R</span><span ref={gearRef}>1</span></span>
          <span className="text-sm tabular-nums text-muted"><span ref={timeRef}>0:00.000</span> / {fmtLapTime(model.lapTime)}</span>
        </div>
        <svg viewBox="0 0 100 30" preserveAspectRatio="none" className="h-10 w-full" aria-label="Profil de vitesse estimé">
          <path d={trace} fill="none" className="stroke-accent" strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
          <line ref={cursorRef} x1={0} x2={0} y1={0} y2={30} className="stroke-f1" strokeWidth={1.5} vectorEffect="non-scaling-stroke" />
        </svg>
      </div>

      {/* legend / options */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-muted">
        <div className="flex items-center gap-1">
          <button onClick={() => setMode('sectors')} className={clsx('rounded px-2 py-1', mode === 'sectors' ? 'bg-surface-2 text-text' : '')}>Secteurs</button>
          <button onClick={() => setMode('speed')} className={clsx('rounded px-2 py-1', mode === 'speed' ? 'bg-surface-2 text-text' : '')}>Vitesse</button>
        </div>
        {mode === 'sectors' ? (
          SECTOR_COLORS.map((c, i) => (
            <span key={c} className="flex items-center gap-1"><span className="h-1.5 w-4 rounded" style={{ background: c }} /> S{i + 1}</span>
          ))
        ) : (
          <span className="flex items-center gap-1">
            lent <span className="h-1.5 w-16 rounded" style={{ background: `linear-gradient(90deg, ${[0.1, 0.3, 0.5, 0.7, 0.9].map((t) => interpolateTurbo(t)).join(',')})` }} /> rapide
          </span>
        )}
        <span className="flex items-center gap-1"><span className="h-2 w-4 rounded bg-accent/50" /> {info.drsZones2025 !== undefined ? `Zones DRS 2025 (${info.drsZones2025})` : 'Lignes droites principales'}</span>
        <label className="flex cursor-pointer items-center gap-1">
          <input type="checkbox" checked={showAuto} onChange={(e) => setShowAuto(e.target.checked)} className="accent-[var(--color-f1)]" />
          Tous les virages détectés ({autoMarkers.length})
        </label>
      </div>
      <p className="text-[11px] leading-snug text-muted">
        Secteurs indicatifs (tiers de la distance) ; zones de ligne droite placées automatiquement sur les plus longues lignes droites
        (en 2026, le DRS est remplacé par l’aileron actif « mode ligne droite »). Vitesses calculées à partir de la courbure du tracé
        (adhérence latérale ≈ 4 g, freinage ≈ 4,3 g) : ordre de grandeur pédagogique. Molette / pincement pour zoomer, glisser pour déplacer.
      </p>
    </div>
  )
}
