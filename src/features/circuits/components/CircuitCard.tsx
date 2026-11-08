import { Link } from 'react-router-dom'
import clsx from 'clsx'
import type { JRace } from '@/lib/api'
import { Badge } from '@/components/ui'
import type { CircuitInfo } from '../data/types'
import { TYPE_LABEL } from '../data/circuits'
import type { TrackFeature } from '../lib/data'
import { fmtDate, fmtNum, raceDate } from '../lib/format'
import { TrackSilhouette } from './TrackSilhouette'

export function CircuitCard({ info, race, feature, now }: { info: CircuitInfo; race?: JRace; feature?: TrackFeature; now: number }) {
  const date = race ? raceDate(race) : null
  const past = date ? date.getTime() < now - 3 * 3_600_000 : false
  return (
    <Link
      to={`/circuits/${info.id}`}
      className="group flex flex-col rounded-xl border border-border bg-surface p-3 transition hover:border-f1/60 hover:bg-surface-2"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-bold leading-tight">{info.shortName}</p>
          <p className="truncate text-xs text-muted">{info.locality} · {info.country}</p>
        </div>
        {race ? (
          <span className={clsx('shrink-0 rounded px-1.5 py-0.5 font-mono text-xs font-bold', past ? 'bg-surface-2 text-muted' : 'bg-f1 text-white')}>
            R{race.round}
          </span>
        ) : (
          <Badge color="#8b93a7">Historique</Badge>
        )}
      </div>
      <TrackSilhouette feature={feature} className="my-2 h-28 w-full text-text transition group-hover:text-f1" />
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>{TYPE_LABEL[info.type]}</span>
        {info.lengthKm && <span>{fmtNum(info.lengthKm, 3, ' km')}</span>}
        {date && <span className={clsx('ml-auto', !past && 'text-text font-semibold')}>{past ? 'Couru le ' : ''}{fmtDate(date, 'd MMM')}</span>}
      </div>
    </Link>
  )
}
