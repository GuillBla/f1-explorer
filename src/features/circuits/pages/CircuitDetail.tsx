import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, MapPin } from 'lucide-react'
import { Badge, Card, ErrorState, Loader, Page, PageHeader } from '@/components/ui'
import { CIRCUIT_BY_ID, TYPE_LABEL } from '../data/circuits'
import { useSchedule, useTrackModel, useTracks } from '../lib/data'
import { estimateGear, minSpeedAround } from '../lib/geometry'
import { fmtDate, raceDate } from '../lib/format'
import { TrackMap } from '../components/TrackMap'
import { TechSheet } from '../components/TechSheet'
import { HistoryPanel } from '../components/HistoryPanel'
import { WeatherWidget } from '../components/WeatherWidget'

export default function CircuitDetail() {
  const { id = '' } = useParams()
  const schedule = useSchedule()
  const tracks = useTracks()
  const race = schedule.data?.find((r) => r.Circuit.circuitId === id)

  // circuits present in the live schedule but missing from the editorial table get a minimal sheet
  const info = CIRCUIT_BY_ID.get(id) ?? (race ? {
    id, geoId: '', name: race.Circuit.circuitName, shortName: race.Circuit.circuitName,
    locality: race.Circuit.Location.locality, country: race.Circuit.Location.country,
    continent: 'Europe' as const, lat: +race.Circuit.Location.lat, lon: +race.Circuit.Location.long, type: 'permanent' as const,
  } : undefined)

  const feature = info ? tracks.data?.get(info.geoId) : undefined
  const model = useTrackModel(info, feature)

  if (!info) {
    if (schedule.isLoading) return <Loader />
    return (
      <Page>
        <Link to="/circuits" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft size={14} /> Tous les circuits</Link>
        <ErrorState error={`Circuit « ${id} » introuvable.`} />
      </Page>
    )
  }

  const date = race ? raceDate(race) : null
  return (
    <Page>
      <Link to="/circuits" className="mb-4 inline-flex items-center gap-1 text-sm text-muted hover:text-text"><ArrowLeft size={14} /> Tous les circuits</Link>
      <PageHeader
        title={info.name}
        subtitle={
          <span className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="flex items-center gap-1"><MapPin size={14} /> {info.locality}, {info.country}</span>
            {race && date && (
              <span className="flex items-center gap-1 text-text">
                <CalendarDays size={14} /> Manche {race.round} · {race.raceName} · {fmtDate(date, 'EEEE d MMMM yyyy')}
              </span>
            )}
            {!race && info.tagline && <span>{info.tagline}</span>}
          </span>
        }
        actions={<Badge color={info.type === 'urbain' ? '#ffb800' : info.type === 'permanent' ? '#00d2be' : '#3fa9f5'}>{TYPE_LABEL[info.type]}</Badge>}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {tracks.isLoading && <Loader label="Chargement du tracé…" />}
          {tracks.isError && <ErrorState error={tracks.error} onRetry={() => tracks.refetch()} />}
          {tracks.isSuccess && !feature && (
            <Card><p className="text-sm text-muted">Tracé indisponible pour ce circuit dans le jeu de données bacinger/f1-circuits.</p></Card>
          )}
          {feature && model && <TrackMap info={info} model={model} feature={feature} />}
        </div>
        <div className="flex flex-col gap-4">
          <TechSheet info={info} geo={feature?.properties} model={model} />
          <WeatherWidget lat={info.lat} lon={info.lon} race={race} />
        </div>
      </div>

      {info.corners && info.corners.length > 0 && model && (
        <Card title="Virages clés" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {info.corners.map((c) => {
              const v = Math.round(minSpeedAround(model, c.frac))
              return (
                <div key={c.name} className="rounded-lg bg-surface-2 p-3">
                  <p className="font-bold">{c.n && <span className="mr-1.5 text-f1">V{c.n}</span>}{c.name}</p>
                  {c.desc && <p className="mt-1 text-sm text-muted">{c.desc}</p>}
                  <p className="mt-2 font-mono text-xs text-muted">≈ {v} km/h · rapport {estimateGear(v)} <span className="font-sans">(estimation)</span></p>
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <div className="mt-4">
        <HistoryPanel info={info} />
      </div>

      <p className="mt-6 text-xs text-muted">
        Tracé : bacinger/f1-circuits (MIT) — données non officielles. Palmarès : Jolpica-F1. Météo : Open-Meteo.
        Positions des virages approximatives, placées sur le tracé GeoJSON.
      </p>
    </Page>
  )
}
