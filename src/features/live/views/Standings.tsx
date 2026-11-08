import { useMemo } from 'react'
import clsx from 'clsx'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useIntervalsAt, useLaps, usePositions, useRaceControl, useStints } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import {
  completed, currentLapNumber, indexLaps, latestPerDriver, phaseAt, qualiPhaseStarts, sortByDate, stintsUpTo, type LapX,
} from '../lib/derive'
import { gap, lapTime } from '../lib/format'
import { DriverLabel } from '../components/Driver'
import { TyreBadge } from '../components/Tyre'

const PURPLE = '#b44dff'

interface Row {
  driver: number
  position: number | null
  gapToLeader: number | string | null
  interval: number | string | null
  lap: number
  last: number | null
  lastIsPb: boolean
  best: number | null
  compound?: string
  tyreAge?: number
  stops: number
  /** Qualifying phase of `best` (1 = Q1…). */
  phase?: number
}

/** Fastest completed lap of the session at time t. */
function minOf(lapsBy: Map<number, LapX[]>, t: number) {
  let m: number | null = null
  for (const arr of lapsBy.values())
    for (const l of completed(arr, t)) if (l.lap_duration != null && (m == null || l.lap_duration < m)) m = l.lap_duration
  return m
}

export default function Standings() {
  const { drivers, driverMap, isRace, session } = useLive()
  const isQuali = session.session_type === 'Qualifying'
  const t = useViewTime(1000)
  const laps = useLaps()
  const positions = usePositions()
  const stints = useStints()
  const intervals = useIntervalsAt(t, isRace)
  const rc = useRaceControl()
  const phases = useMemo(() => (isQuali ? qualiPhaseStarts(rc.data ?? []) : []), [isQuali, rc.data])

  const lapsBy = useMemo(() => indexLaps(laps.data ?? []), [laps.data])
  const posSorted = useMemo(() => sortByDate(positions.data ?? []), [positions.data])
  const intSorted = useMemo(() => sortByDate(intervals.data ?? []), [intervals.data])

  const { rows, overallBest, leaderLap } = useMemo(() => {
    const pos = latestPerDriver(posSorted, t)
    const ints = latestPerDriver(intSorted, t)
    const rows: Row[] = drivers.map((d) => {
      const dl = lapsBy.get(d.driver_number)
      const done = completed(dl, t).filter((l) => l.lap_duration != null)
      const lastL = done.at(-1)
      // Qualifying: best lap of the latest phase the driver took part in.
      const phase = phases.length && done.length ? Math.max(...done.map((l) => phaseAt(phases, l.start))) : undefined
      const pool = phase ? done.filter((l) => phaseAt(phases, l.start) === phase) : done
      const best = pool.length ? Math.min(...pool.map((l) => l.lap_duration!)) : null
      const lap = currentLapNumber(dl, t)
      const st = stintsUpTo(stints.data ?? [], d.driver_number, lap)
      const cur = st.at(-1)
      const iv = ints.get(d.driver_number)
      return {
        driver: d.driver_number,
        position: pos.get(d.driver_number)?.position ?? null,
        gapToLeader: iv?.gap_to_leader ?? null,
        interval: iv?.interval ?? null,
        lap,
        last: lastL?.lap_duration ?? null,
        lastIsPb: lastL?.lap_duration != null && lastL.lap_duration === best,
        best,
        compound: cur?.compound,
        tyreAge: cur ? cur.tyre_age_at_start + Math.max(0, lap - cur.lap_start) : undefined,
        stops: Math.max(0, st.length - 1),
        phase,
      }
    })
    rows.sort((a, b) =>
      (a.position ?? 99) - (b.position ?? 99) || (a.best ?? 1e9) - (b.best ?? 1e9) || a.driver - b.driver)
    const overallBest = minOf(lapsBy, t)
    if (!isRace) {
      // Qualifying / practice: gaps on best laps (in qualifying, against the fastest of the same phase).
      const phaseBest = new Map<number, number>()
      for (const arr of lapsBy.values())
        for (const l of completed(arr, t)) {
          if (l.lap_duration == null) continue
          const p = phases.length ? phaseAt(phases, l.start) : 0
          phaseBest.set(p, Math.min(phaseBest.get(p) ?? Infinity, l.lap_duration))
        }
      rows.forEach((r, i) => {
        const ref = phaseBest.get(r.phase ?? 0)
        r.gapToLeader = r.best == null || ref == null || r.best === ref ? null : r.best - ref
        const prev = rows[i - 1]
        r.interval = i === 0 || r.best == null || prev?.best == null || (prev.phase ?? 0) !== (r.phase ?? 0) ? null : r.best - prev.best
      })
    }
    return { rows, overallBest, leaderLap: rows[0]?.lap ?? 0 }
  }, [drivers, lapsBy, posSorted, intSorted, stints.data, t, isRace, phases])

  if (laps.isLoading || positions.isLoading) return <Loader />
  if (positions.error) return <ErrorState error={positions.error} onRetry={() => positions.refetch()} />

  return (
    <Card
      title={
        <span className="flex flex-wrap items-center justify-between gap-2">
          <span>Classement {isRace ? 'course' : '(meilleurs tours)'}</span>
          {leaderLap > 0 && <span className="font-mono normal-case text-text">Tour {leaderLap}</span>}
        </span>
      }
    >
      <div className="-mx-4 overflow-x-auto px-4">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted">
              <th className="py-2 pr-2">Pos</th>
              <th className="pr-3">Pilote</th>
              <th className="pr-3 text-right">{isRace ? 'Écart' : 'Écart 1er'}</th>
              <th className="pr-3 text-right">Intervalle</th>
              <th className="pr-3 text-right">Dernier tour</th>
              <th className="pr-3 text-right">Meilleur tour</th>
              <th className="pr-3">Pneu</th>
              <th className="text-right">{isRace ? 'Arrêts' : 'Relais'}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const lastColor = r.last != null && r.last === overallBest ? PURPLE : r.lastIsPb ? 'var(--color-ok)' : undefined
              const bestColor = r.best != null && r.best === overallBest ? PURPLE : undefined
              return (
                <tr key={r.driver} className="border-b border-border/60 last:border-0 hover:bg-surface-2">
                  <td className="py-1.5 pr-2 font-mono font-bold">{r.position ?? i + 1}</td>
                  <td className="pr-3"><DriverLabel driver={driverMap.get(r.driver)} number={r.driver} full /></td>
                  <td className="pr-3 text-right font-mono tabular-nums">
                    {i === 0 && isRace ? <span className="text-muted">Leader</span> : gap(r.gapToLeader)}
                  </td>
                  <td className="pr-3 text-right font-mono tabular-nums text-muted">{i === 0 ? '' : gap(r.interval)}</td>
                  <td className="pr-3 text-right font-mono tabular-nums" style={{ color: lastColor }}>{lapTime(r.last)}</td>
                  <td className={clsx('pr-3 text-right font-mono tabular-nums', bestColor && 'font-bold')} style={{ color: bestColor }}>
                    {r.phase ? <span className="mr-1.5 text-[10px] font-bold text-muted">Q{r.phase}</span> : null}
                    {lapTime(r.best)}
                  </td>
                  <td className="pr-3">{r.compound ? <TyreBadge compound={r.compound} age={r.tyreAge} /> : <span className="text-muted">—</span>}</td>
                  <td className="text-right font-mono">{isRace ? r.stops : r.compound ? r.stops + 1 : 0}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <p className="mt-3 flex flex-wrap gap-4 text-xs text-muted">
        <span><span className="font-bold" style={{ color: PURPLE }}>■</span> meilleur tour absolu</span>
        <span><span className="font-bold text-ok">■</span> meilleur tour personnel</span>
        {isRace && intervals.isFetching && <span>mise à jour des écarts…</span>}
      </p>
    </Card>
  )
}
