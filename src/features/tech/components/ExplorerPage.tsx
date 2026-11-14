import { lazy, useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import clsx from 'clsx'
import { Crosshair, Expand, Focus, MousePointerClick, RotateCw, ScanEye } from 'lucide-react'
import { PART_ORDER, PARTS, SUBS } from '../content/parts'
import { useExplorerStore } from '../store'
import { CanvasShell } from './CanvasShell'
import { CarFallback2D } from './CarFallback2D'
import { Segmented, ToggleButton } from './controls'
import { PartPanel } from './PartPanel'

const ExplorerScene = lazy(() => import('../scene/ExplorerScene'))

export default function ExplorerPage() {
  const {
    selected,
    sub,
    exploded,
    xray,
    autoRotate,
    isolate,
    aeroMode,
    demoSpeed,
    steer,
    select,
    toggleExploded,
    toggleXray,
    toggleAutoRotate,
    toggleIsolate,
    setAeroMode,
    setDemo,
    resetView,
  } = useExplorerStore()

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
        <ToggleButton active={isolate} onClick={toggleIsolate} icon={<Focus size={16} />} title="Estompe tout sauf l’élément sélectionné">
          Isoler
        </ToggleButton>
        <ToggleButton active={autoRotate} onClick={toggleAutoRotate} icon={<RotateCw size={16} />}>
          Rotation
        </ToggleButton>
        <ToggleButton active={false} onClick={resetView} icon={<Crosshair size={16} />}>
          Recentrer
        </ToggleButton>
        <span className="ml-auto hidden items-center gap-1.5 text-xs text-muted md:inline-flex">
          <MousePointerClick size={14} /> Survolez puis cliquez un élément · glisser pour tourner · molette / pincer pour zoomer
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-border bg-surface p-2.5 text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">Aéro active</span>
          <Segmented
            label="Mode d’aérodynamique active"
            value={aeroMode}
            onChange={setAeroMode}
            options={[
              { value: 'Z', label: 'Mode Z · virage' },
              { value: 'X', label: 'Mode X · ligne droite' },
            ]}
          />
        </div>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Vitesse</span>
          <input
            type="range"
            min={0}
            max={80}
            step={5}
            value={demoSpeed}
            onChange={(e) => setDemo({ demoSpeed: Number(e.target.value) })}
            className="w-28 accent-[var(--color-f1)]"
            aria-label="Vitesse de démonstration (rotation des roues)"
          />
          <span className="w-16 font-mono text-xs text-accent">{demoSpeed} km/h</span>
        </label>
        <label className="flex items-center gap-2">
          <span className="font-semibold">Braquage</span>
          <input
            type="range"
            min={-20}
            max={20}
            step={1}
            value={steer}
            onChange={(e) => setDemo({ steer: Number(e.target.value) })}
            className="w-28 accent-[var(--color-f1)]"
            aria-label="Angle de braquage des roues avant"
          />
          <span className="w-10 font-mono text-xs text-accent">{steer}°</span>
        </label>
        <span className="text-xs text-muted">
          {aeroMode === 'Z' ? 'Volets fermés : appui maximal en virage.' : 'Volets ouverts à l’avant et à l’arrière : moins de traînée en ligne droite.'}
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
              <PartPanel id={selected} sub={sub} onClose={() => select(null)} />
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

/** Name of the hovered element (part › sub-component), following the pointer. */
function HoverLabel() {
  const hovered = useExplorerStore((s) => s.hovered)
  const hoveredSub = useExplorerStore((s) => s.hoveredSub)
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
  const subName = hoveredSub ? SUBS[hoveredSub]?.name : undefined
  return (
    <div
      ref={ref}
      className={clsx(
        'pointer-events-none absolute left-0 top-0 z-10 rounded-md bg-bg/90 px-2 py-1 text-xs font-bold text-accent ring-1 ring-accent/50 transition-opacity',
        hovered ? 'opacity-100' : 'opacity-0',
      )}
    >
      {hovered ? (
        <>
          <span className="text-muted">{PARTS[hovered].short}</span>
          {subName && <span> › {subName}</span>}
        </>
      ) : (
        ''
      )}
    </div>
  )
}
