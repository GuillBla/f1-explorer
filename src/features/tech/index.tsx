import { lazy, Suspense } from 'react'
import { NavLink, Navigate, Route, Routes } from 'react-router-dom'
import clsx from 'clsx'
import { BookOpen, Box, Wind } from 'lucide-react'
import { Loader, Page, PageHeader } from '@/components/ui'

// Each tab is lazy-loaded: three.js is only downloaded for the 3D tabs.
const ExplorerPage = lazy(() => import('./components/ExplorerPage'))
const TunnelPage = lazy(() => import('./components/TunnelPage'))
const SheetsPage = lazy(() => import('./components/SheetsPage'))

const TABS = [
  { to: '/tech', end: true, label: 'Voiture 3D', icon: Box },
  { to: '/tech/soufflerie', end: false, label: 'Soufflerie', icon: Wind },
  { to: '/tech/fiches', end: false, label: 'Fiches', icon: BookOpen },
]

export default function TechModule() {
  return (
    <Page>
      <PageHeader
        title="Technique"
        subtitle="Démontez une F1 générique façon 2026 composant par composant, faites-la passer en soufflerie virtuelle et comprenez les principes clés."
      />
      <nav className="mb-6 flex gap-1 border-b border-border" aria-label="Sections du module Technique">
        {TABS.map(({ to, end, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                '-mb-px flex items-center gap-1.5 border-b-2 px-3 py-2 text-sm font-bold transition-colors',
                isActive ? 'border-f1 text-text' : 'border-transparent text-muted hover:text-text',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Suspense fallback={<Loader label="Chargement…" />}>
        <Routes>
          <Route index element={<ExplorerPage />} />
          <Route path="soufflerie" element={<TunnelPage />} />
          <Route path="fiches" element={<SheetsPage />} />
          <Route path="fiches/:sheetId" element={<SheetsPage />} />
          <Route path="*" element={<Navigate to="/tech" replace />} />
        </Routes>
      </Suspense>
    </Page>
  )
}
