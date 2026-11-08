import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, useScroll, useSpring } from 'motion/react'
import { ArrowRight } from 'lucide-react'
import { Page } from '@/components/ui'
import { ERAS } from '../../data/eras'
import { EVENTS } from '../../data/events'
import { useChampions } from '../../hooks/useChampions'
import { CarSilhouette } from '../CarSilhouette'
import { EraSection } from './EraSection'

const FIRST = ERAS[0].start
const LAST = ERAS[ERAS.length - 1].end
const SPAN = LAST - FIRST + 1

/** Page principale : frise verticale animée des ères de la F1. */
export default function TimelinePage() {
  const { data } = useChampions()
  const [active, setActive] = useState(ERAS[0].id)
  const { scrollYProgress } = useScroll()
  const progress = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 })
  const activeEra = ERAS.find((e) => e.id === active) ?? ERAS[0]

  // Ère visible : observe les sections pour la mini-navigation et la barre de progression.
  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]) setActive(visible[0].target.id.replace('era-', ''))
      },
      { rootMargin: '-35% 0px -55% 0px' },
    )
    ERAS.forEach((e) => {
      const el = document.getElementById(`era-${e.id}`)
      if (el) obs.observe(el)
    })
    return () => obs.disconnect()
  }, [])

  const eventsByEra = useMemo(
    () =>
      Object.fromEntries(
        ERAS.map((era) => [
          era.id,
          EVENTS.filter((ev) => {
            const y = Number(ev.date.slice(0, 4))
            return y >= era.start && y <= era.end && ev.highlight
          }),
        ]),
      ),
    [],
  )

  const scrollTo = (id: string) => document.getElementById(`era-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  return (
    <>
      {/* barre de progression de lecture, teintée par l'ère courante */}
      <motion.div
        className="fixed left-0 right-0 top-0 z-[60] h-1 origin-left"
        style={{ scaleX: progress, background: activeEra.color }}
        aria-hidden
      />

      {/* ——— En-tête magazine */}
      <header className="relative overflow-hidden border-b border-border">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          style={{
            background:
              'radial-gradient(60% 80% at 85% 20%, rgba(225,6,0,0.25), transparent 60%), radial-gradient(40% 60% at 10% 90%, rgba(0,210,190,0.12), transparent 60%)',
          }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'repeating-linear-gradient(135deg, #fff 0 1px, transparent 1px 14px)' }}
        />
        <Page className="relative py-12 md:py-16">
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-mono text-xs uppercase tracking-[0.3em] text-f1"
          >
            Histoire · {FIRST} — {LAST}
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] tracking-tight md:text-7xl"
          >
            {SPAN} saisons de <span className="text-f1">Formule 1</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mt-4 max-w-2xl text-lg text-muted"
          >
            Des cigares de Silverstone aux monoplaces à aérodynamique active : quatorze ères, leurs innovations, leurs drames et
            leurs légendes.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 60 }}
            className="mt-6 flex max-w-3xl items-end gap-2 md:gap-6"
          >
            <CarSilhouette shape="cigar" color="#b3121b" className="w-1/3 opacity-60" />
            <CarSilhouette shape="turbo" color="#f2f2f2" accent="#d7192d" className="w-1/3 opacity-80" />
            <CarSilhouette shape="active2026" color="#2a2f3a" accent="#ff2d55" className="w-1/3" />
          </motion.div>

          {/* ruban des ères, proportionnel à leur durée */}
          <div className="mt-10">
            <div className="flex h-10 w-full overflow-hidden rounded-md" role="list" aria-label="Ères de la Formule 1">
              {ERAS.map((era, i) => (
                <motion.button
                  key={era.id}
                  role="listitem"
                  onClick={() => scrollTo(era.id)}
                  title={`${era.title} (${era.start}–${era.end})`}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ delay: 0.25 + i * 0.03 }}
                  className="group relative h-full origin-bottom border-r border-bg/60 transition-[filter] last:border-r-0 hover:brightness-125"
                  style={{ flexGrow: era.end - era.start + 1, flexBasis: 0, background: era.color }}
                >
                  <span className="absolute inset-0 hidden items-center justify-center text-[10px] font-black text-black/70 md:flex">
                    {era.end - era.start >= 4 ? era.start : ''}
                  </span>
                </motion.button>
              ))}
            </div>
            <div className="mt-1 flex justify-between font-mono text-xs text-muted">
              <span>{FIRST}</span>
              <span>{LAST}</span>
            </div>
          </div>

          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <QuickLink to="/history/events">Faits marquants</QuickLink>
            <QuickLink to="/history/champions">Tous les champions</QuickLink>
            <QuickLink to={`/history/season/${LAST - 1}`}>Explorer une saison</QuickLink>
            <QuickLink to="/history/records">Records & duels</QuickLink>
          </div>
        </Page>
      </header>

      <Page className="relative">
        <div className="grid gap-8 lg:grid-cols-[180px_1fr]">
          {/* mini-navigation des ères (desktop) */}
          <aside className="hidden lg:block">
            <ol className="sticky top-32 space-y-1 border-l border-border">
              {ERAS.map((era) => (
                <li key={era.id}>
                  <button
                    onClick={() => scrollTo(era.id)}
                    className={`-ml-px block w-full border-l-2 py-1 pl-3 text-left text-xs transition-colors ${
                      active === era.id ? 'font-bold text-text' : 'border-transparent text-muted hover:text-text'
                    }`}
                    style={active === era.id ? { borderColor: era.color } : undefined}
                  >
                    <span className="font-mono">{era.start}</span> · {era.title}
                  </button>
                </li>
              ))}
            </ol>
          </aside>

          <div className="relative">
            {/* rail vertical */}
            <div className="absolute bottom-0 left-[11px] top-0 w-px bg-border md:left-[15px]" aria-hidden />
            {ERAS.map((era, i) => (
              <EraSection
                key={era.id}
                era={era}
                index={i}
                events={eventsByEra[era.id]}
                champions={data?.champions.filter((c) => c.year >= era.start && c.year <= era.end) ?? []}
                drivers={data?.drivers ?? {}}
              />
            ))}
          </div>
        </div>
      </Page>
    </>
  )
}

function QuickLink({ to, children }: { to: string; children: string }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-4 py-1.5 font-semibold transition-colors hover:border-f1 hover:text-f1"
    >
      {children} <ArrowRight size={14} aria-hidden />
    </Link>
  )
}
