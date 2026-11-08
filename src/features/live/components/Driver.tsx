import clsx from 'clsx'
import { TeamStripe } from '@/components/ui'
import type { Driver } from '../lib/api'
import { teamColor } from '../lib/format'

export function DriverLabel({ driver, number, full }: { driver?: Driver; number: number; full?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap">
      <TeamStripe color={driver?.team_colour} />
      <span className="font-bold">{driver?.name_acronym ?? `#${number}`}</span>
      {full && driver && <span className="hidden text-muted sm:inline">{driver.team_name}</span>}
    </span>
  )
}

/** Toggle chips to pick several drivers. */
export function DriverChips({
  drivers, selected, onToggle, max,
}: { drivers: Driver[]; selected: number[]; onToggle: (n: number) => void; max?: number }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {drivers.map((d) => {
        const on = selected.includes(d.driver_number)
        const disabled = !on && max != null && selected.length >= max
        return (
          <button
            key={d.driver_number}
            disabled={disabled}
            onClick={() => onToggle(d.driver_number)}
            className={clsx(
              'rounded-md border px-2 py-0.5 text-xs font-bold transition',
              on ? 'text-bg' : 'border-border text-muted hover:text-text',
              disabled && 'opacity-40',
            )}
            style={on ? { background: teamColor(d.team_colour), borderColor: teamColor(d.team_colour) } : undefined}
          >
            {d.name_acronym}
          </button>
        )
      })}
    </div>
  )
}

/**
 * Teammates share a team colour: the second driver of a team (by driver list order) gets a dashed line.
 */
export function dashMap(drivers: Driver[]) {
  const seen = new Set<string>()
  const dash = new Map<number, boolean>()
  for (const d of drivers) {
    dash.set(d.driver_number, seen.has(d.team_name))
    seen.add(d.team_name)
  }
  return dash
}
