import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { Loader, Page } from '@/components/ui'
import { HistoryNav } from './components/HistoryNav'
import TimelinePage from './components/timeline/TimelinePage'

const EventsPage = lazy(() => import('./components/events/EventsPage'))
const ChampionsPage = lazy(() => import('./components/champions/ChampionsPage'))
const SeasonPage = lazy(() => import('./components/season/SeasonPage'))
const RecordsPage = lazy(() => import('./components/records/RecordsPage'))
const TechPage = lazy(() => import('./components/tech/TechPage'))

/** Module Histoire : frise des ères, faits marquants, champions, saisons, records, évolution technique. */
export default function HistoryModule() {
  return (
    <div>
      <HistoryNav />
      <Suspense fallback={<Page><Loader /></Page>}>
        <Routes>
          <Route index element={<TimelinePage />} />
          <Route path="events" element={<EventsPage />} />
          <Route path="champions" element={<ChampionsPage />} />
          <Route path="season" element={<Navigate to={`/history/season/${new Date().getFullYear() - 1}`} replace />} />
          <Route path="season/:year" element={<SeasonPage />} />
          <Route path="records" element={<RecordsPage />} />
          <Route path="tech" element={<TechPage />} />
          <Route path="*" element={<Navigate to="/history" replace />} />
        </Routes>
      </Suspense>
    </div>
  )
}
