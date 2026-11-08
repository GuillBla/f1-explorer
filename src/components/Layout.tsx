import type { ReactNode } from 'react'
import { NavLink, Link } from 'react-router-dom'
import clsx from 'clsx'
import { NAV } from './nav'

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-full flex flex-col">
      <header className="sticky top-0 z-50 border-b border-border bg-bg/85 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-6">
          <Link to="/" className="flex items-center gap-2 font-black tracking-tight text-lg shrink-0">
            <span className="inline-block w-2 h-6 bg-f1 -skew-x-12" />
            F1<span className="text-f1">EXPLORER</span>
          </Link>
          <nav className="flex gap-1 overflow-x-auto">
            {NAV.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  clsx(
                    'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-semibold whitespace-nowrap transition-colors',
                    isActive ? 'bg-f1 text-white' : 'text-muted hover:text-text hover:bg-surface-2',
                  )
                }
              >
                <Icon size={16} />
                <span className="hidden md:inline">{label}</span>
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border text-xs text-muted py-4 text-center px-4">
        Projet non officiel, sans lien avec Formula 1®. Données : OpenF1, Jolpica-F1, Open-Meteo.
      </footer>
    </div>
  )
}
