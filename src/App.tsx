import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import Home from './components/Home'
import { Loader } from './components/ui'

// Each module owns src/features/<name>/ and exports a default page component
// from index.tsx. Modules may declare nested <Routes> internally (mounted with /*).
const Live = lazy(() => import('./features/live'))
const Tech = lazy(() => import('./features/tech'))
const Predictions = lazy(() => import('./features/predictions'))
const Circuits = lazy(() => import('./features/circuits'))
const History = lazy(() => import('./features/history'))

export default function App() {
  return (
    <Layout>
      <Suspense fallback={<Loader label="Chargement du module…" />}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/live/*" element={<Live />} />
          <Route path="/tech/*" element={<Tech />} />
          <Route path="/predictions/*" element={<Predictions />} />
          <Route path="/circuits/*" element={<Circuits />} />
          <Route path="/history/*" element={<History />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}
