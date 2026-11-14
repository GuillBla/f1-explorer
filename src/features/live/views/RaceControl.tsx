import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CloudRain, Droplets, Gauge, Thermometer, Wind } from 'lucide-react'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useLive } from '../context'
import { useRaceControl, useRadioTranscripts, useTeamRadio, useWeather } from '../hooks/useOpenF1'
import { useViewTime } from '../hooks/useViewTime'
import { latestAt, sortByDate } from '../lib/derive'
import type { RaceControlX } from '../lib/api'
import { hhmm, ms } from '../lib/format'
import { DriverLabel } from '../components/Driver'
import { axisProps, gridProps, tooltipProps } from '../components/chart'

type Filter = 'all' | 'flags' | 'sc' | 'penalties'
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tout' }, { id: 'flags', label: 'Drapeaux' },
  { id: 'sc', label: 'Voiture de sécurité' }, { id: 'penalties', label: 'Pénalités & enquêtes' },
]

const isPenalty = (m: RaceControlX) => /PENALTY|INVESTIGATION|NOTED|REPRIMAND|DISQUALIF/i.test(m.message)

const FLAG_COLORS: Record<string, string> = {
  GREEN: '#2ecc71', CLEAR: '#2ecc71', YELLOW: '#ffd700', 'DOUBLE YELLOW': '#ffb800', RED: '#e10600',
  BLUE: '#3fa9f5', CHEQUERED: '#e8ebf2', 'BLACK AND WHITE': '#e8ebf2', BLACK: '#8b93a7',
}
const FLAG_FR: Record<string, string> = {
  GREEN: 'Vert', CLEAR: 'Fin de drapeau', YELLOW: 'Jaune', 'DOUBLE YELLOW': 'Double jaune', RED: 'Rouge',
  BLUE: 'Bleu', CHEQUERED: 'Damier', 'BLACK AND WHITE': 'Noir et blanc', BLACK: 'Noir',
}

function tag(m: RaceControlX) {
  if (m.flag) return { label: FLAG_FR[m.flag] ?? m.flag, color: FLAG_COLORS[m.flag] ?? '#8b93a7' }
  if (m.category === 'SafetyCar') return { label: /VSC|VIRTUAL/i.test(m.message) ? 'VSC' : 'Safety car', color: '#ffb800' }
  if (isPenalty(m)) return { label: 'Commissaires', color: '#e10600' }
  if (m.category === 'SessionStatus') return { label: 'Session', color: '#00d2be' }
  return { label: 'Info', color: '#8b93a7' }
}

export default function RaceControlView() {
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_22rem]">
      <Messages />
      <div className="grid content-start gap-4">
        <WeatherCard />
        <Radios />
      </div>
    </div>
  )
}

function Messages() {
  const { range } = useLive()
  const t = useViewTime(1000)
  const rc = useRaceControl()
  const [filter, setFilter] = useState<Filter>('all')
  const list = useMemo(() => {
    // race_control can contain messages from other sessions of the meeting: keep the session window.
    const from = range.start - 3_600_000
    return sortByDate(rc.data ?? [])
      .filter((m) => ms(m.date) >= from && ms(m.date) <= t)
      .filter((m) => filter === 'all'
        || (filter === 'flags' && m.category === 'Flag')
        || (filter === 'sc' && m.category === 'SafetyCar')
        || (filter === 'penalties' && isPenalty(m)))
      .reverse()
  }, [rc.data, range.start, t, filter])

  return (
    <Card title="Direction de course">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <button key={f.id} onClick={() => setFilter(f.id)}
            className={clsx('rounded-md border px-2 py-0.5 text-xs font-semibold',
              filter === f.id ? 'border-f1 bg-f1 text-white' : 'border-border text-muted hover:text-text')}>
            {f.label}
          </button>
        ))}
      </div>
      {rc.isLoading ? <Loader /> : rc.error ? <ErrorState error={rc.error} onRetry={() => rc.refetch()} /> : !list.length ? (
        <p className="py-6 text-center text-sm text-muted">Aucun message.</p>
      ) : (
        <ul className="max-h-[36rem] divide-y divide-border/60 overflow-y-auto pr-1">
          {list.map((m, i) => {
            const tg = tag(m)
            return (
              <li key={`${m.date}-${i}`} className="flex gap-3 py-2 text-sm">
                <div className="w-16 shrink-0 font-mono text-xs text-muted">
                  {hhmm(ms(m.date)).slice(0, 5)}
                  {m.lap_number != null && <div>T{m.lap_number}</div>}
                </div>
                <div className="min-w-0">
                  <span className="mr-2 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold uppercase"
                    style={{ background: `${tg.color}22`, color: tg.color }}>
                    {tg.label}
                  </span>
                  <span className="break-words">{m.message}</span>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

function WeatherCard() {
  const t = useViewTime(10_000)
  const w = useWeather()
  const sorted = useMemo(() => sortByDate(w.data ?? []), [w.data])
  const cur = latestAt(sorted, t)
  const chart = useMemo(
    () => sorted.filter((x) => ms(x.date) <= t).map((x) => ({ t: ms(x.date), air: x.air_temperature, piste: x.track_temperature })),
    [sorted, t],
  )
  if (w.isLoading) return <Card title="Météo"><Loader /></Card>
  if (w.error) return <Card title="Météo"><ErrorState error={w.error} onRetry={() => w.refetch()} /></Card>
  if (!cur) return <Card title="Météo"><p className="text-sm text-muted">Pas de relevé météo.</p></Card>
  const tiles = [
    { icon: Thermometer, label: 'Air', value: `${cur.air_temperature.toFixed(1)} °C` },
    { icon: Thermometer, label: 'Piste', value: `${cur.track_temperature.toFixed(1)} °C` },
    { icon: Droplets, label: 'Humidité', value: `${Math.round(cur.humidity)} %` },
    { icon: Wind, label: 'Vent', value: `${cur.wind_speed.toFixed(1)} m/s · ${cur.wind_direction}°` },
    { icon: Gauge, label: 'Pression', value: `${cur.pressure.toFixed(0)} hPa` },
    { icon: CloudRain, label: 'Pluie', value: cur.rainfall ? 'Oui' : 'Non' },
  ]
  return (
    <Card title="Météo">
      <div className="grid grid-cols-2 gap-2">
        {tiles.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-lg bg-surface-2 px-2.5 py-2">
            <p className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted"><Icon size={12} /> {label}</p>
            <p className="font-mono text-sm font-bold">{value}</p>
          </div>
        ))}
      </div>
      {chart.length > 1 && (
        <div className="mt-3 h-36">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chart} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid {...gridProps} />
              <XAxis dataKey="t" type="number" domain={['dataMin', 'dataMax']} {...axisProps}
                tickFormatter={(v: number) => hhmm(v).slice(0, 5)} />
              <YAxis width={32} domain={['auto', 'auto']} {...axisProps} />
              <Tooltip {...tooltipProps} labelFormatter={(l) => hhmm(Number(l))} formatter={(v, n) => [`${v} °C`, n]} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Line dataKey="piste" name="Piste" stroke="var(--color-warn)" strokeWidth={2} dot={false} isAnimationActive={false} />
              <Line dataKey="air" name="Air" stroke="var(--color-info)" strokeWidth={2} dot={false} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </Card>
  )
}

function Radios() {
  const { driverMap, range } = useLive()
  const t = useViewTime(1000)
  const r = useTeamRadio()
  const tr = useRadioTranscripts().data
  const [limit, setLimit] = useState(15)
  const list = useMemo(
    () => sortByDate(r.data ?? []).filter((x) => ms(x.date) >= range.start - 3_600_000 && ms(x.date) <= t).reverse(),
    [r.data, range.start, t],
  )
  return (
    <Card title="Radios d’équipe">
      {r.isLoading ? <Loader /> : r.error ? <ErrorState error={r.error} onRetry={() => r.refetch()} /> : !list.length ? (
        <p className="text-sm text-muted">Aucune radio.</p>
      ) : (
        <ul className="grid gap-2">
          {list.slice(0, limit).map((x) => (
            <li key={x.recording_url} className="rounded-lg bg-surface-2 p-2">
              <div className="mb-1 flex items-center justify-between text-sm">
                <DriverLabel driver={driverMap.get(x.driver_number)} number={x.driver_number} />
                <span className="font-mono text-xs text-muted">{hhmm(ms(x.date))}</span>
              </div>
              <audio controls preload="none" src={x.recording_url} className="h-8 w-full" />
              <Transcript entry={tr?.items[x.recording_url]} />
            </li>
          ))}
          {list.length > limit && (
            <button onClick={() => setLimit((l) => l + 15)} className="text-sm font-semibold text-accent">
              Voir plus ({list.length - limit})
            </button>
          )}
        </ul>
      )}
      {tr && list.length > 0 && (
        <p className="mt-3 text-[11px] leading-snug text-muted">
          Transcriptions automatiques (Whisper), langue d’origine : elles peuvent contenir des erreurs.
        </p>
      )}
    </Card>
  )
}

function Transcript({ entry }: { entry?: { text: string; lang: string } }) {
  if (!entry) return null
  if (!entry.text) return <p className="mt-1.5 text-xs italic text-muted">(inaudible)</p>
  return (
    <p className="mt-1.5 border-l-2 border-f1/60 pl-2 text-sm leading-snug" lang={entry.lang}>
      « {entry.text} »
    </p>
  )
}
