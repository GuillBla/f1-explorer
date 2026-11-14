import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import clsx from 'clsx'
import { Moon, Sun } from 'lucide-react'
import { NAV } from './nav'
import Logo from './Logo'
import { useTheme } from '@/lib/theme'

/**
 * Header: red band in light mode, carbon bar with a red top rule in dark mode.
 */
export default function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme()
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 bg-f1 text-on-f1 dark:bg-carbon dark:text-text dark:border-t-[3px] dark:border-t-f1 dark:border-b dark:border-b-border">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-stretch gap-6">
          <Link to="/" className="flex items-center shrink-0" aria-label="F1 Explorer, accueil">
            <Logo />
          </Link>
          <nav className="flex gap-1 overflow-x-auto min-w-0 [scrollbar-width:none]">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                title={label}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 px-3 text-sm font-semibold whitespace-nowrap border-b-[3px] transition-colors',
                    isActive
                      ? 'border-on-f1 opacity-100 dark:border-f1'
                      : 'border-transparent opacity-75 hover:opacity-100',
                  )
                }
              >
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
          <button
            onClick={toggle}
            className="ml-auto my-auto shrink-0 grid place-items-center h-9 w-9 rounded-full hover:bg-white/15 dark:hover:bg-surface-2 transition-colors"
            aria-label={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
            title={theme === 'dark' ? 'Mode clair' : 'Mode sombre'}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border text-xs text-muted py-6 px-4">
        <div className="mx-auto max-w-7xl flex flex-wrap items-center justify-between gap-3">
          <Logo size={13} className="text-text" />
          <span>Projet non officiel, sans lien avec Formula 1®. Données : OpenF1, Jolpica-F1, Open-Meteo.</span>
        </div>
      </footer>
    </div>
  )
}
