import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'motion/react'
import { ChevronLeft, ChevronRight, Flag, Trophy } from 'lucide-react'
import clsx from 'clsx'
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ErrorState, Loader, Page } from '@/components/ui'
import { useSeason, type SeasonData } from '../../hooks/useSeason'
import { eraForYear } from '../../data/eras'
import { EVENTS, EVENT_CATEGORIES } from '../../data/events'
import { formatPartialDate, natFr, raceNameFr } from '../../lib/format'
import { AXIS, GRID, SERIES, TOOLTIP } from '../chartTheme'

const FIRST_YEAR = 1950
const THIS_YEAR = new Date().getFullYear()

export default function SeasonPage() {
  const params = useParams()
  const navigate = useNavigate()
  const year = Number(params.year)
  const valid = Number.isInteger(year) && year >= FIRST_YEAR && year <= THIS_YEAR
  const { data, isLoading, error, refetch } = useSeason(valid ? year : NaN)
  const era = eraForYear(year)
  const events = EVENTS.filter((e) => e.date.startsWith(String(year)))

  const go = (y: number) => navigate(`/history/season/${y}`)

  return (
    <Page>
      {/* en-tête de saison */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em]" style={{ color: era?.color }}>
            {era ? era.title : 'Explorateur de saisons'}
          </p>
          <motion.h1
            key={year}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-5xl font-black tracking-tighter md:text-7xl"
          >
            Saison <span style={{ color: era?.color ?? 'var(--color-f1)' }}>{valid ? year : '—'}</span>
          </motion.h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => go(year - 1)}
            disabled={!valid || year <= FIRST_YEAR}
            className="rounded-md border border-border bg-surface p-2 hover:bg-surface-2 disabled:opacity-30"
            aria-label="Saison précédente"
          >
            <ChevronLeft size={18} />
          </button>
          <select
            value={valid ? year : ''}
            onChange={(e) => go(Number(e.target.value))}
            className="rounded-md border border-border bg-surface px-3 py-2 font-mono font-bold outline-none focus:border-f1"
            aria-label="Choisir une saison"
          >
            {Array.from({ length: THIS_YEAR - FIRST_YEAR + 1 }, (_, i) => THIS_YEAR - i).map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <button
            onClick={() => go(year + 1)}
            disabled={!valid || year >= THIS_YEAR}
            className="rounded-md border border-border bg-surface p-2 hover:bg-surface-2 disabled:opacity-30"
            aria-label="Saison suivante"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {!valid && <ErrorState error={`Saison inconnue : ${params.year}. Choisissez une année entre ${FIRST_YEAR} et ${THIS_YEAR}.`} />}
      {valid && isLoading && <Loader label={`Chargement de la saison ${year} (calendrier, résultats, classements)…`} />}
      {valid && error && <ErrorState error={error} onRetry={() => refetch()} />}
      {valid && data && <SeasonContent data={data} />}

      {valid && events.length > 0 && (
        <Card className="mt-6" title={`Faits marquants ${year}`}>
          <ul className="space-y-2">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3 text-sm">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: EVENT_CATEGORIES[e.category].color }} />
                <span>
                  <span className="font-mono text-xs text-muted">{formatPartialDate(e.date)}</span> — <b>{e.title}</b>. {e.text}
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </Page>
  )
}

function SeasonContent({ data }: { data: SeasonData }) {
  const total = data.races.length
  const done = data.completedRounds
  const inProgress = done < total
  const leader = data.driverStandings[0]
  const cLeader = data.constructorStandings[0]
  const distinctWinners = new Set(data.races.filter((r) => r.winner).map((r) => r.winner!.id)).size

  return (
    <div className="space-y-6">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-xl border border-border bg-surface p-4 md:col-span-2">
          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
            <Trophy size={14} className="text-warn" aria-hidden /> {inProgress ? 'En tête du championnat' : 'Champion du monde'}
          </p>
          {leader ? (
            <>
              <p className="mt-1 text-2xl font-black">
                {leader.Driver.givenName} {leader.Driver.familyName}
              </p>
              <p className="text-sm text-muted">
                {leader.Constructors.map((c) => c.name).join(' / ')} · {leader.points} pts · {leader.wins} victoire
                {Number(leader.wins) > 1 ? 's' : ''} · {natFr(leader.Driver.nationality)}
              </p>
            </>
          ) : (
            <p className="mt-1 text-muted">Classement indisponible.</p>
          )}
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Constructeurs</p>
          <p className="mt-1 text-xl font-black">{cLeader ? cLeader.Constructor.name : '—'}</p>
          <p className="text-sm text-muted">{cLeader ? `${cLeader.points} pts` : 'Championnat créé en 1958'}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-muted">Courses</p>
          <p className="mt-1 text-xl font-black">
            {done}
            <span className="text-muted">/{total}</span>
          </p>
          <p className="text-sm text-muted">
            {distinctWinners} vainqueur{distinctWinners > 1 ? 's' : ''} différent{distinctWinners > 1 ? 's' : ''}
            {inProgress && <span className="text-warn"> · en cours</span>}
          </p>
        </div>
      </div>

      {data.progression.length > 0 && <PointsChart data={data} />}

      <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <Card title="Calendrier et vainqueurs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr>
                  <th className="py-2 pr-2">#</th>
                  <th className="py-2 pr-2">Grand Prix</th>
                  <th className="hidden py-2 pr-2 sm:table-cell">Date</th>
                  <th className="hidden py-2 pr-2 lg:table-cell">Pole (grille)</th>
                  <th className="py-2">Vainqueur</th>
                </tr>
              </thead>
              <tbody>
                {data.races.map((r) => (
                  <tr key={r.round} className="border-t border-border">
                    <td className="py-1.5 pr-2 font-mono text-xs text-muted">{r.round}</td>
                    <td className="py-1.5 pr-2">
                      <span className="font-semibold">{raceNameFr(r.name)}</span>
                      {r.hasSprint && <span className="ml-1 rounded bg-info/15 px-1 text-[10px] font-bold text-info">SPRINT</span>}
                      <span className="block text-xs text-muted">
                        {r.locality}, {r.country}
                      </span>
                    </td>
                    <td className="hidden py-1.5 pr-2 font-mono text-xs text-muted sm:table-cell">
                      {new Date(`${r.date}T12:00:00Z`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </td>
                    <td className="hidden py-1.5 pr-2 text-muted lg:table-cell">{r.pole?.name ?? ''}</td>
                    <td className="py-1.5">
                      {r.winner ? (
                        <>
                          <span className="font-semibold">{r.winner.name}</span>
                          <span className="block text-xs text-muted">{r.winner.team}</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1 text-xs text-muted">
                          <Flag size={12} aria-hidden /> à venir
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="space-y-6">
          <Card title={inProgress ? 'Classement pilotes (provisoire)' : 'Classement final pilotes'}>
            <ol className="max-h-[520px] space-y-0.5 overflow-auto text-sm">
              {data.driverStandings.map((s) => (
                <li key={s.Driver.driverId} className="flex items-center gap-2 rounded px-1 py-1 odd:bg-surface-2/40">
                  <span className="w-6 text-right font-mono text-xs text-muted">{s.position ?? '–'}</span>
                  <span className="flex-1 truncate">
                    <span className="font-semibold">
                      {s.Driver.givenName} {s.Driver.familyName}
                    </span>
                    <span className="ml-1 text-xs text-muted">{s.Constructors.map((c) => c.name).join(' / ')}</span>
                  </span>
                  <span className="font-mono text-xs">{s.points}</span>
                </li>
              ))}
            </ol>
          </Card>
          {data.constructorStandings.length > 0 && (
            <Card title={inProgress ? 'Constructeurs (provisoire)' : 'Classement final constructeurs'}>
              <ol className="space-y-0.5 text-sm">
                {data.constructorStandings.map((s) => (
                  <li key={s.Constructor.constructorId} className="flex items-center gap-2 rounded px-1 py-1 odd:bg-surface-2/40">
                    <span className="w-6 text-right font-mono text-xs text-muted">{s.position ?? '–'}</span>
                    <span className="flex-1 truncate font-semibold">{s.Constructor.name}</span>
                    <span className="font-mono text-xs">{s.points}</span>
                  </li>
                ))}
              </ol>
            </Card>
          )}
        </div>
      </div>
      <p className="text-xs text-muted">
        Source : Jolpica-F1. « Pole (grille) » désigne le pilote parti en première position, qui peut différer du plus rapide en
        qualifications en cas de pénalité. <Link to="/history/champions" className="underline">Voir tous les champions</Link>.
      </p>
    </div>
  )
}

function PointsChart({ data }: { data: SeasonData }) {
  const [focus, setFocus] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const colorOf = useMemo(
    () => Object.fromEntries(data.top10.map((d, i) => [d.id, i < SERIES.length ? SERIES[i] : '#6b7386'])),
    [data.top10],
  )
  const nameOf = Object.fromEntries(data.top10.map((d) => [d.id, d.name]))
  const legacyScoring = data.year < 1991

  return (
    <Card title="Évolution des points — top 10">
      <div className="mb-3 flex flex-wrap gap-1.5">
        {data.top10.map((d, i) => {
          const off = hidden.has(d.id)
          return (
            <button
              key={d.id}
              onMouseEnter={() => setFocus(d.id)}
              onMouseLeave={() => setFocus(null)}
              onClick={() =>
                setHidden((h) => {
                  const n = new Set(h)
                  if (n.has(d.id)) n.delete(d.id)
                  else n.add(d.id)
                  return n
                })
              }
              aria-pressed={!off}
              className={clsx(
                'flex items-center gap-1.5 rounded-md border border-border px-2 py-0.5 text-xs font-semibold transition-opacity',
                off && 'opacity-35',
              )}
            >
              <span
                className="inline-block h-0.5 w-4"
                style={{ background: colorOf[d.id], borderTop: i >= SERIES.length ? '1px dashed' : undefined }}
              />
              <span className="font-mono text-muted">{i + 1}</span> {d.code}
            </button>
          )
        })}
      </div>
      <div className="h-[340px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data.progression} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
            <CartesianGrid {...GRID} />
            <XAxis dataKey="label" {...AXIS} interval="preserveStartEnd" minTickGap={16} />
            <YAxis {...AXIS} />
            <Tooltip
              {...TOOLTIP}
              cursor={{ stroke: 'var(--color-muted)', strokeDasharray: '3 3' }}
              labelFormatter={(l, p) => `Manche ${p?.[0]?.payload?.round ?? ''} · ${l}`}
              formatter={(v, n) => [`${v} pts`, nameOf[String(n)] ?? String(n)]}
              itemSorter={(item) => -Number(item.value)}
            />
            {data.top10.map((d, i) =>
              hidden.has(d.id) ? null : (
                <Line
                  key={d.id}
                  dataKey={d.id}
                  name={d.id}
                  type="monotone"
                  stroke={colorOf[d.id]}
                  strokeWidth={focus === d.id ? 3 : 2}
                  strokeOpacity={focus && focus !== d.id ? 0.2 : 1}
                  strokeDasharray={i >= SERIES.length ? '4 3' : undefined}
                  dot={false}
                  activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--color-surface)' }}
                  isAnimationActive
                  animationDuration={700}
                />
              ),
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="mt-2 text-xs text-muted">
        Points bruts cumulés en course{data.year >= 2021 ? ' et en sprint' : ''}, classés selon le classement {data.completedRounds < data.races.length ? 'actuel' : 'final'}.
        {legacyScoring &&
          ' Avant 1991, seuls les meilleurs résultats comptaient : le total brut peut dépasser les points retenus au classement officiel.'}{' '}
        Survolez la légende pour isoler un pilote, cliquez pour le masquer.
      </p>
    </Card>
  )
}
