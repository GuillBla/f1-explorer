import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ErrorState, Loader, Page, PageHeader } from '@/components/ui'
import { useChampions } from '../../hooks/useChampions'
import { completed, constructorTitles, driverTitles, nationalityTitles, type Tally } from '../../lib/stats'
import { natFr } from '../../lib/format'
import { eraForYear } from '../../data/eras'
import { AXIS, GRID, TOOLTIP } from '../chartTheme'
import { StatTile } from '../StatTile'

type Mode = 'drivers' | 'constructors' | 'nations'
const MODES: { id: Mode; label: string }[] = [
  { id: 'drivers', label: 'Titres par pilote' },
  { id: 'constructors', label: 'Titres constructeurs par écurie' },
  { id: 'nations', label: 'Titres pilotes par nationalité' },
]

export default function ChampionsPage() {
  const { data, isLoading, error, refetch, liveError } = useChampions()
  const [mode, setMode] = useState<Mode>('drivers')
  const [selected, setSelected] = useState<string | null>(null)

  const tallies = useMemo(() => {
    if (!data) return null
    return { drivers: driverTitles(data), constructors: constructorTitles(data), nations: nationalityTitles(data) }
  }, [data])

  if (isLoading) return <Page><Loader label="Chargement des champions…" /></Page>
  if (error || !data || !tallies) return <Page><ErrorState error={error ?? 'Données indisponibles'} onRetry={() => refetch()} /></Page>

  const done = completed(data)
  const current = data.champions.find((c) => c.inProgress)
  const list = tallies[mode]
  const selectedYears = new Set(list.find((t) => t.key === selected)?.years ?? [])
  return (
    <Page>
      <PageHeader
        title="Les champions du monde"
        subtitle={`Tous les titres pilotes depuis 1950 et constructeurs depuis 1958, d’après Jolpica (Ergast). Données générées le ${new Date(
          data.generatedAt,
        ).toLocaleDateString('fr-FR')}${current ? ', saison en cours actualisée en direct' : ''}.`}
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatTile label="Saisons terminées" value={done.length} />
        <StatTile label="Champions pilotes" value={tallies.drivers.length} />
        <StatTile label="Écuries titrées" value={tallies.constructors.length} hint="titres constructeurs" />
        <StatTile label="Nations titrées" value={tallies.nations.length} />
      </div>

      {current && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm"
        >
          <span className="font-bold text-warn">Saison {current.year} en cours · après {current.rounds} manches</span>
          {current.drivers[0] && (
            <span>
              En tête : <b>{data.drivers[current.drivers[0].id]?.name}</b> ({current.drivers[0].points} pts)
              {current.drivers[1] && <span className="text-muted"> · {current.drivers[0].points - current.drivers[1].points} pts d’avance</span>}
            </span>
          )}
          {current.constructors[0] && (
            <span>
              Constructeurs : <b>{current.constructors[0].name}</b> ({current.constructors[0].points} pts)
            </span>
          )}
          <Link to={`/history/season/${current.year}`} className="font-semibold text-warn underline-offset-2 hover:underline">
            Détails de la saison
          </Link>
          {liveError ? <span className="text-xs text-muted">(API indisponible : données du dernier export)</span> : null}
        </motion.div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <Card>
          <div className="mb-3 flex flex-wrap gap-1" role="tablist">
            {MODES.map((m) => (
              <button
                key={m.id}
                role="tab"
                aria-selected={mode === m.id}
                onClick={() => {
                  setMode(m.id)
                  setSelected(null)
                }}
                className={clsx(
                  'rounded-md px-3 py-1 text-xs font-bold transition-colors',
                  mode === m.id ? 'bg-text text-bg' : 'bg-surface-2 text-muted hover:text-text',
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
          <TitlesBarChart data={list} selected={selected} onSelect={(k) => setSelected(k === selected ? null : k)} />
          <p className="mt-2 text-xs text-muted">Cliquez sur une barre pour repérer les saisons correspondantes dans la grille.</p>
        </Card>

        <Card title="Grille des champions">
          <div className="grid grid-cols-4 gap-1 sm:grid-cols-8 xl:grid-cols-8">
            {data.champions.map((c) => {
              const d = c.drivers[0]
              const info = d ? data.drivers[d.id] : undefined
              const era = eraForYear(c.year)
              const dim = selected !== null && !selectedYears.has(c.year)
              const hit = selected !== null && selectedYears.has(c.year)
              return (
                <Link
                  key={c.year}
                  to={`/history/season/${c.year}`}
                  title={`${c.year} · ${info?.name ?? '?'}${c.constructors[0] ? ` · constructeurs : ${c.constructors[0].name}` : ''}`}
                  className={clsx(
                    'relative rounded-md border bg-surface-2/60 px-1.5 py-1 transition-all',
                    hit ? 'border-text scale-105' : 'border-border',
                    dim && 'opacity-25',
                    c.inProgress && 'border-dashed border-warn',
                  )}
                >
                  <span className="absolute inset-x-0 top-0 h-0.5 rounded-t" style={{ background: era?.color }} />
                  <span className="block font-mono text-[10px] text-muted">{c.year}</span>
                  <span className="block truncate text-xs font-bold">
                    {info?.code ?? info?.name.split(' ').slice(-1)[0].slice(0, 3).toUpperCase() ?? '—'}
                  </span>
                </Link>
              )
            })}
          </div>
          <p className="mt-2 text-xs text-muted">Liseré : couleur de l’ère. Cadre pointillé : saison en cours (leader provisoire).</p>
        </Card>
      </div>

      <Card className="mt-6" title="Saison par saison">
        <div className="max-h-[640px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-surface text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-3">Saison</th>
                <th className="py-2 pr-3">Champion pilote</th>
                <th className="hidden py-2 pr-3 md:table-cell">Écurie</th>
                <th className="py-2 pr-3 text-right">Pts</th>
                <th className="hidden py-2 pr-3 text-right sm:table-cell">Vict.</th>
                <th className="hidden py-2 pr-3 md:table-cell">Dauphin</th>
                <th className="py-2">Constructeurs</th>
              </tr>
            </thead>
            <tbody>
              {[...data.champions].reverse().map((c) => {
                const d = c.drivers[0]
                const second = c.drivers[1]
                return (
                  <tr key={c.year} className="border-t border-border hover:bg-surface-2/50">
                    <td className="py-1.5 pr-3">
                      <Link to={`/history/season/${c.year}`} className="font-mono font-bold hover:text-f1">
                        {c.year}
                      </Link>
                      {c.inProgress && <span className="ml-1 text-[10px] font-bold text-warn">EN COURS</span>}
                    </td>
                    <td className="py-1.5 pr-3 font-semibold">
                      {d ? data.drivers[d.id]?.name : '—'}
                      <span className="ml-1 text-xs font-normal text-muted">{d ? natFr(data.drivers[d.id]?.nat ?? '') : ''}</span>
                    </td>
                    <td className="hidden py-1.5 pr-3 text-muted md:table-cell">{d?.team}</td>
                    <td className="py-1.5 pr-3 text-right font-mono">{d?.points}</td>
                    <td className="hidden py-1.5 pr-3 text-right font-mono sm:table-cell">{d?.wins}</td>
                    <td className="hidden py-1.5 pr-3 text-muted md:table-cell">
                      {second ? `${data.drivers[second.id]?.name} (${second.points})` : ''}
                    </td>
                    <td className="py-1.5">{c.constructors[0]?.name ?? <span className="text-muted">—</span>}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-muted">
          Points : total retenu au classement officiel (avec résultats retirés lorsque le règlement l’imposait). Le championnat
          constructeurs n’existe que depuis 1958. Les 500 miles d’Indianapolis comptaient pour le championnat de 1950 à 1960.
        </p>
      </Card>
    </Page>
  )
}

function TitlesBarChart({ data, selected, onSelect }: { data: Tally[]; selected: string | null; onSelect: (k: string) => void }) {
  const height = Math.max(240, data.length * 24 + 30)
  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 28, bottom: 4, left: 4 }} barCategoryGap={4}>
          <CartesianGrid {...GRID} horizontal={false} vertical />
          <XAxis type="number" allowDecimals={false} {...AXIS} />
          <YAxis type="category" dataKey="label" width={140} {...AXIS} tick={{ fill: 'var(--color-text)', fontSize: 12 }} interval={0} />
          <Tooltip
            {...TOOLTIP}
            formatter={(v) => [`${v} titre${Number(v) > 1 ? 's' : ''}`, '']}
            labelFormatter={(l, p) => {
              const t = p?.[0]?.payload as Tally | undefined
              return t ? `${l}${t.sub ? ` · ${t.sub}` : ''} — ${t.years?.join(', ')}` : String(l)
            }}
          />
          <Bar
            dataKey="value"
            radius={[0, 4, 4, 0]}
            label={{ position: 'right', fill: 'var(--color-muted)', fontSize: 11 }}
            onClick={(e) => {
              const p = (e as unknown as { payload?: Tally }).payload
              if (p) onSelect(p.key)
            }}
            className="cursor-pointer"
          >
            {data.map((t) => (
              <Cell key={t.key} fill={selected === null || selected === t.key ? 'var(--color-f1)' : 'var(--color-border)'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
