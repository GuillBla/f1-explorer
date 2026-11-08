import type { ReactNode } from 'react'
import clsx from 'clsx'

/** Small local UI primitives of the Technique module (built on the shared theme tokens). */

export function ToggleButton({
  active,
  onClick,
  icon,
  children,
  title,
}: {
  active: boolean
  onClick: () => void
  icon?: ReactNode
  children: ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-pressed={active}
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-md border px-3 py-1.5 text-sm font-semibold transition-colors',
        active ? 'border-accent bg-accent/15 text-accent' : 'border-border bg-surface text-muted hover:bg-surface-2 hover:text-text',
      )}
    >
      {icon}
      {children}
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label?: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md border border-border bg-bg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={clsx(
            'rounded px-2.5 py-1 text-xs font-bold transition-colors',
            value === o.value ? 'bg-f1 text-white' : 'text-muted hover:text-text',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
  hint,
}: {
  label: string
  value: number
  min: number
  max: number
  step?: number
  unit?: string
  onChange: (v: number) => void
  hint?: ReactNode
}) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between text-sm">
        <span className="font-semibold">{label}</span>
        <span className="font-mono text-accent">
          {value.toLocaleString('fr-FR')}
          {unit && <span className="ml-0.5 text-muted">{unit}</span>}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-[var(--color-f1)]"
      />
      {hint && <span className="mt-0.5 block text-xs text-muted">{hint}</span>}
    </label>
  )
}

export function Switch({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-surface-2"
    >
      <span className={clsx('mt-0.5 inline-flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-f1' : 'bg-border')}>
        <span className={clsx('h-4 w-4 rounded-full bg-white transition-transform', checked && 'translate-x-4')} />
      </span>
      <span>
        <span className="block text-sm font-semibold">{label}</span>
        {desc && <span className="block text-xs text-muted">{desc}</span>}
      </span>
    </button>
  )
}

export function Stat({ label, value, unit, sub, tone = 'text' }: { label: string; value: string; unit?: string; sub?: ReactNode; tone?: 'text' | 'accent' | 'warn' | 'f1' | 'ok' | 'info' }) {
  const toneCls = { text: 'text-text', accent: 'text-accent', warn: 'text-warn', f1: 'text-f1', ok: 'text-ok', info: 'text-info' }[tone]
  return (
    <div className="rounded-lg border border-border bg-bg/60 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={clsx('mt-0.5 font-mono text-xl font-bold leading-tight', toneCls)}>
        {value}
        {unit && <span className="ml-1 text-xs font-semibold text-muted">{unit}</span>}
      </div>
      {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
    </div>
  )
}
