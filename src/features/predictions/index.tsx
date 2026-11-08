import { NavLink, Route, Routes } from 'react-router-dom'
import clsx from 'clsx'
import { CloudSun, Flag, Timer, Trophy } from 'lucide-react'
import { Page, PageHeader } from '@/components/ui'
import WeatherPage from './components/WeatherPage'
import RacePredictionPage from './components/RacePredictionPage'
import LiveProjectionPage from './components/LiveProjectionPage'
import ChampionshipPage from './components/ChampionshipPage'

const TABS = [
  { to: '', label: 'Météo & alertes', icon: CloudSun, end: true },
  { to: 'course', label: 'Avant la course', icon: Flag, end: false },
  { to: 'en-course', label: 'Pendant / après', icon: Timer, end: false },
  { to: 'championnat', label: 'Championnat', icon: Trophy, end: false },
]

export default function PredictionsModule() {
  return (
    <Page>
      <PageHeader
        title="Prédictions & météo"
        subtitle="Alertes météo par session, probabilités de course, projection en direct et simulation du championnat. Tout est calculé dans votre navigateur, avec des modèles volontairement simples et expliqués."
      />
      <nav className="mb-6 flex gap-1 overflow-x-auto border-b border-border" aria-label="Sections du module">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                '-mb-px flex items-center gap-2 whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold transition-colors',
                isActive ? 'border-f1 text-text' : 'border-transparent text-muted hover:text-text',
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>
      <Routes>
        <Route index element={<WeatherPage />} />
        <Route path="course" element={<RacePredictionPage />} />
        <Route path="en-course" element={<LiveProjectionPage />} />
        <Route path="championnat" element={<ChampionshipPage />} />
      </Routes>
    </Page>
  )
}
