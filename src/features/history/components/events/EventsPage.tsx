import { useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Search, Star } from 'lucide-react'
import clsx from 'clsx'
import { Page, PageHeader } from '@/components/ui'
import { EVENT_CATEGORIES, EVENTS } from '../../data/events'
import { eraForYear } from '../../data/eras'
import type { EventCategory } from '../../data/types'
import { formatPartialDate, yearOf } from '../../lib/format'

const DECADES = [1950, 1960, 1970, 1980, 1990, 2000, 2010, 2020]
const CATS = Object.keys(EVENT_CATEGORIES) as EventCategory[]

/** Faits marquants filtrables par catégorie, décennie et texte. */
export default function EventsPage() {
  const [cats, setCats] = useState<Set<EventCategory>>(new Set())
  const [decade, setDecade] = useState<number | null>(null)
  const [query, setQuery] = useState('')
  const [onlyHighlights, setOnlyHighlights] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return [...EVENTS]
      .sort((a, b) => a.date.localeCompare(b.date))
      .filter((e) => (cats.size ? cats.has(e.category) : true))
      .filter((e) => (decade ? yearOf(e.date) >= decade && yearOf(e.date) < decade + 10 : true))
      .filter((e) => (onlyHighlights ? e.highlight : true))
      .filter((e) => (q ? `${e.title} ${e.text} ${e.place ?? ''}`.toLowerCase().includes(q) : true))
  }, [cats, decade, query, onlyHighlights])

  const groups = useMemo(() => {
    const m = new Map<number, typeof filtered>()
    for (const e of filtered) {
      const d = Math.floor(yearOf(e.date) / 10) * 10
      m.set(d, [...(m.get(d) ?? []), e])
    }
    return [...m.entries()]
  }, [filtered])

  const counts = useMemo(() => Object.fromEntries(CATS.map((c) => [c, EVENTS.filter((e) => e.category === c).length])), [])

  const toggleCat = (c: EventCategory) =>
    setCats((s) => {
      const n = new Set(s)
      if (n.has(c)) n.delete(c)
      else n.add(c)
      return n
    })

  return (
    <Page>
      <PageHeader
        title="Faits marquants"
        subtitle={`${EVENTS.length} événements datés, des premiers tours de roue de 1950 à la saison 2026. Lorsque la date exacte n’est pas établie avec certitude, seule l’année est indiquée.`}
      />

      {/* filtres */}
      <div className="mb-6 space-y-3 rounded-xl border border-border bg-surface p-4">
        <div className="flex flex-wrap items-center gap-2">
          {CATS.map((c) => {
            const on = cats.has(c)
            const { label, color } = EVENT_CATEGORIES[c]
            return (
              <button
                key={c}
                onClick={() => toggleCat(c)}
                aria-pressed={on}
                className={clsx(
                  'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-semibold transition-colors',
                  on ? 'border-transparent text-bg' : 'border-border text-muted hover:text-text',
                )}
                style={on ? { background: color } : undefined}
              >
                {!on && <span className="h-2 w-2 rounded-full" style={{ background: color }} />}
                {label}
                <span className="font-mono text-xs opacity-70">{counts[c]}</span>
              </button>
            )
          })}
          <button
            onClick={() => setOnlyHighlights((v) => !v)}
            aria-pressed={onlyHighlights}
            className={clsx(
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold transition-colors',
              onlyHighlights ? 'border-warn text-warn' : 'border-border text-muted hover:text-text',
            )}
          >
            <Star size={14} aria-hidden /> Incontournables
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative min-w-[200px] flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher (Senna, Monza, halo…)"
              className="w-full rounded-md border border-border bg-bg py-1.5 pl-9 pr-3 text-sm outline-none focus:border-f1"
            />
          </label>
          <div className="flex flex-wrap gap-1">
            <DecadeBtn on={decade === null} onClick={() => setDecade(null)}>
              Toutes
            </DecadeBtn>
            {DECADES.map((d) => (
              <DecadeBtn key={d} on={decade === d} onClick={() => setDecade(decade === d ? null : d)}>
                {`${String(d).slice(2)}s`}
              </DecadeBtn>
            ))}
          </div>
        </div>
        <p className="text-xs text-muted">
          {filtered.length} événement{filtered.length > 1 ? 's' : ''} affiché{filtered.length > 1 ? 's' : ''}
        </p>
      </div>

      {groups.length === 0 && <p className="py-12 text-center text-muted">Aucun événement ne correspond à ces filtres.</p>}

      <div className="space-y-10">
        {groups.map(([d, list]) => (
          <section key={d}>
            <h2 className="mb-4 flex items-baseline gap-3">
              <span className="text-5xl font-black tracking-tighter text-transparent [-webkit-text-stroke:1px_var(--color-muted)] md:text-6xl">
                {d}
              </span>
              <span className="text-sm text-muted">{eraForYear(d)?.title}</span>
            </h2>
            <ol className="relative grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <AnimatePresence mode="popLayout">
                {list.map((e) => {
                  const cat = EVENT_CATEGORIES[e.category]
                  return (
                    <motion.li
                      key={e.id}
                      layout
                      initial={{ opacity: 0, scale: 0.97 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.25 }}
                      className={clsx(
                        'relative overflow-hidden rounded-xl border bg-surface p-4',
                        e.highlight ? 'border-text/20' : 'border-border',
                      )}
                    >
                      <span className="absolute inset-y-0 left-0 w-1" style={{ background: cat.color }} />
                      <div className="flex items-center justify-between gap-2">
                        <time className="font-mono text-xs text-muted" dateTime={e.date}>
                          {formatPartialDate(e.date, true)}
                        </time>
                        <span className="rounded px-1.5 py-0.5 text-[11px] font-bold" style={{ color: cat.color, background: `${cat.color}1f` }}>
                          {cat.label}
                        </span>
                      </div>
                      <h3 className="mt-1 flex items-start gap-1.5 font-bold leading-snug">
                        {e.highlight && <Star size={14} className="mt-1 shrink-0 fill-warn text-warn" aria-label="Incontournable" />}
                        {e.title}
                      </h3>
                      {e.place && <p className="text-xs font-semibold text-muted">{e.place}</p>}
                      <p className="mt-1.5 text-sm leading-relaxed text-text/85">{e.text}</p>
                    </motion.li>
                  )
                })}
              </AnimatePresence>
            </ol>
          </section>
        ))}
      </div>
    </Page>
  )
}

function DecadeBtn({ on, onClick, children }: { on: boolean; onClick: () => void; children: string }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        'rounded-md px-2.5 py-1 font-mono text-xs font-bold transition-colors',
        on ? 'bg-text text-bg' : 'bg-surface-2 text-muted hover:text-text',
      )}
    >
      {children}
    </button>
  )
}
