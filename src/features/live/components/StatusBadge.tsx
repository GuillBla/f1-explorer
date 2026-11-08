import clsx from 'clsx'

export type DataState = 'live' | 'replay' | 'finished' | 'upcoming' | 'unavailable' | 'restricted'

const STYLES: Record<DataState, { label: string; cls: string; dot: string }> = {
  live: { label: 'En direct', cls: 'border-f1/50 bg-f1/15 text-f1', dot: 'bg-f1 animate-pulse' },
  replay: { label: 'Replay', cls: 'border-info/50 bg-info/15 text-info', dot: 'bg-info' },
  finished: { label: 'Session terminée', cls: 'border-ok/40 bg-ok/10 text-ok', dot: 'bg-ok' },
  upcoming: { label: 'À venir', cls: 'border-border bg-surface-2 text-muted', dot: 'bg-muted' },
  unavailable: { label: 'Données indisponibles', cls: 'border-warn/50 bg-warn/10 text-warn', dot: 'bg-warn' },
  restricted: { label: 'Temps réel réservé', cls: 'border-warn/50 bg-warn/10 text-warn', dot: 'bg-warn' },
}

export function StatusBadge({ state }: { state: DataState }) {
  const s = STYLES[state]
  return (
    <span className={clsx('inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wider', s.cls)}>
      <span className={clsx('h-2 w-2 rounded-full', s.dot)} />
      {s.label}
    </span>
  )
}
