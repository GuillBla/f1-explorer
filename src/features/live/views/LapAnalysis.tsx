import { useMemo, useState } from 'react'
import {
  Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useLaps } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import { completed, indexLaps, median, type LapX } from '../lib/derive'
import { lapTime, teamColor } from '../lib/format'
import { dashMap, DriverChips, DriverLabel } from '../components/Driver'
import { axisProps, gridProps, tooltipProps } from '../components/chart'

const PURPLE = '#b44dff'
type SectorKey = 'duration_sector_1' | 'duration_sector_2' | 'duration_sector_3'
const SECTORS: SectorKey[] = ['duration_sector_1', 'duration_sector_2', 'duration_sector_3']

const minOf = (xs: (number | null | undefined)[]) => {
  const v = xs.filter((x): x is number => x != null)
  return v.length ? Math.min(...v) : null
}

export default function LapAnalysis() {
  const { drivers, driverMap } = useLive()
  const t = useViewTime(5000)
  const laps = useLaps()
  const lapsBy = useMemo(() => indexLaps(laps.data ?? []), [laps.data])
  const done = useMemo(() => {
    const m = new Map<number, LapX[]>()
    for (const [n, arr] of lapsBy) m.set(n, completed(arr, t))
    return m
  }, [lapsBy, t])

  // Default selection: 3 fastest drivers of the session.
  const fastest = useMemo(() => {
    return [...lapsBy.entries()]
      .map(([n, arr]) => [n, minOf(arr.map((l) => l.lap_duration)) ?? 1e9] as const)
      .sort((a, b) => a[1] - b[1]).slice(0, 3).map(([n]) => n)
  }, [lapsBy])
  const [picked, setPicked] = useState<number[] | null>(null)
  const selected = picked ?? fastest
  const toggle = (n: number) =>
    setPicked(selected.includes(n) ? selected.filter((x) => x !== n) : [...selected, n])
  const [hideSlow, setHideSlow] = useState(true)
  const dash = dashMap(drivers)

  const chart = useMemo(() => {
    const all = [...done.values()].flat().map((l) => l.lap_duration).filter((x): x is number => x != null)
    const cutoff = median(all) * 1.07
    const rows = new Map<number, Record<string, number>>()
    for (const n of selected) {
      for (const l of done.get(n) ?? []) {
        if (l.lap_duration == null) continue
        if (hideSlow && (l.is_pit_out_lap || l.lap_duration > cutoff)) continue
        const row = rows.get(l.lap_number) ?? { lap: l.lap_number }
        row[String(n)] = l.lap_duration
        rows.set(l.lap_number, row)
      }
    }
    return [...rows.values()].sort((a, b) => a.lap - b.lap)
  }, [done, selected, hideSlow])

  const sectors = useMemo(() => {
    const best = SECTORS.map((k) => minOf([...done.values()].flat().map((l) => l[k])))
    const rows = selected.map((n) => {
      const ls = done.get(n) ?? []
      const s = SECTORS.map((k) => minOf(ls.map((l) => l[k])))
      const ideal = s.every((x) => x != null) ? s.reduce((a, b) => a! + b!, 0)! : null
      return { n, s, ideal, bestLap: minOf(ls.map((l) => l.lap_duration)) }
    })
    const bars = SECTORS.map((_, i) => {
      const row: Record<string, number | string> = { sector: `S${i + 1}` }
      for (const r of rows) if (r.s[i] != null && best[i] != null) row[String(r.n)] = +(r.s[i]! - best[i]!).toFixed(3)
      return row
    })
    return { best, rows, bars }
  }, [done, selected])

  if (laps.isLoading) return <Loader />
  if (laps.error) return <ErrorState error={laps.error} onRetry={() => laps.refetch()} />

  return (
    <div className="grid gap-4">
      <Card title="Temps au tour">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <DriverChips drivers={drivers} selected={selected} onToggle={toggle} />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" checked={hideSlow} onChange={(e) => setHideSlow(e.target.checked)} className="accent-[var(--color-f1)]" />
            Masquer tours lents (stands, SC…)
          </label>
        </div>
        {!selected.length ? (
          <p className="py-10 text-center text-muted">Sélectionnez au moins un pilote.</p>
        ) : !chart.length ? (
          <p className="py-10 text-center text-muted">Aucun tour bouclé à cet instant.</p>
        ) : (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chart} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="lap" type="number" domain={['dataMin', 'dataMax']} {...axisProps} allowDecimals={false} />
                <YAxis {...axisProps} domain={['auto', 'auto']} tickFormatter={(v: number) => lapTime(v)} width={64} />
                <Tooltip {...tooltipProps} labelFormatter={(l) => `Tour ${l}`}
                  formatter={(v, name) => [lapTime(Number(v)), driverMap.get(Number(name))?.name_acronym ?? name]} />
                <Legend formatter={(v) => driverMap.get(Number(v))?.name_acronym ?? v} wrapperStyle={{ fontSize: 12 }} />
                {selected.map((n) => (
                  <Line key={n} dataKey={String(n)} name={String(n)} stroke={teamColor(driverMap.get(n)?.team_colour)}
                    strokeWidth={2} strokeDasharray={dash.get(n) ? '5 3' : undefined} dot={false} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      {selected.length > 0 && (
        <Card title="Secteurs (meilleurs temps)">
          <div className="-mx-4 overflow-x-auto px-4">
            <table className="w-full min-w-[520px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
                  <th className="py-2">Pilote</th>
                  <th className="text-right">S1</th><th className="text-right">S2</th><th className="text-right">S3</th>
                  <th className="text-right">Tour idéal</th><th className="text-right">Meilleur tour</th>
                </tr>
              </thead>
              <tbody>
                {sectors.rows.map((r) => (
                  <tr key={r.n} className="border-b border-border/60 last:border-0">
                    <td className="py-1.5"><DriverLabel driver={driverMap.get(r.n)} number={r.n} /></td>
                    {r.s.map((v, i) => (
                      <td key={i} className="text-right font-mono tabular-nums"
                        style={{ color: v != null && v === sectors.best[i] ? PURPLE : undefined }}>
                        {v != null ? v.toFixed(3) : '—'}
                      </td>
                    ))}
                    <td className="text-right font-mono tabular-nums text-muted">{lapTime(r.ideal)}</td>
                    <td className="text-right font-mono tabular-nums">{lapTime(r.bestLap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mb-2 mt-4 text-xs text-muted">Écart au meilleur secteur de la session (s) — plus court = meilleur</p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sectors.bars} margin={{ top: 4, right: 8, bottom: 0, left: 0 }} barGap={2}>
                <CartesianGrid {...gridProps} />
                <XAxis dataKey="sector" {...axisProps} />
                <YAxis {...axisProps} width={48} />
                <Tooltip {...tooltipProps} cursor={{ fill: 'var(--color-surface-2)' }}
                  formatter={(v, name) => [`+${Number(v).toFixed(3)} s`, driverMap.get(Number(name))?.name_acronym ?? name]} />
                <Legend formatter={(v) => driverMap.get(Number(v))?.name_acronym ?? v} wrapperStyle={{ fontSize: 12 }} />
                {selected.map((n) => (
                  <Bar key={n} dataKey={String(n)} name={String(n)} fill={teamColor(driverMap.get(n)?.team_colour)}
                    radius={[4, 4, 0, 0]} isAnimationActive={false} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}
    </div>
  )
}
