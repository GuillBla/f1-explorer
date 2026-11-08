import { useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Search } from 'lucide-react'
import { Card, ErrorState, Loader, Page, PageHeader } from '@/components/ui'
import { useCircuitList, useSchedule, useTracks } from '../lib/data'
import type { CircuitType, Continent } from '../data/types'
import { TYPE_LABEL } from '../data/circuits'
import { CircuitCard } from '../components/CircuitCard'
import { WorldMap } from '../components/WorldMap'

type Scope = 'calendar' | 'others' | 'all'
const CONTINENTS: Continent[] = ['Europe', 'Asie', 'Moyen-Orient', 'Amérique du Nord', 'Amérique du Sud', 'Océanie', 'Afrique']

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        'rounded-full border px-3 py-1 text-xs font-semibold transition',
        active ? 'border-f1 bg-f1/15 text-text' : 'border-border text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  )
}

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

export default function CircuitsList() {
  const schedule = useSchedule()
  const tracks = useTracks()
  const items = useCircuitList(schedule.data)
  const [scope, setScope] = useState<Scope>('calendar')
  const [type, setType] = useState<CircuitType | 'all'>('all')
  const [continent, setContinent] = useState<Continent | 'all'>('all')
  const [q, setQ] = useState('')
  const [now] = useState(() => Date.now())

  const season = schedule.data?.[0]?.season

  const filtered = useMemo(() => {
    const nq = norm(q.trim())
    return items
      .filter(({ info, race }) => {
        // without the live schedule, fall back on the editorial 2026 flag
        const inCal = schedule.data ? !!race : !!info.calendar2026
        return scope === 'all' ? true : scope === 'calendar' ? inCal : !inCal
      })
      .filter(({ info }) => type === 'all' || info.type === type)
      .filter(({ info }) => continent === 'all' || info.continent === continent)
      .filter(({ info }) => !nq || norm(`${info.name} ${info.shortName} ${info.locality} ${info.country}`).includes(nq))
      .sort((a, b) => {
        if (a.race && b.race) return +a.race.round - +b.race.round
        if (a.race) return -1
        if (b.race) return 1
        return a.info.shortName.localeCompare(b.info.shortName, 'fr')
      })
  }, [items, scope, type, continent, q, schedule.data])

  const highlight = useMemo(() => new Set(filtered.map((f) => f.info.id)), [filtered])

  return (
    <Page>
      <PageHeader
        title="Circuits"
        subtitle="Tous les tracés du calendrier en cours et les circuits historiques marquants : tracé, virages célèbres, fiche technique, palmarès et météo."
      />

      <Card className="mb-6" title={season ? `Calendrier ${season} dans le monde` : 'Les circuits dans le monde'}>
        {schedule.isError && <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />}
        <WorldMap items={items} highlight={highlight.size < items.length ? highlight : undefined} />
      </Card>

      <div className="mb-4 flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={scope === 'calendar'} onClick={() => setScope('calendar')}>Calendrier {season ?? ''}</Chip>
          <Chip active={scope === 'others'} onClick={() => setScope('others')}>Historiques</Chip>
          <Chip active={scope === 'all'} onClick={() => setScope('all')}>Tous</Chip>
          <label className="ml-auto flex w-full items-center gap-2 rounded-lg border border-border bg-surface px-3 py-1.5 sm:w-64">
            <Search size={14} className="text-muted" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un circuit, un pays…"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted"
            />
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Type</span>
          <Chip active={type === 'all'} onClick={() => setType('all')}>Tous</Chip>
          {(Object.keys(TYPE_LABEL) as CircuitType[]).map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)}>{TYPE_LABEL[t]}</Chip>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted">Continent</span>
          <Chip active={continent === 'all'} onClick={() => setContinent('all')}>Tous</Chip>
          {CONTINENTS.map((c) => (
            <Chip key={c} active={continent === c} onClick={() => setContinent(c)}>{c}</Chip>
          ))}
        </div>
      </div>

      {schedule.isLoading && <Loader label="Chargement du calendrier…" />}
      {tracks.isError && <ErrorState error={tracks.error} onRetry={() => tracks.refetch()} />}

      {!schedule.isLoading && filtered.length === 0 && (
        <p className="py-12 text-center text-muted">Aucun circuit ne correspond à ces filtres.</p>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map(({ info, race }) => (
          <CircuitCard key={info.id} info={info} race={race} feature={tracks.data?.get(info.geoId)} now={now} />
        ))}
      </div>

      <p className="mt-8 text-xs text-muted">
        Tracés : <a className="underline" href="https://github.com/bacinger/f1-circuits" target="_blank" rel="noreferrer">bacinger/f1-circuits</a> (MIT) ·
        Fonds de carte : world-atlas / Natural Earth (ISC) · Calendrier : Jolpica-F1.
      </p>
    </Page>
  )
}
