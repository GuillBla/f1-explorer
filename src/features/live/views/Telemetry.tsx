import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useCarData, useLaps } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import { completed, indexLaps, type LapX } from '../lib/derive'
import type { CarData } from '../lib/api'
import { lapTime, ms, teamColor } from '../lib/format'
import { axisProps, gridProps, tooltipProps } from '../components/chart'

interface Pt { d: number; speed: number; throttle: number; brake: number; gear: number; drs: number | null }

/** Integrates speed over time to get the distance (m) since the start of the lap. */
function withDistance(samples: CarData[]): Pt[] {
  const s = [...samples].sort((a, b) => ms(a.date) - ms(b.date))
  let d = 0
  return s.map((p, i) => {
    if (i > 0) d += ((p.speed + s[i - 1].speed) / 2 / 3.6) * ((ms(p.date) - ms(s[i - 1].date)) / 1000)
    return { d: Math.round(d), speed: p.speed, throttle: p.throttle, brake: p.brake, gear: p.n_gear, drs: p.drs }
  })
}

const selectCls = 'rounded-md border border-border bg-surface-2 px-2 py-1 text-sm min-w-0'

function useLapChoice(lapsBy: Map<number, LapX[]>, t: number, initialDriver?: number) {
  const [driver, setDriver] = useState<number | undefined>(undefined)
  const [lapNo, setLapNo] = useState<number | undefined>(undefined)
  const n = driver ?? initialDriver
  const options = useMemo(
    () => completed(lapsBy.get(n ?? -1), t).filter((l) => l.lap_duration != null && l.date_start),
    [lapsBy, n, t],
  )
  const fastest = options.reduce<LapX | undefined>((b, l) => (!b || l.lap_duration! < b.lap_duration! ? l : b), undefined)
  const lap = options.find((l) => l.lap_number === lapNo) ?? fastest
  return {
    driver: n, lap, options, fastest,
    setDriver: (d: number) => { setDriver(d); setLapNo(undefined) },
    setLapNo,
  }
}

export default function Telemetry() {
  const { drivers, driverMap } = useLive()
  const t = useViewTime(10_000)
  const laps = useLaps()
  const lapsBy = useMemo(() => indexLaps(laps.data ?? []), [laps.data])
  const ranking = useMemo(() => [...lapsBy.entries()]
    .map(([n, a]) => [n, Math.min(...a.map((l) => l.lap_duration ?? 1e9))] as const)
    .sort((a, b) => a[1] - b[1]).map(([n]) => n), [lapsBy])

  const A = useLapChoice(lapsBy, t, ranking[0])
  const B = useLapChoice(lapsBy, t, ranking[1])
  const qa = useCarData(A.lap)
  const qb = useCarData(B.lap)
  const da = useMemo(() => withDistance(qa.data ?? []), [qa.data])
  const db = useMemo(() => withDistance(qb.data ?? []), [qb.data])

  if (laps.isLoading) return <Loader />
  if (laps.error) return <ErrorState error={laps.error} onRetry={() => laps.refetch()} />

  const ca = teamColor(driverMap.get(A.driver ?? -1)?.team_colour)
  const cbRaw = teamColor(driverMap.get(B.driver ?? -1)?.team_colour)
  const sameColor = ca === cbRaw
  const hasDrs = [...da, ...db].some((p) => p.drs != null)
  const series = [
    { key: 'A', data: da, color: ca, dash: undefined, name: driverMap.get(A.driver ?? -1)?.name_acronym ?? 'A' },
    { key: 'B', data: db, color: cbRaw, dash: sameColor ? '5 3' : undefined, name: driverMap.get(B.driver ?? -1)?.name_acronym ?? 'B' },
  ]
  const maxD = Math.max(0, ...da.map((p) => p.d), ...db.map((p) => p.d))

  const panels: { field: keyof Pt; label: string; h: string; domain?: [number, number]; step?: boolean; unit: string }[] = [
    { field: 'speed', label: 'Vitesse (km/h)', h: 'h-56', unit: ' km/h' },
    { field: 'throttle', label: 'Accélérateur (%)', h: 'h-32', domain: [0, 100], unit: ' %' },
    { field: 'brake', label: 'Frein', h: 'h-24', domain: [0, 100], step: true, unit: '' },
    { field: 'gear', label: 'Rapport', h: 'h-32', domain: [0, 8], step: true, unit: '' },
    ...(hasDrs ? [{ field: 'drs' as const, label: 'DRS (code OpenF1)', h: 'h-24', step: true, unit: '' }] : []),
  ]

  const picker = (label: string, c: ReturnType<typeof useLapChoice>, color: string) => (
    <div className="flex flex-wrap items-center gap-2">
      <span className="h-3 w-3 rounded-full" style={{ background: color }} />
      <span className="text-xs font-bold uppercase text-muted">{label}</span>
      <select aria-label={`Pilote ${label}`} className={selectCls} value={c.driver ?? ''} onChange={(e) => c.setDriver(Number(e.target.value))}>
        {drivers.map((d) => <option key={d.driver_number} value={d.driver_number}>{d.name_acronym} — {d.full_name}</option>)}
      </select>
      <select aria-label={`Tour ${label}`} className={selectCls} value={c.lap?.lap_number ?? ''} onChange={(e) => c.setLapNo(Number(e.target.value))}>
        {!c.options.length && <option value="">Aucun tour</option>}
        {c.options.map((l) => (
          <option key={l.lap_number} value={l.lap_number}>
            Tour {l.lap_number} · {lapTime(l.lap_duration)}{l === c.fastest ? ' ★' : ''}
          </option>
        ))}
      </select>
    </div>
  )

  const delta = A.lap?.lap_duration != null && B.lap?.lap_duration != null ? B.lap.lap_duration - A.lap.lap_duration : null

  return (
    <Card title="Télémétrie — comparaison sur un tour">
      <div className="mb-4 grid gap-3 md:grid-cols-2">
        {picker('Pilote 1', A, ca)}
        {picker('Pilote 2', B, cbRaw)}
      </div>
      {delta != null && (
        <p className="mb-3 text-sm">
          <span className="font-bold">{series[0].name}</span> {lapTime(A.lap!.lap_duration)} ·{' '}
          <span className="font-bold">{series[1].name}</span> {lapTime(B.lap!.lap_duration)} ·{' '}
          <span className="font-mono text-muted">écart {delta >= 0 ? '+' : ''}{delta.toFixed(3)} s</span>
        </p>
      )}
      {(qa.error || qb.error) && <ErrorState error={qa.error ?? qb.error} onRetry={() => { qa.refetch(); qb.refetch() }} />}
      {(qa.isLoading || qb.isLoading) ? <Loader label="Chargement de la télémétrie…" /> : !maxD ? (
        <p className="py-10 text-center text-muted">Pas de télémétrie pour ces tours.</p>
      ) : (
        <div className="grid gap-2">
          {panels.map((p) => (
            <div key={p.field}>
              <p className="text-xs font-semibold text-muted">{p.label}</p>
              <div className={p.h}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart syncId="telemetry" margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid {...gridProps} />
                    <XAxis dataKey="d" type="number" domain={[0, maxD]} allowDuplicatedCategory={false} {...axisProps}
                      tickFormatter={(v: number) => `${(v / 1000).toFixed(1)} km`} hide={p.field !== panels.at(-1)!.field} />
                    <YAxis domain={p.domain ?? ['auto', 'auto']} width={40} {...axisProps} />
                    <Tooltip {...tooltipProps} labelFormatter={(l) => `${l} m`}
                      formatter={(v, name) => [`${v}${p.unit}`, name]} />
                    {series.map((s) => (
                      <Line key={s.key} data={s.data} dataKey={p.field} name={s.name} stroke={s.color} strokeDasharray={s.dash}
                        strokeWidth={1.5} dot={false} type={p.step ? 'stepAfter' : 'linear'} isAnimationActive={false} />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
          {!hasDrs && <p className="text-xs text-muted">DRS : aucune donnée pour ces tours (champ vide dans OpenF1, ex. saison 2026 sans DRS).</p>}
          <p className="text-xs text-muted">Distance estimée en intégrant la vitesse (échantillonnage ≈ 4 Hz). Frein : 0 / 100 (binaire dans OpenF1).</p>
        </div>
      )}
    </Card>
  )
}
