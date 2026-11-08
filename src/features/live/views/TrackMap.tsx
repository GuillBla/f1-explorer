import { useMemo } from 'react'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useLapLocations, useLaps, useLocationsAt, usePositions } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import { useReplay } from '../store'
import { latestPerDriver, sortByDate } from '../lib/derive'
import type { Lap, Location } from '../lib/api'
import { ms, teamColor } from '../lib/format'

const valid = (p: Location) => !(p.x === 0 && p.y === 0)

/** Reference lap for the outline: fastest clean lap of the session. */
function pickReferenceLap(laps: Lap[]) {
  let best: Lap | undefined
  for (const l of laps) {
    if (!l.date_start || l.lap_duration == null || l.is_pit_out_lap) continue
    if (!best || l.lap_duration < best.lap_duration!) best = l
  }
  return best
}

export default function TrackMap() {
  const { driverMap, status } = useLive()
  const replay = useReplay((s) => s.replay)
  const speed = useReplay((s) => s.speed)
  const t = useViewTime(250)
  const laps = useLaps()
  const positions = usePositions()
  const refLap = useMemo(() => pickReferenceLap(laps.data ?? []), [laps.data])
  const outline = useLapLocations(refLap)
  const cars = useLocationsAt(t, replay ? speed : 1, true)

  const geo = useMemo(() => {
    const pts = (outline.data ?? []).filter(valid)
    if (pts.length < 10) return null
    const xs = pts.map((p) => p.x)
    const ys = pts.map((p) => p.y)
    const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys)
    const size = Math.max(maxX - minX, maxY - minY)
    const pad = size * 0.06
    // SVG y axis points down: flip y.
    const P = (x: number, y: number) => [x - minX + pad, maxY - y + pad] as const
    const d = pts.map((p, i) => { const [x, y] = P(p.x, p.y); return `${i ? 'L' : 'M'}${x.toFixed(0)},${y.toFixed(0)}` }).join(' ') + ' Z'
    return { d, P, w: maxX - minX + 2 * pad, h: maxY - minY + 2 * pad, size }
  }, [outline.data])

  const byDriver = useMemo(() => {
    const m = new Map<number, Location[]>()
    for (const p of sortByDate((cars.data ?? []).filter(valid))) {
      const arr = m.get(p.driver_number) ?? []
      arr.push(p)
      m.set(p.driver_number, arr)
    }
    return m
  }, [cars.data])

  const posSorted = useMemo(() => sortByDate(positions.data ?? []), [positions.data])
  const order = useMemo(() => latestPerDriver(posSorted, t), [posSorted, t])

  const dots = useMemo(() => {
    const out: { n: number; x: number; y: number }[] = []
    for (const [n, arr] of byDriver) {
      let i = -1
      for (let k = 0; k < arr.length; k++) { if (ms(arr[k].date) <= t) i = k; else break }
      if (i < 0) continue
      const a = arr[i], b = arr[i + 1]
      let x = a.x, y = a.y
      if (b) {
        const ta = ms(a.date), tb = ms(b.date)
        const f = tb > ta ? Math.min(1, (t - ta) / (tb - ta)) : 0
        x = a.x + (b.x - a.x) * f
        y = a.y + (b.y - a.y) * f
      }
      out.push({ n, x, y })
    }
    // Leader drawn last (on top).
    return out.sort((p, q) => (order.get(q.n)?.position ?? 99) - (order.get(p.n)?.position ?? 99))
  }, [byDriver, t, order])

  if (laps.isLoading || outline.isLoading) return <Loader label="Construction du tracé…" />
  if (outline.error) return <ErrorState error={outline.error} onRetry={() => outline.refetch()} />
  if (!geo) return <Card><p className="text-muted">Tracé indisponible pour cette session (pas de données de position).</p></Card>

  const r = geo.size * 0.012
  return (
    <Card title="Carte du circuit">
      {!replay && status === 'finished' && (
        <p className="mb-2 text-sm text-muted">Positions en fin de session. Lancez le replay pour voir les voitures se déplacer.</p>
      )}
      {replay && speed === 20 && (
        <p className="mb-2 text-xs text-muted">Vitesse x20 : positions échantillonnées (fenêtres de 20 s) pour limiter les requêtes.</p>
      )}
      {cars.error && <ErrorState error={cars.error} onRetry={() => cars.refetch()} />}
      <div className="relative mx-auto w-full max-w-3xl">
        <svg viewBox={`0 0 ${geo.w} ${geo.h}`} className="h-auto w-full" role="img" aria-label="Positions des voitures sur le circuit">
          <path d={geo.d} fill="none" stroke="var(--color-surface-2)" strokeWidth={geo.size * 0.03} strokeLinejoin="round" />
          <path d={geo.d} fill="none" stroke="var(--color-border)" strokeWidth={geo.size * 0.006} strokeLinejoin="round" />
          {dots.map(({ n, x, y }) => {
            const [cx, cy] = geo.P(x, y)
            const d = driverMap.get(n)
            return (
              <g key={n}>
                <title>{d?.full_name ?? `#${n}`}{order.get(n) ? ` · P${order.get(n)!.position}` : ''}</title>
                <circle cx={cx} cy={cy} r={r} fill={teamColor(d?.team_colour)} stroke="var(--color-bg)" strokeWidth={r * 0.35} />
                <text x={cx + r * 1.4} y={cy + r * 0.5} fontSize={r * 1.6} fontWeight={700} fill="var(--color-text)"
                  stroke="var(--color-bg)" strokeWidth={r * 0.4} paintOrder="stroke">
                  {d?.name_acronym ?? n}
                </text>
              </g>
            )
          })}
        </svg>
        {cars.isFetching && !cars.data && <div className="absolute inset-0"><Loader label="Positions…" /></div>}
      </div>
      {!dots.length && !cars.isFetching && (
        <p className="mt-2 text-center text-sm text-muted">Aucune voiture en piste à cet instant.</p>
      )}
      <p className="mt-2 text-xs text-muted">
        Tracé construit à partir du meilleur tour de {refLap ? driverMap.get(refLap.driver_number)?.name_acronym : '—'} (tour {refLap?.lap_number}).
      </p>
    </Card>
  )
}
