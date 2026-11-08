import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import { Cog } from 'lucide-react'
import type { DriverInfo, Era, HistoryEvent, SeasonChampions } from '../../data/types'
import { EVENT_CATEGORIES } from '../../data/events'
import { formatPartialDate } from '../../lib/format'
import { CarSilhouette } from '../CarSilhouette'

interface Props {
  era: Era
  index: number
  events: HistoryEvent[]
  champions: SeasonChampions[]
  drivers: Record<string, DriverInfo>
}

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as const },
}

export function EraSection({ era, index, events, champions, drivers }: Props) {
  const years = era.start === era.end ? `${era.start}` : `${era.start}–${era.end}`
  return (
    <section id={`era-${era.id}`} className="relative scroll-mt-32 pb-16 pl-9 md:pl-12" aria-labelledby={`era-title-${era.id}`}>
      {/* repère sur le rail */}
      <motion.span
        initial={{ scale: 0 }}
        whileInView={{ scale: 1 }}
        viewport={{ once: true }}
        className="absolute left-0 top-2 grid h-6 w-6 place-items-center rounded-full border-2 bg-bg md:h-8 md:w-8"
        style={{ borderColor: era.color }}
        aria-hidden
      >
        <span className="h-2 w-2 rounded-full md:h-3 md:w-3" style={{ background: era.color }} />
      </motion.span>

      <motion.div {...reveal}>
        <p className="font-mono text-xs uppercase tracking-[0.25em]" style={{ color: era.color }}>
          Ère {String(index + 1).padStart(2, '0')} · {years}
        </p>
        <h2 id={`era-title-${era.id}`} className="mt-1 text-3xl font-black tracking-tight md:text-5xl">
          {era.title}
        </h2>
        <p className="mt-1 text-lg font-semibold text-muted">{era.subtitle}</p>
      </motion.div>

      <div
        className="mt-6 overflow-hidden rounded-2xl border border-border bg-surface"
        style={{ boxShadow: `inset 4px 0 0 ${era.color}` }}
      >
        <div className="grid gap-6 p-5 md:p-6">
          <motion.div {...reveal} className="grid gap-6 lg:grid-cols-[1.3fr_1fr]">
            <p className="text-base leading-relaxed md:text-[17px]">{era.description}</p>
            <div>
            <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
              <Cog size={14} aria-hidden /> Innovations et règles clés
            </h3>
            <ul className="mt-2 space-y-1.5">
              {era.innovations.map((inn) => (
                <li key={inn} className="flex gap-2 text-sm">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rotate-45" style={{ background: era.color }} />
                  {inn}
                </li>
              ))}
            </ul>
            </div>
          </motion.div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {era.cars.map((car, i) => (
              <motion.figure
                key={car.name}
                initial={{ opacity: 0, x: 40 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: '-60px' }}
                transition={{ delay: i * 0.08, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="rounded-xl border border-border bg-surface-2/60 p-3"
              >
                <div
                  className="rounded-lg px-2 pt-2"
                  style={{ background: `linear-gradient(180deg, transparent 40%, ${era.color}22)` }}
                >
                  <CarSilhouette shape={era.shape} color={car.color} accent={car.accent} title={`Silhouette stylisée : ${car.name}`} className="w-full" />
                </div>
                <figcaption className="mt-2">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="font-bold">{car.name}</span>
                    <span className="font-mono text-xs text-muted">{car.year}</span>
                  </div>
                  <p className="text-xs text-muted">{car.note}</p>
                </figcaption>
              </motion.figure>
            ))}
          </div>
        </div>

        {events.length > 0 && (
          <div className="border-t border-border bg-bg/30 p-5 md:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Moments clés</h3>
            <ol className="mt-3 grid gap-3 md:grid-cols-2">
              {events.map((ev) => (
                <motion.li key={ev.id} {...reveal} className="flex gap-3">
                  <span
                    className="mt-1 h-full w-0.5 shrink-0 self-stretch rounded"
                    style={{ background: EVENT_CATEGORIES[ev.category].color }}
                  />
                  <div>
                    <p className="font-mono text-xs text-muted">
                      {formatPartialDate(ev.date)}
                      {ev.place ? ` · ${ev.place}` : ''}
                    </p>
                    <p className="font-bold leading-tight">{ev.title}</p>
                    <p className="mt-0.5 text-sm text-muted">{ev.text}</p>
                  </div>
                </motion.li>
              ))}
            </ol>
          </div>
        )}

        {champions.length > 0 && (
          <div className="border-t border-border p-5 md:p-6">
            <h3 className="text-xs font-bold uppercase tracking-wider text-muted">Champions de l’ère</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {champions.map((c) => {
                const d = c.drivers[0]
                if (!d) return null
                return (
                  <Link
                    key={c.year}
                    to={`/history/season/${c.year}`}
                    className="group flex items-center gap-2 rounded-md border border-border bg-surface-2/50 px-2 py-1 text-xs transition-colors hover:border-text/40"
                  >
                    <span className="font-mono font-bold" style={{ color: era.color }}>
                      {c.year}
                    </span>
                    <span className="font-semibold">{drivers[d.id]?.name ?? d.id}</span>
                    {c.inProgress && <span className="text-warn">(en tête, en cours)</span>}
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
