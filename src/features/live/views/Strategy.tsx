import { useMemo, type ReactNode } from 'react'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useLaps, usePits, usePositions, useStints } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import { currentLapNumber, indexLaps, latestPerDriver, realPits, sortByDate } from '../lib/derive'
import { ms } from '../lib/format'
import { DriverLabel } from '../components/Driver'
import { tyreColor, TYRE_FR } from '../components/Tyre'
import { TYRE_COLORS } from '@/lib/api'

export default function Strategy() {
  const { drivers, driverMap, status } = useLive()
  const t = useViewTime(2000)
  const stints = useStints()
  const pits = usePits()
  const laps = useLaps()
  const positions = usePositions()

  const lapsBy = useMemo(() => indexLaps(laps.data ?? []), [laps.data])
  const posSorted = useMemo(() => sortByDate(positions.data ?? []), [positions.data])
  const pitList = useMemo(() => realPits(pits.data ?? []), [pits.data])

  const { rows, maxLap } = useMemo(() => {
    const pos = latestPerDriver(posSorted, t)
    const maxLap = Math.max(1, ...(stints.data ?? []).map((s) => s.lap_end ?? 0), ...[...lapsBy.values()].map((a) => a.at(-1)?.lap_number ?? 0))
    const rows = drivers.map((d) => {
      const n = d.driver_number
      const cur = currentLapNumber(lapsBy.get(n), t)
      const st = (stints.data ?? [])
        .filter((s) => s.driver_number === n && s.lap_start <= Math.max(cur, 1))
        .sort((a, b) => a.stint_number - b.stint_number)
        .map((s) => ({ ...s, to: Math.min(s.lap_end ?? cur, cur) }))
      const stops = pitList.filter((p) => p.driver_number === n && ms(p.date) <= t)
      return { n, pos: pos.get(n)?.position ?? 99, cur, st, stops }
    }).filter((r) => r.st.length || r.cur > 0)
    rows.sort((a, b) => a.pos - b.pos || a.n - b.n)
    return { rows, maxLap }
  }, [drivers, lapsBy, posSorted, stints.data, pitList, t])

  if (stints.isLoading || laps.isLoading) return <Loader />
  if (stints.error) return <ErrorState error={stints.error} onRetry={() => stints.refetch()} />
  if (!rows.length) return <Card><p className="text-muted">Pas encore de relais enregistrés.</p></Card>

  const pct = (lap: number) => `${(lap / maxLap) * 100}%`
  const ticks = Array.from({ length: Math.floor(maxLap / 10) + 1 }, (_, i) => i * 10)

  return (
    <Card title="Stratégie pneus">
      <div className="mb-3 flex flex-wrap gap-3 text-xs text-muted">
        {Object.entries(TYRE_COLORS).map(([k, c]) => (
          <span key={k} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-4 rounded-sm" style={{ background: c }} /> {TYRE_FR[k] ?? k}
          </span>
        ))}
        <span className="inline-flex items-center gap-1.5"><span className="h-3 w-0.5 bg-text" /> arrêt au stand</span>
      </div>
      <div className="grid grid-cols-[4.5rem_1fr] items-center gap-x-2 gap-y-1.5 sm:grid-cols-[6rem_1fr]">
        {rows.map((r) => (
          <Row key={r.n} label={<DriverLabel driver={driverMap.get(r.n)} number={r.n} />}>
            {r.st.map((s) => {
              const len = Math.max(0, s.to - s.lap_start + 1)
              return (
                <div
                  key={s.stint_number}
                  className="absolute inset-y-0.5 flex items-center justify-center overflow-hidden rounded-[4px] border-r-2 border-surface text-[10px] font-bold text-bg"
                  style={{ left: pct(s.lap_start - 1), width: pct(len), background: tyreColor(s.compound) }}
                  title={`${TYRE_FR[s.compound] ?? s.compound} · tours ${s.lap_start}–${s.to} (${len} t.) · ${s.tyre_age_at_start ? `usés de ${s.tyre_age_at_start} t.` : 'neufs'}`}
                >
                  {len >= 4 ? len : ''}
                </div>
              )
            })}
            {r.stops.map((p, i) => (
              <div key={i} className="absolute -inset-y-0.5 w-0.5 bg-text" style={{ left: pct(p.lap_number - 1) }}
                title={`Arrêt tour ${p.lap_number}${p.stop_duration != null ? ` · immobilisation ${p.stop_duration.toFixed(1)} s` : ''}${p.pit_duration != null ? ` · voie des stands ${p.pit_duration.toFixed(1)} s` : ''}`} />
            ))}
          </Row>
        ))}
        <div />
        <div className="relative h-4 text-[10px] text-muted">
          {ticks.map((l) => (
            <span key={l} className="absolute -translate-x-1/2" style={{ left: pct(l) }}>{l}</span>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-muted">
        Nombre de tours par relais indiqué dans chaque barre. Survolez une barre ou un arrêt pour le détail.
        {status === 'live' && ' Les relais en cours sont prolongés à chaque mise à jour.'}
      </p>
    </Card>
  )
}

function Row({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="text-sm">{label}</div>
      <div className="relative h-6 rounded bg-surface-2">{children}</div>
    </>
  )
}
