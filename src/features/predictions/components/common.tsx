import { useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { ChevronDown, Info, AlertTriangle, AlertOctagon } from 'lucide-react'
import type { AlertLevel } from '../models/weather'

export const pct = (x: number, digits = 0) => {
  if (!Number.isFinite(x)) return '—'
  const v = x * 100
  if (v > 0 && v < 0.5 && digits === 0) return '<1 %'
  return `${v.toFixed(digits)} %`
}

export const num = (x: number | null | undefined, d = 0) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d).replace('.', ','))

/** Collapsible "Comment ça marche ?" panel explaining a model. */
export function HowItWorks({ children, title = 'Comment ça marche ?' }: { children: ReactNode; title?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="rounded-xl border border-border bg-surface-2/40">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left font-bold" aria-expanded={open}>
        <span className="flex items-center gap-2"><Info size={16} className="text-info" />{title}</span>
        <ChevronDown size={18} className={clsx('transition-transform text-muted', open && 'rotate-180')} />
      </button>
      {open && <div className="space-y-3 border-t border-border px-4 py-4 text-sm leading-relaxed text-muted [&_strong]:text-text [&_code]:font-mono [&_code]:text-accent">{children}</div>}
    </section>
  )
}

export const LEVEL_STYLE: Record<AlertLevel, { label: string; text: string; bg: string; border: string; Icon: typeof Info }> = {
  info: { label: 'Info', text: 'text-info', bg: 'bg-info/10', border: 'border-info/40', Icon: Info },
  vigilance: { label: 'Vigilance', text: 'text-warn', bg: 'bg-warn/10', border: 'border-warn/50', Icon: AlertTriangle },
  alerte: { label: 'Alerte', text: 'text-f1', bg: 'bg-f1/10', border: 'border-f1/60', Icon: AlertOctagon },
}

export function LevelBadge({ level }: { level: AlertLevel }) {
  const s = LEVEL_STYLE[level]
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-bold uppercase tracking-wide', s.text, s.bg)}>
      <s.Icon size={12} />
      {s.label}
    </span>
  )
}

export function Stat({ label, value, sub, className }: { label: ReactNode; value: ReactNode; sub?: ReactNode; className?: string }) {
  return (
    <div className={clsx('rounded-lg border border-border bg-surface-2/50 px-3 py-2', className)}>
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  )
}

/** Inline horizontal probability bar (table cell). */
export function ProbBar({ value, color = 'var(--color-accent)' }: { value: number; color?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-16 sm:w-24 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${Math.min(100, value * 100)}%`, background: color }} />
      </div>
      <span className="w-12 text-right font-mono text-xs tabular-nums">{pct(value)}</span>
    </div>
  )
}

export function Select<T extends string | number>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[]; label?: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wider text-muted">
      {label}
      <select
        value={String(value)}
        onChange={(e) => {
          const o = options.find((x) => String(x.value) === e.target.value)
          if (o) onChange(o.value)
        }}
        className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm font-normal normal-case tracking-normal text-text"
      >
        {options.map((o) => (
          <option key={String(o.value)} value={String(o.value)}>{o.label}</option>
        ))}
      </select>
    </label>
  )
}

/** Recharts tooltip styling shared by the module. */
export const tooltipStyle = {
  contentStyle: { background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12, color: 'var(--color-text)' },
  labelStyle: { color: 'var(--color-muted)', marginBottom: 4 },
  itemStyle: { color: 'var(--color-text)', padding: 0 },
}
export const axisProps = { stroke: 'var(--color-border)', tick: { fill: 'var(--color-muted)', fontSize: 11 }, tickLine: false }
