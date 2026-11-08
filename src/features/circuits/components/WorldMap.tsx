import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { geoNaturalEarth1, geoPath } from 'd3-geo'
import { select } from 'd3-selection'
import { zoom, zoomIdentity, type ZoomBehavior, type ZoomTransform } from 'd3-zoom'
import { RotateCcw } from 'lucide-react'
import type { JRace } from '@/lib/api'
import { Loader, ErrorState } from '@/components/ui'
import { useWorld } from '../lib/data'
import type { CircuitInfo } from '../data/types'
import { fmtDate, raceDate } from '../lib/format'

const W = 960, H = 500

interface Item { info: CircuitInfo; race?: JRace }

/** World map placing every circuit, with the current calendar linked in round order. */
export function WorldMap({ items, highlight }: { items: Item[]; highlight?: Set<string> }) {
  const world = useWorld()
  const navigate = useNavigate()
  const svgRef = useRef<SVGSVGElement>(null)
  const zoomRef = useRef<ZoomBehavior<SVGSVGElement, unknown> | null>(null)
  const [t, setT] = useState<ZoomTransform>(zoomIdentity)
  const [hover, setHover] = useState<Item | null>(null)

  const projection = useMemo(() => geoNaturalEarth1().fitExtent([[8, 8], [W - 8, H - 8]], { type: 'Sphere' }), [])
  const path = useMemo(() => geoPath(projection), [projection])

  const countries = useMemo(() => world.data?.features.map((f, i) => <path key={i} d={path(f) ?? undefined} />), [world.data, path])
  const sphere = useMemo(() => path({ type: 'Sphere' }) ?? undefined, [path])

  const calendar = useMemo(
    () => items.filter((i) => i.race).sort((a, b) => +a.race!.round - +b.race!.round),
    [items],
  )
  const route = useMemo(() => {
    if (calendar.length < 2) return null
    return path({ type: 'LineString', coordinates: calendar.map((c) => [c.info.lon, c.info.lat]) }) ?? null
  }, [calendar, path])

  useEffect(() => {
    const el = svgRef.current
    if (!el) return
    const z = zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12])
      .translateExtent([[0, 0], [W, H]])
      .on('zoom', (e) => setT(e.transform))
    zoomRef.current = z
    select(el).call(z)
    return () => { select(el).on('.zoom', null) }
  }, [])

  const reset = () => { if (svgRef.current && zoomRef.current) select(svgRef.current).call(zoomRef.current.transform, zoomIdentity) }
  const k = t.k

  return (
    <div className="relative">
      {world.isLoading && <Loader label="Chargement de la carte…" />}
      {world.isError && <ErrorState error={world.error} onRetry={() => world.refetch()} />}
      <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full h-auto touch-none select-none cursor-grab active:cursor-grabbing" role="img" aria-label="Carte du monde des circuits">
        <g transform={t.toString()}>
          <path d={sphere} className="fill-bg stroke-border" strokeWidth={1 / k} />
          <g className="fill-surface-2 stroke-border" strokeWidth={0.5 / k}>{countries}</g>
          {route && (
            <path d={route} fill="none" className="stroke-f1/60" strokeWidth={1.2 / k} strokeDasharray={`${4 / k} ${3 / k}`} />
          )}
          {items.map((it) => {
            const p = projection([it.info.lon, it.info.lat])
            if (!p) return null
            const inCal = !!it.race
            const dim = highlight && !highlight.has(it.info.id)
            return (
              <g
                key={it.info.id}
                transform={`translate(${p[0]},${p[1]})`}
                className="cursor-pointer"
                opacity={dim ? 0.25 : 1}
                onMouseEnter={() => setHover(it)}
                onMouseLeave={() => setHover((h) => (h === it ? null : h))}
                onClick={() => navigate(`/circuits/${it.info.id}`)}
              >
                <circle r={(inCal ? 4.5 : 3) / k} className={inCal ? 'fill-f1 stroke-bg' : 'fill-muted stroke-bg'} strokeWidth={1 / k} />
                {inCal && k >= 2.5 && (
                  <text y={-7 / k} textAnchor="middle" fontSize={9 / k} className="fill-text font-bold pointer-events-none">
                    {it.race!.round}
                  </text>
                )}
              </g>
            )
          })}
        </g>
      </svg>
      <button onClick={reset} className="absolute right-2 top-2 rounded-md border border-border bg-surface/90 p-1.5 text-muted hover:text-text" title="Réinitialiser le zoom">
        <RotateCcw size={14} />
      </button>
      <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-f1" /> Calendrier en cours</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-muted" /> Autres circuits</span>
        <span className="flex items-center gap-1.5"><span className="w-5 border-t border-dashed border-f1" /> Ordre des manches</span>
        <span>Molette / pincement pour zoomer</span>
      </div>
      {hover && (
        <div className="pointer-events-none absolute left-2 top-2 rounded-lg border border-border bg-surface/95 px-3 py-2 text-sm shadow-lg">
          <p className="font-bold">{hover.info.shortName} <span className="font-normal text-muted">· {hover.info.country}</span></p>
          {hover.race ? (
            <p className="text-xs text-muted">Manche {hover.race.round} · {hover.race.raceName} · {fmtDate(raceDate(hover.race))}</p>
          ) : (
            <p className="text-xs text-muted">{hover.info.tagline ?? 'Hors calendrier'}</p>
          )}
        </div>
      )}
    </div>
  )
}
