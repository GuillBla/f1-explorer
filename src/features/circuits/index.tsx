import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router-dom'
import { Loader } from '@/components/ui'
import CircuitsList from './pages/CircuitsList'

const CircuitDetail = lazy(() => import('./pages/CircuitDetail'))

/** Circuits module — mounted on /circuits/* */
export default function CircuitsModule() {
  return (
    <Suspense fallback={<Loader />}>
      <Routes>
        <Route index element={<CircuitsList />} />
        <Route path=":id" element={<CircuitDetail />} />
      </Routes>
    </Suspense>
  )
}
