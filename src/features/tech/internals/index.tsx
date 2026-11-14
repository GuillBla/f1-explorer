import { lazy, Suspense, useEffect, type ComponentType, type LazyExoticComponent } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { Loader } from '@/components/ui'
import { useMechStore } from './store'
import { SYSTEMS, type SystemId } from './systems'

/** One lazily loaded page (and 3D scene) per system. */
const PAGES: Record<SystemId, LazyExoticComponent<ComponentType>> = {
  moteur: lazy(() => import('./engine/EnginePage')),
  turbo: lazy(() => import('./turbo/TurboPage')),
  ers: lazy(() => import('./ers/ErsPage')),
  boite: lazy(() => import('./gearbox/GearboxPage')),
  freins: lazy(() => import('./brakes/BrakesPage')),
  suspension: lazy(() => import('./suspension/SuspensionPage')),
  direction: lazy(() => import('./steering/SteeringPage')),
}

/** "Mécanique" tab: animated cut-away views of the car's internal systems. */
export default function MechanicsPage() {
  const { systemId } = useParams()
  const current = SYSTEMS.find((s) => s.id === systemId)
  // each system starts playing
  useEffect(() => {
    useMechStore.getState().set({ playing: true })
  }, [systemId])
  if (!current) return <Navigate to={`/tech/mecanique/${SYSTEMS[0].id}`} replace />
  const SystemPage = PAGES[current.id]
  return (
    <div className="min-w-0 max-w-full space-y-4">
      <nav aria-label="Systèmes mécaniques" className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {SYSTEMS.map((s, i) => (
          <NavLink
            key={s.id}
            to={`/tech/mecanique/${s.id}`}
            title={s.summary}
            className={({ isActive }) =>
              clsx(
                'flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-bold transition-colors',
                isActive ? 'border-f1 bg-f1 text-on-f1' : 'border-border bg-surface text-muted hover:text-text',
              )
            }
          >
            <span className="font-mono opacity-70">{i + 1}</span>
            {s.short}
          </NavLink>
        ))}
      </nav>
      <div>
        <h2 className="font-wide text-xl font-extrabold">{current.title}</h2>
        <p className="text-sm text-muted">{current.summary}</p>
      </div>
      <Suspense fallback={<Loader label="Chargement du système…" />}>
        <SystemPage key={current.id} />
      </Suspense>
    </div>
  )
}
