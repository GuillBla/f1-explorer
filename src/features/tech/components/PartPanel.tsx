import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Wind, X } from 'lucide-react'
import { PARTS } from '../content/parts'
import { SHEET_TITLES } from '../content/sheets'
import type { PartId } from '../types'

/** Detailed information panel of a car component. */
export function PartPanel({ id, onClose }: { id: PartId; onClose: () => void }) {
  const p = PARTS[id]
  return (
    <article className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-surface/95 shadow-2xl backdrop-blur">
      <header className="flex items-start justify-between gap-3 border-b border-border p-4">
        <div>
          <div className="text-[11px] font-bold uppercase tracking-widest text-accent">Composant</div>
          <h2 className="text-xl font-black leading-tight">{p.name}</h2>
        </div>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-muted hover:bg-surface-2 hover:text-text" aria-label="Fermer le panneau">
          <X size={18} />
        </button>
      </header>
      <div className="flex-1 space-y-5 overflow-y-auto p-4 text-sm leading-relaxed">
        <p className="text-base font-semibold text-text">{p.role}</p>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Fonctionnement</h3>
          <div className="space-y-2 text-text/90">
            {p.how.map((t, i) => (
              <p key={i}>{t}</p>
            ))}
          </div>
        </section>

        <section>
          <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Chiffres clés</h3>
          <dl className="grid grid-cols-2 gap-2">
            {p.figures.map((f) => (
              <div key={f.label} className="rounded-lg border border-border bg-bg/60 p-2">
                <dt className="text-[11px] text-muted">{f.label}</dt>
                <dd className="font-mono font-bold text-accent">{f.value}</dd>
                {f.note && <dd className="mt-0.5 text-[11px] leading-snug text-muted">{f.note}</dd>}
              </div>
            ))}
          </dl>
        </section>

        <section className="rounded-lg border border-f1/40 bg-f1/10 p-3">
          <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-f1">Règlement 2026</h3>
          <p>{p.y2026}</p>
        </section>

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

        <div className="flex flex-wrap gap-2 pb-1">
          {p.sheet && (
            <Link
              to={`/tech/fiches/${p.sheet}`}
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-bold hover:text-accent"
            >
              <BookOpen size={14} /> Fiche : {SHEET_TITLES[p.sheet]} <ArrowRight size={12} />
            </Link>
          )}
          {p.aero && (
            <Link
              to="/tech/soufflerie"
              className="inline-flex items-center gap-1.5 rounded-md bg-surface-2 px-3 py-1.5 text-xs font-bold hover:text-accent"
            >
              <Wind size={14} /> Voir en soufflerie <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </article>
  )
}
