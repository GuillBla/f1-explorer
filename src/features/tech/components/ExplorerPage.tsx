import { lazy, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Crosshair, Expand, MousePointerClick, RotateCw, ScanEye } from 'lucide-react'
import { PART_ORDER, PARTS } from '../content/parts'
import { useExplorerStore } from '../store'
import { CanvasShell } from './CanvasShell'
import { CarFallback2D } from './CarFallback2D'
import { ToggleButton } from './controls'
import { PartPanel } from './PartPanel'

const ExplorerScene = lazy(() => import('../scene/ExplorerScene'))

export default function ExplorerPage() {
  const { selected, exploded, xray, autoRotate, select, toggleExploded, toggleXray, toggleAutoRotate, resetView } = useExplorerStore()

  // clean up global cursor / hover when leaving the page
  useEffect(
    () => () => {
      document.body.style.cursor = ''
      useExplorerStore.getState().setHovered(null)
    },
    [],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <ToggleButton active={exploded} onClick={toggleExploded} icon={<Expand size={16} />} title="Écarte les composants">
          Vue éclatée
        </ToggleButton>
        <ToggleButton active={xray} onClick={toggleXray} icon={<ScanEye size={16} />} title="Carrosserie transparente : voir le groupe propulseur">
          Rayons X
        </ToggleButton>
        <ToggleButton active={autoRotate} onClick={toggleAutoRotate} icon={<RotateCw size={16} />}>
          Rotation
        </ToggleButton>
        <ToggleButton active={false} onClick={resetView} icon={<Crosshair size={16} />}>
          Recentrer
        </ToggleButton>
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted md:inline-flex">
          <MousePointerClick size={14} /> Survolez puis cliquez un composant · glisser pour tourner · molette / pincer pour zoomer
        </span>
      </div>

      <div className="relative">
        <div className="relative h-[58vh] min-h-[360px] overflow-hidden rounded-xl border border-border bg-bg lg:h-[72vh]">
          <HoverLabel />
          <CanvasShell
            className="h-full w-full"
            camera={{ position: [5.2, 2.4, 5.6], fov: 38 }}
            fallback={<CarFallback2D selected={selected} onSelect={select} />}
          >
            <ExplorerScene />
          </CanvasShell>
          {xray && (
            <div className="pointer-events-none absolute bottom-3 left-3 rounded-md bg-bg/80 px-2 py-1 text-xs text-muted ring-1 ring-border">
              Mode rayons X : cliquez le groupe propulseur pour en savoir plus
            </div>
          )}
        </div>

        <AnimatePresence>
          {selected && (
            <motion.div
              key={selected}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 24 }}
              transition={{ duration: 0.25 }}
              className="mt-4 lg:absolute lg:bottom-3 lg:right-3 lg:top-3 lg:mt-0 lg:w-[400px]"
            >
              <PartPanel id={selected} onClose={() => select(null)} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <nav aria-label="Composants" className="flex flex-wrap gap-1.5">
        {PART_ORDER.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              if (id === 'powerUnit' && !useExplorerStore.getState().xray) toggleXray()
              select(id)
            }}
            className={clsx(
              'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
              selected === id ? 'border-f1 bg-f1 text-white' : 'border-border bg-surface text-muted hover:text-text',
            )}
          >
            {PARTS[id].short}
          </button>
        ))}
      </nav>
    </div>
  )
}

/** Name of the hovered part, following the pointer. */
function HoverLabel() {
  const hovered = useExplorerStore((s) => s.hovered)
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    const parent = el?.parentElement
    if (!el || !parent) return
    const move = (e: PointerEvent) => {
      const r = parent.getBoundingClientRect()
      el.style.transform = `translate(${e.clientX - r.left + 14}px, ${e.clientY - r.top + 14}px)`
    }
    parent.addEventListener('pointermove', move)
    return () => parent.removeEventListener('pointermove', move)
  }, [])
  return (
    <div
      ref={ref}
      className={clsx(
        'pointer-events-none absolute left-0 top-0 z-10 rounded-md bg-bg/90 px-2 py-1 text-xs font-bold text-accent ring-1 ring-accent/50 transition-opacity',
        hovered ? 'opacity-100' : 'opacity-0',
      )}
    >
      {hovered ? PARTS[hovered].name : ''}
    </div>
  )
}
