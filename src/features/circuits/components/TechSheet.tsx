import type { ReactNode } from 'react'
import { Card } from '@/components/ui'
import type { CircuitInfo } from '../data/types'
import { RATING_LABELS, TYPE_LABEL } from '../data/circuits'
import type { GeoProps } from '../lib/data'
import type { TrackModel } from '../lib/geometry'
import { fmtLapTime, fmtNum } from '../lib/format'

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="rounded-lg bg-surface-2 px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-muted">{label}</p>
      <p className="font-bold leading-tight">{value}</p>
      {sub && <p className="text-[11px] text-muted">{sub}</p>}
    </div>
  )
}

/** 5-segment gauge. */
function Gauge({ label, hint, value }: { label: string; hint: string; value?: number }) {
  return (
    <div title={hint}>
      <div className="mb-1 flex justify-between text-xs">
        <span>{label}</span>
        <span className="font-mono text-muted">{value ? `${value}/5` : '—'}</span>
      </div>
      <div className="grid grid-cols-5 gap-1" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={5} aria-valuenow={value}>
        {[1, 2, 3, 4, 5].map((i) => (
          <span
            key={i}
            className="h-2 -skew-x-12 rounded-sm"
            style={{ background: value && i <= value ? `color-mix(in srgb, var(--color-f1) ${40 + i * 12}%, var(--color-warn))` : 'var(--color-surface-2)' }}
          />
        ))}
      </div>
    </div>
  )
}

const ROT: Record<NonNullable<CircuitInfo['rotation']>, string> = { horaire: 'Horaire ↻', antihoraire: 'Antihoraire ↺', 'en huit': 'En huit ∞' }

export function TechSheet({ info, geo, model }: { info: CircuitInfo; geo?: GeoProps; model?: TrackModel | null }) {
  const geoLen = geo?.length ? geo.length / 1000 : undefined
  return (
    <Card title="Fiche technique">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <Stat
          label="Longueur"
          value={fmtNum(info.lengthKm ?? geoLen, 3, ' km')}
          sub={!info.lengthKm && geoLen ? 'source : tracé GeoJSON' : undefined}
        />
        <Stat label="Virages" value={fmtNum(info.turns)} />
        <Stat label="Tours" value={fmtNum(info.laps)} />
        <Stat label="Distance de course" value={fmtNum(info.raceDistanceKm, 3, ' km')} />
        <Stat
          label="Record du tour (course)"
          value={info.lapRecord ? <span className="font-mono">{info.lapRecord.time}</span> : '—'}
          sub={info.lapRecord ? `${info.lapRecord.driver} (${info.lapRecord.year})` : undefined}
        />
        <Stat label="Zones DRS (2025)" value={fmtNum(info.drsZones2025)} sub="2026 : aileron actif" />
        <Stat label="1er GP de F1" value={info.firstGp ?? '—'} />
        <Stat label="Sens" value={info.rotation ? ROT[info.rotation] : '—'} />
        <Stat label="Altitude" value={fmtNum(geo?.altitude, 0, ' m')} sub={geo?.altitude !== undefined ? 'ligne de départ (bacinger)' : undefined} />
        <Stat label="Type" value={TYPE_LABEL[info.type]} />
        <Stat label="Continent" value={info.continent} />
        <Stat label="Tour modélisé" value={model ? fmtLapTime(model.lapTime) : '—'} sub={model ? `${Math.round(model.vMin * 3.6)}–${Math.round(model.vMax * 3.6)} km/h (estimation)` : undefined} />
      </div>

      <div className="mt-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-wider text-muted">Caractéristiques <span className="font-normal normal-case">(appréciation éditoriale)</span></p>
        {info.ratings ? (
          RATING_LABELS.map((r) => <Gauge key={r.key} label={r.label} hint={r.hint} value={info.ratings?.[r.key]} />)
        ) : (
          <p className="text-sm text-muted">Pas encore assez de recul sur ce circuit pour l’évaluer.</p>
        )}
      </div>
    </Card>
  )
}
