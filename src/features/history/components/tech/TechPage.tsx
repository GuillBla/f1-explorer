import { useState } from 'react'
import clsx from 'clsx'
import { AlertTriangle, Database } from 'lucide-react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceArea,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Card, ErrorState, Loader, Page, PageHeader } from '@/components/ui'
import { ERAS } from '../../data/eras'
import { LAYOUT_NOTES, MIN_WEIGHT, POWER } from '../../data/techEvolution'
import { useCircuitPoles } from '../../hooks/useChampions'
import { AXIS, GRID, TOOLTIP } from '../chartTheme'

const X_DOMAIN: [number, number] = [1950, 2026]

/** Bandes de couleur des ères en arrière-plan d'un graphique temporel. */
function EraBands() {
  return (
    <>
      {ERAS.map((e) => (
        <ReferenceArea key={e.id} x1={e.start} x2={e.end + 1} fill={e.color} fillOpacity={0.07} strokeOpacity={0} ifOverflow="hidden" />
      ))}
    </>
  )
}

export default function TechPage() {
  return (
    <Page>
      <PageHeader
        title="Évolution technique"
        subtitle="Puissance, poids et vitesse pure : comment les règlements ont façonné les monoplaces de 1950 à 2026."
      />

      <div className="mb-6 flex gap-3 rounded-xl border border-warn/40 bg-warn/10 p-4 text-sm">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-warn" aria-hidden />
        <p>
          <b className="text-warn">Données éditoriales approximatives.</b> Les puissances sont des ordres de grandeur en
          configuration course (les motoristes publient rarement de chiffres officiels) ; les poids minimums suivent les grandes
          étapes du règlement mais sont arrondis et simplifiés. Les temps de pole, eux, proviennent de Jolpica.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Puissance moteur (ch, ordre de grandeur)">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={POWER} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <EraBands />
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" type="number" domain={X_DOMAIN} {...AXIS} ticks={[1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]} />
                <YAxis {...AXIS} domain={[0, 1100]} />
                <Tooltip
                  {...TOOLTIP}
                  cursor={{ stroke: 'var(--color-muted)', strokeDasharray: '3 3' }}
                  labelFormatter={(l, p) => `${l} · ${p?.[0]?.payload?.label ?? ''}`}
                  formatter={(v) => [`≈ ${v} ch`, 'Puissance']}
                />
                <Line type="monotone" dataKey="hp" stroke="var(--color-f1)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-f1)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted">
            Pic de l’ère turbo : en qualification, certains moteurs dépassaient largement 1 000 ch pour quelques tours. Fonds
            colorés : ères de la frise.
          </p>
        </Card>

        <Card title="Poids minimum réglementaire (kg)">
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MIN_WEIGHT} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
                <EraBands />
                <CartesianGrid {...GRID} />
                <XAxis dataKey="year" type="number" domain={[1958, 2026]} {...AXIS} ticks={[1960, 1970, 1980, 1990, 2000, 2010, 2020]} />
                <YAxis {...AXIS} domain={[400, 850]} />
                <ReferenceLine
                  x={1995}
                  stroke="var(--color-muted)"
                  strokeDasharray="4 4"
                  label={{ value: 'pilote inclus', fill: 'var(--color-muted)', fontSize: 10, position: 'insideTopLeft' }}
                />
                <Tooltip
                  {...TOOLTIP}
                  cursor={{ stroke: 'var(--color-muted)', strokeDasharray: '3 3' }}
                  formatter={(v, _n, item) => [`≈ ${v} kg ${item?.payload?.withDriver ? '(avec pilote)' : '(sans pilote)'}`, 'Poids min.']}
                />
                <Line type="stepAfter" dataKey="kg" stroke="var(--color-accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-accent)' }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="mt-2 text-xs text-muted">
            Jusqu’en 1994 le poids s’entend voiture seule, depuis 1995 pilote compris : le saut de 1995 est surtout un changement de
            définition. Les groupes propulseurs hybrides (2014) et les voitures de 2022 ont fait grimper le poids ; 2026 marque une
            baisse.
          </p>
        </Card>
      </div>

      <PoleTimes />
    </Page>
  )
}

function PoleTimes() {
  const { data, isLoading, error, refetch } = useCircuitPoles()
  const [circuit, setCircuit] = useState<'monza' | 'monaco'>('monza')

  return (
    <Card className="mt-6" title="Temps de pole sur un circuit historique">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex gap-1">
          {(['monza', 'monaco'] as const).map((c) => (
            <button
              key={c}
              onClick={() => setCircuit(c)}
              aria-pressed={circuit === c}
              className={clsx(
                'rounded-md px-3 py-1 text-xs font-bold transition-colors',
                circuit === c ? 'bg-text text-bg' : 'bg-surface-2 text-muted hover:text-text',
              )}
            >
              {c === 'monza' ? 'Monza' : 'Monaco'}
            </button>
          ))}
        </div>
        <span className="flex items-center gap-1.5 text-xs text-muted">
          <Database size={13} aria-hidden /> Source : Jolpica (qualifications)
        </span>
      </div>
      {isLoading && <Loader />}
      {error && <ErrorState error={error} onRetry={() => refetch()} />}
      {data && (() => {
        const c = data.circuits[circuit]
        if (!c?.poles.length) return <p className="text-sm text-muted">Pas de données.</p>
        const best = c.poles.reduce((m, p) => (p.seconds < m.seconds ? p : m))
        const min = Math.floor(Math.min(...c.poles.map((p) => p.seconds)) - 2)
        const max = Math.ceil(Math.max(...c.poles.map((p) => p.seconds)) + 2)
        const fmt = (s: number) => `${Math.floor(s / 60)}:${(s % 60).toFixed(3).padStart(6, '0')}`
        return (
          <>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={c.poles} margin={{ top: 8, right: 12, bottom: 0, left: 8 }}>
                  <CartesianGrid {...GRID} />
                  <XAxis dataKey="year" type="number" domain={['dataMin', 'dataMax']} {...AXIS} allowDecimals={false} />
                  <YAxis {...AXIS} domain={[min, max]} tickFormatter={(v) => fmt(Number(v)).replace(/\.\d+$/, '')} width={48} />
                  <ReferenceLine y={best.seconds} stroke="var(--color-warn)" strokeDasharray="4 4" />
                  <Tooltip
                    {...TOOLTIP}
                    cursor={{ stroke: 'var(--color-muted)', strokeDasharray: '3 3' }}
                    labelFormatter={(l) => `Saison ${l}`}
                    formatter={(_v, _n, item) => [`${item?.payload?.time} · ${item?.payload?.driver} (${item?.payload?.team})`, 'Pole']}
                  />
                  <Line type="linear" dataKey="seconds" stroke="var(--color-info)" strokeWidth={2} dot={{ r: 3, fill: 'var(--color-info)' }} activeDot={{ r: 5 }} connectNulls={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-xs text-muted">
              Meilleur temps : <b className="text-warn">{best.time}</b> par {best.driver} ({best.year}). {LAYOUT_NOTES[circuit]} Les
              pics correspondent à des qualifications sous la pluie ; certaines années manquent dans la base (données de qualification
              incomplètes avant 2003). Plus bas = plus rapide.
            </p>
          </>
        )
      })()}
    </Card>
  )
}
