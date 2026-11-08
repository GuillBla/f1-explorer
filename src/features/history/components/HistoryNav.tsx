import { NavLink } from 'react-router-dom'
import clsx from 'clsx'
import { Award, CalendarRange, Clock, Gauge, Sparkles, Trophy } from 'lucide-react'

const TABS = [
  { to: '/history', label: 'Frise', icon: Clock, end: true },
  { to: '/history/events', label: 'Faits marquants', icon: Sparkles },
  { to: '/history/champions', label: 'Champions', icon: Trophy },
  { to: '/history/season', label: 'Saisons', icon: CalendarRange },
  { to: '/history/records', label: 'Records & duels', icon: Award },
  { to: '/history/tech', label: 'Évolution technique', icon: Gauge },
]

/** Sous-navigation du module, collante sous l'en-tête du site. */
export function HistoryNav() {
  return (
    <nav className="sticky top-14 z-20 border-b border-border bg-bg/85 backdrop-blur" aria-label="Sections Histoire">
      <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 py-2 [scrollbar-width:none]">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'flex shrink-0 items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-semibold transition-colors',
                isActive ? 'bg-f1 text-white' : 'text-muted hover:bg-surface-2 hover:text-text',
              )
            }
          >
            <Icon size={15} aria-hidden />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
