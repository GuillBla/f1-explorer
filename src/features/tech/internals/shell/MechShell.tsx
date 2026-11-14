import { useEffect, useRef, type ComponentType, type ReactNode } from 'react'
import clsx from 'clsx'
import { Pause, Play, Scissors, SkipForward, Tag } from 'lucide-react'
import { Card } from '@/components/ui'
import { CanvasShell } from '../../components/CanvasShell'
import type { Vec3 } from '../../types'
import { fmtSpeed, sliderFromSpeed, speedFromSlider, useMechStore } from '../store'

const PRESETS = [1, 0.25, 0.1, 0.05, 0.01]

interface Props {
  Scene: ComponentType
  camera: { position: Vec3; fov?: number }
  /** Advances the system's simulation by `dt` seconds of simulated time (already slowed down). */
  step: (dt: number) => void
  /** "Pas à pas" button. */
  onNudge?: () => void
  nudgeLabel?: string
  /** System specific controls (sliders, modes) shown under the canvas. */
  controls?: ReactNode
  /** Explanation panel, synchronised with the animation. */
  panel: ReactNode
  /** Overlay drawn on the canvas (bottom-left), e.g. a gauge. */
  hud?: ReactNode
  /** Disable the cut-away toggle when the scene has no housing to cut. */
  noCut?: boolean
  fallback?: ReactNode
}

/**
 * Common layout of a "Mécanique" system: dark 3D stage + transport bar, system controls, and an
 * explanation panel. Runs the simulation loop (independent from the WebGL loop so the panel keeps
 * working without WebGL).
 */
export function MechShell({ Scene, camera, step, onNudge, nudgeLabel = 'Pas à pas', controls, panel, hud, noCut, fallback }: Props) {
  const stepRef = useRef(step)
  useEffect(() => {
    stepRef.current = step
  }, [step])

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now
      const { playing, speed } = useMechStore.getState()
      if (playing) stepRef.current(dt * speed)
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="min-w-0 space-y-4">
        <div className="theme-dark relative h-[52vh] min-h-[340px] overflow-hidden rounded-xl border border-border bg-bg lg:h-[62vh]">
          <CanvasShell
            className="h-full w-full"
            camera={camera}
            maxDpr={1.5}
            fallback={
              fallback ?? (
                <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
                  WebGL n’est pas disponible sur cet appareil : l’animation 3D ne peut pas s’afficher. Le panneau d’explication reste synchronisé avec la
                  simulation.
                </div>
              )
            }
          >
            <Scene />
          </CanvasShell>
          <Transport onNudge={onNudge} nudgeLabel={nudgeLabel} noCut={noCut} />
          {hud && <div className="pointer-events-none absolute bottom-3 left-3 right-3 flex flex-wrap items-end gap-2">{hud}</div>}
        </div>
        {controls && <Card>{controls}</Card>}
      </div>
      <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:self-start">{panel}</aside>
    </div>
  )
}

function Transport({ onNudge, nudgeLabel, noCut }: { onNudge?: () => void; nudgeLabel: string; noCut?: boolean }) {
  const { playing, speed, labels, cut, set } = useMechStore()
  const btn = 'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold transition-colors'
  const idle = 'border-border bg-bg/85 text-muted hover:text-text'
  const on = 'border-accent bg-accent/15 text-accent'
  return (
    <div className="absolute left-2 right-2 top-2 flex flex-wrap items-center gap-1.5">
      <button type="button" className={clsx(btn, idle)} onClick={() => set({ playing: !playing })} aria-label={playing ? 'Pause' : 'Lecture'}>
        {playing ? <Pause size={13} /> : <Play size={13} />}
        {playing ? 'Pause' : 'Lecture'}
      </button>
      {onNudge && (
        <button
          type="button"
          className={clsx(btn, idle)}
          onClick={() => {
            set({ playing: false })
            onNudge()
          }}
          title="Avance d’un petit pas (met en pause)"
        >
          <SkipForward size={13} />
          {nudgeLabel}
        </button>
      )}
      <div className="flex items-center gap-1.5 rounded-md border border-border bg-bg/85 px-2 py-1">
        <span className="text-[11px] font-bold text-muted">Vitesse</span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={Math.round(sliderFromSpeed(speed))}
          onChange={(e) => set({ speed: speedFromSlider(Number(e.target.value)) })}
          className="w-20 accent-[var(--color-f1)] sm:w-28"
          aria-label="Vitesse de lecture"
        />
        <span className="w-12 font-mono text-[11px] font-bold text-accent">{fmtSpeed(speed)}</span>
      </div>
      <div className="hidden gap-0.5 rounded-md border border-border bg-bg/85 p-0.5 sm:flex">
        {PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => set({ speed: p })}
            className={clsx(
              'rounded px-1.5 py-0.5 font-mono text-[11px] font-bold',
              Math.abs(speed - p) < p * 0.02 ? 'bg-f1 text-on-f1' : 'text-muted hover:text-text',
            )}
          >
            {fmtSpeed(p)}
          </button>
        ))}
      </div>
      <span className="ml-auto flex gap-1.5">
        <button type="button" className={clsx(btn, labels ? on : idle)} onClick={() => set({ labels: !labels })} aria-pressed={labels}>
          <Tag size={13} /> Étiquettes
        </button>
        {!noCut && (
          <button type="button" className={clsx(btn, cut ? on : idle)} onClick={() => set({ cut: !cut })} aria-pressed={cut}>
            <Scissors size={13} /> Coupe
          </button>
        )}
      </span>
    </div>
  )
}

/** Titled block of the explanation panel. */
export function PanelCard({ title, children, className }: { title: ReactNode; children: ReactNode; className?: string }) {
  return (
    <Card title={title} className={className}>
      <div className="space-y-2 text-sm leading-relaxed">{children}</div>
    </Card>
  )
}

/** "Chiffre incertain" marker. */
export function Uncertain({ children = 'incertain' }: { children?: ReactNode }) {
  return (
    <span className="ml-1 inline-flex items-center rounded border border-warn/50 px-1 text-[10px] font-bold uppercase tracking-wide text-warn" title="Valeur estimée ou non publiée officiellement">
      {children}
    </span>
  )
}

/** Live narration line (the sentence describing what happens right now). */
export function Narration({ children, tone = 'accent' }: { children: ReactNode; tone?: 'accent' | 'warn' | 'f1' | 'ok' | 'info' }) {
  const border = { accent: 'border-accent', warn: 'border-warn', f1: 'border-f1', ok: 'border-ok', info: 'border-info' }[tone]
  return <div className={clsx('rounded-r border-l-4 bg-surface-2 px-3 py-2 text-sm leading-relaxed', border)} aria-live="polite">{children}</div>
}

/** Small key/value figure. */
export function Fig({ label, value, unit, note }: { label: string; value: ReactNode; unit?: string; note?: ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 px-2.5 py-2">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-base font-bold leading-tight text-text">
        {value}
        {unit && <span className="ml-1 text-[11px] font-semibold text-muted">{unit}</span>}
      </div>
      {note && <div className="text-[11px] leading-snug text-muted">{note}</div>}
    </div>
  )
}
