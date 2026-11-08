import { lazy, useMemo } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Info, Pause, Play, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui'
import { computeAero, G, insights, type Insight } from '../airflow/aeroModel'
import { SCALES, turboGradientCss } from '../airflow/colormap'
import { useTunnelStore, useTunnelView, type ColorBy, type FlowDisplay, type TunnelView } from '../store'
import { CanvasShell } from './CanvasShell'
import { Segmented, Slider, Stat, Switch } from './controls'

const TunnelScene = lazy(() => import('../scene/TunnelScene'))

const fmt = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d })

const VIEW_OPTIONS: { value: TunnelView; label: string }[] = [
  { value: 'trois-quarts', label: '3/4' },
  { value: 'profil', label: 'Profil' },
  { value: 'dessus', label: 'Dessus' },
  { value: 'arriere', label: 'Arrière' },
  { value: 'dessous', label: 'Dessous' },
]

export default function TunnelPage() {
  const s = useTunnelStore()
  const view = useTunnelView((v) => v.view)
  const go = useTunnelView((v) => v.go)
  const aero = useMemo(() => computeAero({ speedKmh: s.speed, open: s.drs, rideHeightMm: s.rideHeight }), [s.speed, s.drs, s.rideHeight])
  const tips = useMemo(
    () => insights(aero, { speedKmh: s.speed, open: s.drs, rideHeightMm: s.rideHeight, followDistance: s.showDirtyAir ? s.followDistance : null }),
    [aero, s.speed, s.drs, s.rideHeight, s.showDirtyAir, s.followDistance],
  )

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4">
        <div className="relative h-[56vh] min-h-[340px] overflow-hidden rounded-xl border border-border bg-bg lg:h-[64vh]">
          <CanvasShell
            className="h-full w-full"
            camera={{ position: [4.6, 2.3, 5.4], fov: 40 }}
            maxDpr={1.5}
            fallback={
              <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
                WebGL n’est pas disponible : la visualisation 3D des flux ne peut pas s’afficher. Les indicateurs et explications ci-dessous restent valables.
              </div>
            }
          >
            <TunnelScene />
          </CanvasShell>
          <div className="absolute left-3 top-3 flex flex-wrap gap-2">
            <Segmented label="Point de vue" value={view} options={VIEW_OPTIONS} onChange={go} />
            <button
              type="button"
              onClick={() => s.set({ paused: !s.paused })}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-bg px-2 py-1 text-xs font-bold text-muted hover:text-text"
              aria-label={s.paused ? 'Reprendre' : 'Pause'}
            >
              {s.paused ? <Play size={13} /> : <Pause size={13} />}
              {s.paused ? 'Lecture' : 'Pause'}
            </button>
          </div>
          <Legend colorBy={s.colorBy} />
          {aero.porpoising > 0.05 && <PorpoisingBadge intensity={aero.porpoising} />}
        </div>

        <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
          <Stat label="Appui" value={fmt(aero.downforceN / 1000, 1)} unit="kN" sub={`≈ ${fmt(aero.downforceN / G)} kgf`} tone="accent" />
          <Stat label="Traînée" value={fmt(aero.dragN)} unit="N" sub={`${fmt(aero.dragPowerKw)} kW absorbés`} tone="warn" />
          <Stat label="Finesse L/D" value={fmt(aero.ld, 2)} sub={`ClA ${fmt(aero.downforceN / aero.q, 2)} · CdA ${fmt(aero.cdA, 2)} m²`} />
          <Stat label="Pression dyn." value={fmt(aero.q / 1000, 2)} unit="kPa" sub="q = ½ ρ v²" tone="info" />
        </div>

        <Card title="Répartition de l’appui">
          <Balance frontPct={aero.frontPct} />
          <Breakdown aero={aero} />
          <p className="mt-3 text-xs text-muted">
            Modèle simplifié : F = ½ · ρ · v² · S · C, avec ρ = 1,225 kg/m³ et des coefficients S·Cl / S·Cd plausibles pour une F1 2026 (les valeurs réelles des
            équipes sont confidentielles). La répartition avant/arrière se calcule par la règle du levier entre les essieux (empattement 3,4 m).
          </p>
        </Card>

        <div className="grid gap-3 md:grid-cols-2">
          {tips.map((t) => (
            <InsightCard key={t.title} insight={t} />
          ))}
        </div>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <Card title="Soufflerie">
          <div className="space-y-4">
            <Slider label="Vitesse de l’air" value={s.speed} min={50} max={350} step={10} unit=" km/h" onChange={(v) => s.set({ speed: v })} />
            <Slider
              label="Hauteur de caisse"
              value={s.rideHeight}
              min={8}
              max={60}
              step={1}
              unit=" mm"
              onChange={(v) => s.set({ rideHeight: v })}
              hint="Garde au sol de la planche. Sous ≈ 20 mm à haute vitesse : risque de marsouinage."
            />
            <Switch
              checked={s.drs}
              onChange={(v) => s.set({ drs: v })}
              label="Ailerons ouverts (DRS / mode X)"
              desc="Volet arrière ouvert (et volets avant en 2026) : moins de traînée, sillage moins haut."
            />
            <Switch
              checked={s.showVortices}
              onChange={(v) => s.set({ showVortices: v })}
              label="Tourbillons"
              desc="Bouts d’aileron avant (outwash), Y250 et bord du fond, aileron arrière."
            />
            <Switch
              checked={s.showDirtyAir}
              onChange={(v) => s.set({ showDirtyAir: v })}
              label="Air sale (voiture qui suit)"
              desc="Sillage turbulent et perte d’appui de la voiture derrière."
            />
            {s.showDirtyAir && (
              <Slider label="Écart avec la voiture qui suit" value={s.followDistance} min={5} max={30} step={1} unit=" m" onChange={(v) => s.set({ followDistance: v })} />
            )}
          </div>
        </Card>
        <Card title="Affichage">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Tracés</span>
              <Segmented<FlowDisplay>
                label="Tracés"
                value={s.display}
                onChange={(v) => s.set({ display: v })}
                options={[
                  { value: 'particles', label: 'Particules' },
                  { value: 'streamlines', label: 'Lignes' },
                  { value: 'both', label: 'Les deux' },
                ]}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold">Couleur</span>
              <Segmented<ColorBy>
                label="Couleur"
                value={s.colorBy}
                onChange={(v) => s.set({ colorBy: v })}
                options={[
                  { value: 'speed', label: 'Vitesse' },
                  { value: 'pressure', label: 'Pression' },
                ]}
              />
            </div>
            <button
              type="button"
              onClick={s.reset}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted hover:text-text"
            >
              <RotateCcw size={13} /> Réinitialiser les réglages
            </button>
          </div>
        </Card>
        <p className="flex gap-2 text-xs text-muted">
          <Info size={14} className="mt-0.5 shrink-0" />
          Champ de vitesse analytique (écoulement potentiel, tourbillons de Biot-Savart, canal Venturi, sillage gaussien), pas une simulation CFD : il
          illustre les phénomènes, pas les valeurs exactes. Les particules sont ralenties pour rester lisibles.
        </p>
      </aside>
    </div>
  )
}

function Legend({ colorBy }: { colorBy: ColorBy }) {
  const sc = SCALES[colorBy]
  return (
    <div className="pointer-events-none absolute bottom-3 left-3 w-56 rounded-md bg-bg/85 p-2 ring-1 ring-border sm:w-64">
      <div className="mb-1 text-[11px] font-bold text-text">
        {sc.label} <span className="font-mono text-muted">({sc.unit})</span>
      </div>
      <div className="h-2.5 rounded-sm" style={{ background: turboGradientCss() }} />
      <div className="relative mt-0.5 h-3 font-mono text-[10px] text-muted">
        {sc.ticks.map((t) => (
          <span key={t} className="absolute -translate-x-1/2" style={{ left: `${((t - sc.min) / (sc.max - sc.min)) * 100}%` }}>
            {fmt(t, Number.isInteger(t) ? 0 : 1)}
          </span>
        ))}
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted">
        <span>{sc.hint[0]}</span>
        <span>{sc.hint[1]}</span>
      </div>
    </div>
  )
}

function PorpoisingBadge({ intensity }: { intensity: number }) {
  return (
    <div className="pointer-events-none absolute right-3 top-3 flex items-center gap-2 rounded-md bg-f1/20 px-2 py-1 text-xs font-bold text-f1 ring-1 ring-f1/60">
      <svg width="46" height="16" viewBox="0 0 46 16" aria-hidden>
        <motion.path
          d="M0 8 Q 5.75 0 11.5 8 T 23 8 T 34.5 8 T 46 8"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          animate={{ y: [0, -2 * intensity, 2 * intensity, 0] }}
          transition={{ duration: 0.45, repeat: Infinity, ease: 'easeInOut' }}
        />
      </svg>
      Marsouinage
    </div>
  )
}

function Balance({ frontPct }: { frontPct: number }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs font-semibold">
        <span>Avant {fmt(frontPct, 1)} %</span>
        <span>Arrière {fmt(100 - frontPct, 1)} %</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-surface-2">
        <motion.div className="h-full bg-accent" animate={{ width: `${frontPct}%` }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} />
        <span className="absolute inset-y-0 left-[40%] w-px bg-text/40" title="≈ 40 % : ordre de grandeur courant" />
      </div>
    </div>
  )
}

function Breakdown({ aero }: { aero: ReturnType<typeof computeAero> }) {
  const parts = [
    { key: 'frontWing', label: 'Aileron avant', color: 'bg-info' },
    { key: 'floor', label: 'Fond plat', color: 'bg-accent' },
    { key: 'rearWing', label: 'Aileron arrière', color: 'bg-warn' },
    { key: 'body', label: 'Carrosserie', color: 'bg-muted' },
  ] as const
  const total = aero.clA.frontWing + aero.clA.floor + aero.clA.rearWing + aero.clA.body
  return (
    <div className="mt-4">
      <div className="flex h-3 overflow-hidden rounded-full">
        {parts.map((p) => (
          <motion.div key={p.key} className={p.color} animate={{ width: `${(aero.clA[p.key] / total) * 100}%` }} transition={{ duration: 0.3 }} />
        ))}
      </div>
      <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs sm:grid-cols-4">
        {parts.map((p) => (
          <li key={p.key} className="flex items-center gap-1.5">
            <span className={clsx('h-2 w-2 rounded-sm', p.color)} />
            <span className="text-muted">{p.label}</span>
            <span className="ml-auto font-mono">{fmt((aero.clA[p.key] * aero.q) / 1000, 1)} kN</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const TONES: Record<Insight['tone'], string> = {
  info: 'border-info/40 text-info',
  ok: 'border-ok/40 text-ok',
  warn: 'border-warn/40 text-warn',
  f1: 'border-f1/50 text-f1',
}

function InsightCard({ insight }: { insight: Insight }) {
  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={clsx('rounded-xl border bg-surface p-3', TONES[insight.tone])}>
      <div className="text-sm font-bold">{insight.title}</div>
      <p className="mt-1 text-sm leading-relaxed text-text/90">{insight.text}</p>
    </motion.div>
  )
}
