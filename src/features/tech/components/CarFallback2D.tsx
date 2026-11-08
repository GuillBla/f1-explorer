import clsx from 'clsx'
import { PARTS } from '../content/parts'
import type { PartId } from '../types'

/** Side-view coordinates (metres, car frame) of the hotspots. */
const HOTSPOTS: { id: PartId; x: number; y: number }[] = [
  { id: 'frontWing', x: 2.6, y: 0.15 },
  { id: 'cockpit', x: 0.4, y: 0.6 },
  { id: 'halo', x: 0.3, y: 0.88 },
  { id: 'wheels', x: 1.7, y: 0.5 },
  { id: 'brakes', x: -1.7, y: 0.35 },
  { id: 'suspension', x: 1.35, y: 0.42 },
  { id: 'sidepods', x: -0.2, y: 0.4 },
  { id: 'floor', x: -0.4, y: 0.08 },
  { id: 'plank', x: 0.6, y: 0.03 },
  { id: 'diffuser', x: -1.75, y: 0.15 },
  { id: 'engineCover', x: -0.6, y: 0.85 },
  { id: 'rearWing', x: -2.35, y: 0.95 },
  { id: 'powerUnit', x: -0.9, y: 0.48 },
]

const sx = (x: number) => (x + 2.8) * 100 + 20
const sy = (y: number) => 130 - y * 100

/** 2D fallback (no WebGL): side view with clickable hotspots. */
export function CarFallback2D({ selected, onSelect }: { selected: PartId | null; onSelect: (id: PartId) => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4">
      <p className="text-center text-xs text-muted">
        WebGL n’est pas disponible sur cet appareil : voici une vue 2D simplifiée. Touchez un point pour afficher le composant.
      </p>
      <svg viewBox="0 0 620 150" className="w-full max-w-3xl" role="img" aria-label="Vue de profil d’une F1">
        {/* body silhouette */}
        <path
          d={`M${sx(2.8)} ${sy(0.18)} L${sx(1.7)} ${sy(0.5)} L${sx(0.6)} ${sy(0.64)} L${sx(0.05)} ${sy(0.95)} L${sx(-0.2)} ${sy(0.98)} L${sx(-1.5)} ${sy(0.55)} L${sx(-1.95)} ${sy(0.45)} L${sx(-1.95)} ${sy(0.07)} L${sx(1.3)} ${sy(0.07)} L${sx(2.3)} ${sy(0.12)} Z`}
          className="fill-surface-2 stroke-border"
          strokeWidth={1.5}
        />
        {/* front wing */}
        <path d={`M${sx(2.9)} ${sy(0.06)} L${sx(2.3)} ${sy(0.08)} L${sx(2.3)} ${sy(0.25)} L${sx(2.9)} ${sy(0.16)} Z`} className="fill-surface stroke-border" />
        {/* rear wing */}
        <path d={`M${sx(-2.0)} ${sy(0.45)} L${sx(-2.0)} ${sy(1.0)} L${sx(-2.6)} ${sy(1.02)} L${sx(-2.6)} ${sy(0.78)} Z`} className="fill-surface stroke-border" />
        {/* halo */}
        <path d={`M${sx(-0.05)} ${sy(0.65)} Q${sx(0.1)} ${sy(0.86)} ${sx(0.55)} ${sy(0.85)} L${sx(0.75)} ${sy(0.62)}`} className="fill-none stroke-muted" strokeWidth={3} />
        {/* wheels */}
        {[1.7, -1.7].map((x) => (
          <g key={x}>
            <circle cx={sx(x)} cy={sy(0.355)} r={35.5} className="fill-bg stroke-border" strokeWidth={2} />
            <circle cx={sx(x)} cy={sy(0.355)} r={22} className="fill-surface stroke-border" />
          </g>
        ))}
        <line x1={0} x2={620} y1={sy(0)} y2={sy(0)} className="stroke-border" />
        {HOTSPOTS.map((h) => (
          <g key={h.id} role="button" tabIndex={0} aria-label={PARTS[h.id].name} className="cursor-pointer" onClick={() => onSelect(h.id)} onKeyDown={(e) => e.key === 'Enter' && onSelect(h.id)}>
            <circle cx={sx(h.x)} cy={sy(h.y)} r={9} className={clsx(selected === h.id ? 'fill-accent' : 'fill-f1')} opacity={0.9} />
            <circle cx={sx(h.x)} cy={sy(h.y)} r={14} className={clsx('fill-none', selected === h.id ? 'stroke-accent' : 'stroke-f1/50')} strokeWidth={1.5} />
          </g>
        ))}
      </svg>
    </div>
  )
}
