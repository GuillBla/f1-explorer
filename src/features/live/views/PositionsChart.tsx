import { useMemo, useState } from 'react'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useLaps, usePositions } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import { indexLaps, latestAt, sortByDate } from '../lib/derive'
import type { Position } from '../lib/api'
import { teamColor } from '../lib/format'
import { dashMap, DriverChips } from '../components/Driver'
import { axisProps, gridProps, tooltipProps } from '../components/chart'

export default function PositionsChart() {
  const { drivers, driverMap } = useLive()
  const t = useViewTime(5000)
  const laps = useLaps()
  const positions = usePositions()
  const [focus, setFocus] = useState<number[]>([])
  const dash = dashMap(drivers)

  const data = useMemo(() => {
    const posBy = new Map<number, Position[]>()
    for (const p of sortByDate(positions.data ?? [])) {
      const arr = posBy.get(p.driver_number) ?? []
      arr.push(p)
      posBy.set(p.driver_number, arr)
    }
    const rows = new Map<number, Record<string, number>>()
    for (const [n, arr] of indexLaps(laps.data ?? [])) {
      const pp = posBy.get(n)
      if (!pp) continue
      // Lap 0 = position at the start of lap 1 (grid).
      const first = arr.find((l) => l.lap_number === 1)
      if (first && Number.isFinite(first.start) && first.start <= t) {
        const p = latestAt(pp, first.start) ?? pp[0]
        const row = rows.get(0) ?? { lap: 0 }
        row[String(n)] = p.position
        rows.set(0, row)
      }
      for (const l of arr) {
        if (!Number.isFinite(l.end) || l.end > t) continue
        const p = latestAt(pp, l.end)
        if (!p) continue
        const row = rows.get(l.lap_number) ?? { lap: l.lap_number }
        row[String(n)] = p.position
        rows.set(l.lap_number, row)
      }
    }
    return [...rows.values()].sort((a, b) => a.lap - b.lap)
  }, [laps.data, positions.data, t])

  if (laps.isLoading || positions.isLoading) return <Loader />
  if (positions.error) return <ErrorState error={positions.error} onRetry={() => positions.refetch()} />

  const toggle = (n: number) => setFocus((f) => (f.includes(n) ? f.filter((x) => x !== n) : [...f, n]))
  const active = (n: number) => !focus.length || focus.includes(n)

  return (
    <Card title="Positions au fil des tours">
      <div className="mb-3">
        <p className="mb-2 text-xs text-muted">Cliquez sur des pilotes pour les mettre en évidence.</p>
        <DriverChips drivers={drivers} selected={focus} onToggle={toggle} />
      </div>
      {data.length < 2 ? (
        <p className="py-10 text-center text-muted">Pas assez de tours bouclés pour tracer l’évolution.</p>
      ) : (
        <div className="h-[28rem]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="lap" type="number" domain={['dataMin', 'dataMax']} allowDecimals={false} {...axisProps} />
              <YAxis reversed domain={[1, Math.max(20, drivers.length)]} ticks={[1, 5, 10, 15, 20]} allowDecimals={false} width={28} {...axisProps} />
              <Tooltip {...tooltipProps} labelFormatter={(l) => (l === 0 ? 'Départ' : `Tour ${l}`)}
                itemSorter={(it) => Number(it.value)}
                formatter={(v, name) => [`P${v}`, driverMap.get(Number(name))?.name_acronym ?? name]} />
              {drivers.map((d) => (
                <Line key={d.driver_number} dataKey={String(d.driver_number)} name={String(d.driver_number)}
                  stroke={teamColor(d.team_colour)} strokeWidth={active(d.driver_number) ? 2 : 1}
                  strokeOpacity={active(d.driver_number) ? 1 : 0.15} strokeDasharray={dash.get(d.driver_number) ? '5 3' : undefined}
                  dot={false} connectNulls isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}
