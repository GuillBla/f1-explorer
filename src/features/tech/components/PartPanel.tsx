import { Link } from 'react-router-dom'
import clsx from 'clsx'
import { AlertTriangle, ArrowRight, BookOpen, ChevronRight, Focus, Wind, X } from 'lucide-react'
import { PART_SUBS, PARTS, SUBS } from '../content/parts'
import { SHEET_TITLES } from '../content/sheets'
import { useExplorerStore } from '../store'
import type { KeyFigure, PartId } from '../types'

/** Detailed information panel of a car component or of one of its sub-components. */
export function PartPanel({ id, sub, onClose }: { id: PartId; sub?: string | null; onClose: () => void }) {
  const p = PARTS[id]
  const s = sub ? SUBS[sub] : undefined
  const isolate = useExplorerStore((st) => st.isolate)
  const toggleIsolate = useExplorerStore((st) => st.toggleIsolate)
  const select = useExplorerStore((st) => st.select)
  const selectSub = useExplorerStore((st) => st.selectSub)
  const resetView = useExplorerStore((st) => st.resetView)
  const children = PART_SUBS[id] ?? []

  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-2xl backdrop-blur">
      <header className="border-b border-border p-4">
        <nav aria-label="Fil d’Ariane" className="mb-1 flex flex-wrap items-center gap-0.5 text-[11px] font-bold uppercase tracking-widest">
          <button type="button" onClick={resetView} className="text-muted hover:text-accent">
            Voiture
          </button>
          <ChevronRight size={12} className="text-muted" />
          <button type="button" onClick={() => select(id)} className={clsx(s ? 'text-muted hover:text-accent' : 'text-accent')} aria-current={s ? undefined : 'page'}>
            {p.short}
          </button>
          {s && (
            <>
              <ChevronRight size={12} className="text-muted" />
              <span className="text-accent" aria-current="page">
                {s.name}
              </span>
            </>
          )}
        </nav>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-xl font-black leading-tight">{s ? s.name : p.name}</h2>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={toggleIsolate}
              aria-pressed={isolate}
              title="Isoler : estomper le reste de la voiture"
              className={clsx(
                'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold transition-colors',
                isolate ? 'border-accent bg-accent/15 text-accent' : 'border-border text-muted hover:text-text',
              )}
            >
              <Focus size={14} /> Isoler
            </button>
            <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label="Fermer le panneau">
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-relaxed">
        <p className="text-base font-semibold text-text">{s ? s.role : p.role}</p>

        {children.length > 0 && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{s ? 'Autres éléments du composant' : 'Sous-composants'}</h3>
            <div className="flex flex-wrap gap-1.5">
              {children.map((cid) => (
                <button
                  key={cid}
                  type="button"
                  onClick={() => selectSub(id, cid)}
                  className={clsx(
                    'rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
                    cid === sub ? 'border-f1 bg-f1 text-white' : 'border-border bg-bg/60 text-muted hover:text-text',
                  )}
                >
                  {SUBS[cid].name}
                </button>
              ))}
            </div>
          </section>
        )}

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Fonctionnement</h3>
          <div className="space-y-2 text-text/90">
            {(s ? s.how : p.how).map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </section>

        {s && (
          <section>
            <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-muted">Matériaux</h3>
            <p className="text-text/90">{s.materials}</p>
          </section>
        )}

        <Figures figures={s ? s.figures : p.figures} />

        <section className="rounded-lg border border-f1/40 bg-f1/10 p-3">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-f1">Règlement 2026</h3>
          <p>{s ? s.y2026 : p.y2026}</p>
        </section>

        {s?.caveat && (
          <section className="flex gap-2 rounded-lg border border-warn/40 bg-warn/10 p-3 text-xs">
            <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warn" />
            <p>
              <span className="font-bold text-warn">À noter : </span>
              {s.caveat}
            </p>
          </section>
        )}

        {!s && (
          <section>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Évolution réglementaire</h3>
            <ol className="relative space-y-2 border-l border-border pl-4">
              {p.regulation.map((r) => (
                <li key={r.year + r.text}>
                  <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full border-2 border-surface bg-f1" />
                  <span className="font-mono text-xs font-bold text-warn">{r.year}</span>
                  <p className="text-text/90">{r.text}</p>
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="flex flex-wrap gap-2 pb-1">
          {p.sheet && (
            <Link to={`/tech/fiches/${p.sheet}`} className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-bold hover:text-accent">
              <BookOpen size={14} /> Fiche : {SHEET_TITLES[p.sheet]} <ArrowRight size={12} />
            </Link>
          )}
          {p.aero && (
            <Link to="/tech/soufflerie" className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-bold hover:text-accent">
              <Wind size={14} /> Voir en soufflerie <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}

function Figures({ figures }: { figures: KeyFigure[] }) {
  if (figures.length === 0) return null
  return (
    <section>
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Chiffres clés</h3>
      <dl className="grid grid-cols-2 gap-2">
        {figures.map((f) => (
          <div key={f.label} className="rounded-lg border border-border bg-bg/60 p-2">
            <dt className="text-[11px] text-muted">{f.label}</dt>
            <dd className="font-mono font-bold text-accent">{f.value}</dd>
            {f.note && <dd className="mt-0.5 text-[11px] leading-snug text-muted">{f.note}</dd>}
          </div>
        ))}
      </dl>
    </section>
  )
}
