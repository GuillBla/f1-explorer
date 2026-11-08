import type { ReactNode } from 'react'
import clsx from 'clsx'

/** Shared UI primitives. Modules should reuse these for visual consistency. */

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={clsx('mx-auto max-w-7xl px-4 py-8', className)}>{children}</div>
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight flex items-center gap-3">
          <span className="inline-block w-1.5 h-8 bg-f1 -skew-x-12" />
          {title}
        </h1>
        {subtitle && <p className="mt-2 text-muted max-w-3xl">{subtitle}</p>}
      </div>
      {actions}
    </div>
  )
}

export function Card({ children, className, title }: { children: ReactNode; className?: string; title?: ReactNode }) {
  return (
    <section className={clsx('rounded-xl border border-border bg-surface p-4', className)}>
      {title && <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-muted">{title}</h3>}
      {children}
    </section>
  )
}

export function Loader({ label = 'Chargement…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-16 text-muted">
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-f1 border-t-transparent" />
      {label}
    </div>
  )
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const msg = error instanceof Error ? error.message : String(error)
  return (
    <div className="rounded-xl border border-f1/40 bg-f1/10 p-4 text-sm">
      <p className="font-semibold text-f1">Impossible de charger les données</p>
      <p className="mt-1 text-muted">{msg}</p>
      {onRetry && (
        <button onClick={onRetry} className="mt-3 rounded-md bg-f1 px-3 py-1 font-semibold text-white">
          Réessayer
        </button>
      )}
    </div>
  )
}

export function Badge({ children, color }: { children: ReactNode; color?: string }) {
  return (
    <span
      className="inline-flex items-center rounded px-1.5 py-0.5 text-xs font-bold"
      style={color ? { background: `${color}22`, color } : undefined}
    >
      {children}
    </span>
  )
}

/** Vertical team-colour stripe. Accepts OpenF1 colours ("3671C6") or CSS colours. */
export function TeamStripe({ color }: { color?: string | null }) {
  const c = color ? (color.startsWith('#') ? color : `#${color}`) : '#888'
  return <span className="inline-block h-4 w-1 rounded-sm" style={{ background: c }} />
}
