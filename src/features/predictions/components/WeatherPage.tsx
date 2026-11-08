import { useMemo, useState, type ReactNode } from 'react'
import clsx from 'clsx'
import { Bell, BellOff, CheckCircle2, CloudRain, Droplets, Thermometer, Wind, Gauge } from 'lucide-react'
import { Area, Bar, CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import type { JRace } from '@/lib/api'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useSchedule } from '../lib/hooks'
import { useWeekendWeather } from '../lib/useWeekendWeather'
import { useAlertNotifications } from '../lib/useNotifications'
import { fmtDateTime, fmtDay, fmtHour, raceStart, upcomingRaces } from '../lib/schedule'
import { ALERT_THRESHOLDS, LEVEL_RANK, TRACK_MODEL, maxLevel, trendLabel, type EnrichedHour, type SessionWeather, type WeatherAlert } from '../models/weather'
import { HowItWorks, LEVEL_STYLE, LevelBadge, Select, axisProps, num, tooltipStyle } from './common'

const DAY = 86_400_000

export default function WeatherPage() {
  const schedule = useSchedule()
  const upcoming = useMemo(() => (schedule.data ? upcomingRaces(schedule.data) : []), [schedule.data])
  const [round, setRound] = useState<string | null>(null)
  const race = upcoming.find((r) => r.round === round) ?? upcoming[0]

  if (schedule.isLoading) return <Loader label="Chargement du calendrier…" />
  if (schedule.error) return <ErrorState error={schedule.error} onRetry={() => schedule.refetch()} />
  if (!race) return <Card>La saison est terminée : aucun Grand Prix à venir.</Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Grand Prix"
          value={race.round}
          onChange={setRound}
          options={upcoming.map((r) => ({ value: r.round, label: `R${r.round} · ${r.raceName} (${fmtDay(raceStart(r))})` }))}
        />
        <div className="text-sm text-muted">
          {race.Circuit.circuitName} · {race.Circuit.Location.locality}, {race.Circuit.Location.country}
        </div>
      </div>
      <WeekendWeather race={race} />
    </div>
  )
}

function WeekendWeather({ race }: { race: JRace }) {
  const { weekend, isLoading, error, refetch, dataUpdatedAt } = useWeekendWeather(race)
  const notif = useAlertNotifications(weekend?.alerts, race.raceName)

  if (isLoading) return <Loader label="Chargement des prévisions Open-Meteo…" />
  if (error) return <ErrorState error={error} onRetry={() => refetch()} />
  if (!weekend) return null

  const now = Date.now()
  const lead = weekend.sessions[0].session.start - now
  const allUnavailable = weekend.sessions.every((s) => s.reliability === 'indisponible') && weekend.sessions[0].session.start > now

  return (
    <div className="space-y-6">
      <AlertBanner alerts={weekend.alerts} unavailable={allUnavailable} leadDays={lead / DAY} />

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
        <span>Prévisions mises à jour à {new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} · actualisation automatique toutes les 15 min · horaires dans votre fuseau</span>
        {notif.supported ? (
          <button
            onClick={notif.toggle}
            disabled={notif.permission === 'denied'}
            className={clsx('flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm font-semibold', notif.enabled ? 'border-accent text-accent' : 'border-border text-text hover:bg-surface-2', notif.permission === 'denied' && 'opacity-50')}
          >
            {notif.enabled ? <Bell size={16} /> : <BellOff size={16} />}
            {notif.permission === 'denied' ? 'Notifications bloquées par le navigateur' : notif.enabled ? 'Notifications activées' : 'Activer les notifications'}
          </button>
        ) : (
          <span>Notifications non prises en charge par ce navigateur</span>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {weekend.sessions.map((s) => (
          <SessionCard key={s.session.key} sw={s} alerts={weekend.alerts.filter((a) => a.sessionKey === s.session.key)} />
        ))}
      </div>

      {weekend.hours.length > 0 && <WeekendCharts hours={weekend.hours} sessions={weekend.sessions} />}

      <WeatherHowItWorks />
    </div>
  )
}

function AlertBanner({ alerts, unavailable, leadDays }: { alerts: WeatherAlert[]; unavailable: boolean; leadDays: number }) {
  if (unavailable)
    return (
      <div className="rounded-xl border border-border bg-surface p-4 text-sm">
        <p className="font-bold">Prévision indisponible</p>
        <p className="text-muted">Le week-end commence dans {Math.round(leadDays)} jours : au-delà de 16 jours, Open-Meteo ne fournit aucune prévision. Revenez plus tard.</p>
      </div>
    )
  const level = maxLevel(alerts)
  const important = alerts.filter((a) => LEVEL_RANK[a.level] >= LEVEL_RANK.vigilance)
  if (!level || (level === 'info' && !important.length)) {
    const trend = alerts.some((a) => a.trend) || leadDays > 7
    return (
      <div className="flex items-start gap-3 rounded-xl border border-ok/40 bg-ok/10 p-4">
        <CheckCircle2 className="mt-0.5 shrink-0 text-ok" size={20} />
        <div className="text-sm">
          <p className="font-bold text-ok">Aucune alerte significative{trend ? ' (tendance)' : ''}</p>
          <p className="text-muted">
            {alerts.length ? `${alerts.length} information(s) mineure(s), détaillée(s) dans les cartes ci-dessous.` : 'Conditions attendues stables sur l’ensemble du week-end.'}
            {leadDays > 7 && ' Au-delà de 7 jours, seules des tendances sont affichées : les alertes ne dépassent pas le niveau « info ».'}
          </p>
        </div>
      </div>
    )
  }
  const s = LEVEL_STYLE[level]
  return (
    <div className={clsx('rounded-xl border p-4', s.border, s.bg)} role="alert">
      <div className="flex items-center gap-2">
        <s.Icon className={s.text} size={22} />
        <p className={clsx('text-lg font-black uppercase tracking-wide', s.text)}>{s.label} météo</p>
        <span className="text-sm text-muted">· {important.length} point(s) d’attention</span>
      </div>
      <ul className="mt-3 space-y-2">
        {important.slice(0, 4).map((a) => (
          <li key={a.id} className="text-sm">
            <span className="font-bold">{a.sessionLabel}</span> <span className="text-muted">({fmtDateTime(a.start)})</span> — {a.title}. <span className="text-muted">{a.impact}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

const RELIABILITY: Record<SessionWeather['reliability'], { label: string; cls: string }> = {
  haute: { label: 'Fiabilité élevée', cls: 'text-ok' },
  moyenne: { label: 'Fiabilité moyenne', cls: 'text-warn' },
  tendance: { label: 'Tendance seulement', cls: 'text-muted' },
  indisponible: { label: 'Prévision indisponible', cls: 'text-muted' },
}

function SessionCard({ sw, alerts }: { sw: SessionWeather; alerts: WeatherAlert[] }) {
  const level = maxLevel(alerts)
  const rel = RELIABILITY[sw.reliability]
  const past = sw.session.end < Date.now()
  const trend = sw.reliability === 'tendance'
  return (
    <section className={clsx('flex flex-col rounded-xl border bg-surface p-4', level ? LEVEL_STYLE[level].border : 'border-border', past && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-black">{sw.session.label}</h3>
          <p className="text-xs text-muted">{fmtDateTime(sw.session.start)}{past && ' · terminée'}</p>
        </div>
        {level && <LevelBadge level={level} />}
      </div>
      <p className={clsx('mt-1 text-[11px] font-semibold uppercase tracking-wider', rel.cls)}>{rel.label}</p>

      {sw.reliability === 'indisponible' ? (
        <p className="mt-3 text-sm text-muted">{past ? 'Session passée : les prévisions ne couvrent que les heures à venir.' : 'Trop lointain pour une prévision (au-delà de l’horizon de 16 jours).'}</p>
      ) : trend ? (
        <div className="mt-3 text-sm">
          <p className="text-lg font-bold">{trendLabel(sw)}</p>
          <p className="text-muted">Températures autour de {Math.round(sw.airAvg / 5) * 5} °C. Valeurs indicatives : à plus de 7 jours, les modèles météo ne sont pas fiables heure par heure.</p>
        </div>
      ) : (
        <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
          <Metric icon={<CloudRain size={14} />} label="Pluie" value={`${num(sw.rainProb)} %`} />
          <Metric icon={<Droplets size={14} />} label="Cumul" value={`${num(sw.rainMm, 1)} mm`} />
          <Metric icon={<Wind size={14} />} label="Vent / rafales" value={`${num(sw.windAvg)} / ${num(sw.gustMax)} km/h`} />
          <Metric icon={<Thermometer size={14} />} label="Air" value={`${num(sw.airAvg)} °C`} />
          <Metric icon={<Gauge size={14} />} label="Piste (estim.)" value={`${num(sw.trackMin)}–${num(sw.trackMax)} °C`} />
        </dl>
      )}

      {alerts.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-border pt-3">
          {alerts.map((a) => (
            <li key={a.id} className="text-sm">
              <div className="flex flex-wrap items-center gap-2">
                <LevelBadge level={a.level} />
                <span className="font-semibold">{a.title}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted">{a.detail}</p>
              <p className="mt-0.5 text-xs"><span className="font-semibold text-text">Impact sportif :</span> <span className="text-muted">{a.impact}</span></p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div>
      <dt className="flex items-center gap-1 text-[11px] uppercase tracking-wider text-muted">{icon}{label}</dt>
      <dd className="font-mono font-semibold">{value}</dd>
    </div>
  )
}

function WeekendCharts({ hours, sessions }: { hours: EnrichedHour[]; sessions: SessionWeather[] }) {
  const trendFrom = Date.now() + 7 * DAY
  const data = hours.map((h) => ({ ...h, track: Math.round(h.track * 10) / 10 }))
  const areas = (
    <>
      {sessions.map((s) => (
        <ReferenceArea key={s.session.key} x1={s.session.start} x2={s.session.end} fill="var(--color-f1)" fillOpacity={0.12} ifOverflow="hidden" label={{ value: s.session.key === 'RACE' ? 'Course' : s.session.key, position: 'insideTop', fill: 'var(--color-muted)', fontSize: 10 }} />
      ))}
      {hours.length && hours[hours.length - 1].time > trendFrom && (
        <ReferenceArea x1={Math.max(trendFrom, hours[0].time)} x2={hours[hours.length - 1].time} fill="var(--color-muted)" fillOpacity={0.08} ifOverflow="hidden" />
      )}
    </>
  )
  const x = (
    <XAxis dataKey="time" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={(t) => fmtHour(t)} minTickGap={40} {...axisProps} />
  )
  const label = (t: unknown) => fmtHour(Number(t))
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      <Card title="Températures (°C)">
        <div className="h-56">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} vertical={false} />
              {areas}
              {x}
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={label} formatter={(v) => `${num(Number(v), 1)} °C`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Line dataKey="temp" name="Air" stroke="var(--color-info)" strokeWidth={2} dot={false} />
              <Line dataKey="track" name="Piste (estim.)" stroke="var(--color-warn)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Probabilité de pluie (%)">
        <div className="h-56">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} vertical={false} />
              {areas}
              {x}
              <YAxis domain={[0, 100]} {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={label} formatter={(v, n) => (n === 'Cumul' ? `${num(Number(v), 1)} mm` : `${num(Number(v))} %`)} />
              <Bar dataKey="precipProb" name="Probabilité" fill="var(--color-info)" radius={[2, 2, 0, 0]} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <Card title="Vent (km/h)">
        <div className="h-56">
          <ResponsiveContainer>
            <ComposedChart data={data} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
              <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} vertical={false} />
              {areas}
              {x}
              <YAxis {...axisProps} />
              <Tooltip {...tooltipStyle} labelFormatter={label} formatter={(v) => `${num(Number(v))} km/h`} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area dataKey="gust" name="Rafales" stroke="var(--color-muted)" fill="var(--color-muted)" fillOpacity={0.15} strokeWidth={1} dot={false} />
              <Line dataKey="wind" name="Vent moyen" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Card>
      <p className="text-xs text-muted lg:col-span-3">Zones rouges : sessions. Zone grisée : au-delà de 7 jours (tendance uniquement).</p>
    </div>
  )
}

function WeatherHowItWorks() {
  const T = ALERT_THRESHOLDS
  return (
    <HowItWorks>
      <p>
        <strong>Source.</strong> Prévisions horaires Open-Meteo (modèles « best match », jusqu’à 16 jours) au point GPS du circuit. Chaque session (horaires officiels
        du calendrier Jolpica, durée 1 h, course 2 h) est croisée avec les heures qu’elle chevauche : on retient la probabilité de pluie <em>maximale</em>, le cumul pondéré
        par la durée de chevauchement, le vent moyen, les rafales maximales et les températures.
      </p>
      <p>
        <strong>Température de piste estimée.</strong> Open-Meteo ne la fournit pas : on la modélise. Le rayonnement solaire par ciel clair est calculé à partir de la hauteur du
        soleil (position astronomique selon la date, l’heure et les coordonnées) : <code>G₀ = 1098·sin(h)·e^(−0,057/sin h)</code> (Haurwitz), puis atténué par la couverture
        nuageuse <code>G = G₀·(1 − 0,75·c^3,4)</code> (Kasten-Czeplak). Ensuite : <code>T_piste = T_air + {TRACK_MODEL.base} + {TRACK_MODEL.solarGain}·G / (1 + vent/{TRACK_MODEL.windHalf})</code>,
        et <code>T_air + 1</code> si la piste est mouillée (≥ {TRACK_MODEL.wetThresholdMm} mm/h). Plein soleil à 30 °C → environ 45-50 °C de piste, ce qui correspond aux ordres de grandeur
        habituels, mais l’erreur peut atteindre ±5-8 °C (couleur de l’asphalte, vent réel, inertie thermique non modélisée).
      </p>
      <p>
        <strong>Niveaux d’alerte.</strong> Pluie : info ≥ {T.rain.info} %, vigilance ≥ {T.rain.vigilance} % ou ≥ {T.rain.mmVigilance} mm, alerte ≥ {T.rain.alerte} % ou ≥ {T.rain.mmAlerte} mm.
        Vent : vigilance si rafales ≥ {T.gust.vigilance} km/h, alerte ≥ {T.gust.alerte} km/h. Chaleur : piste ≥ {T.track.vigilance} °C ou air ≥ {T.air.vigilance} °C (vigilance), piste ≥ {T.track.alerte} °C ou
        air ≥ {T.air.alerte} °C (alerte). Changement de conditions : écart de probabilité de pluie ≥ {T.swing.vigilance} points dans la session, ou alternance d’heures sèches et pluvieuses.
      </p>
      <p>
        <strong>Fiabilité.</strong> ≤ 3 jours : élevée ; 3 à 7 jours : moyenne ; au-delà de 7 jours, seule une <em>tendance</em> est donnée et les alertes sont plafonnées au niveau info ;
        au-delà de 16 jours : prévision indisponible. Une probabilité de pluie de 40 % signifie « 4 chances sur 10 qu’il pleuve au moins 0,1 mm dans l’heure » sur la maille du modèle (quelques km) : les
        averses orageuses très locales restent difficiles à prévoir.
      </p>
      <p>
        <strong>Notifications.</strong> Optionnelles et locales : elles ne fonctionnent que tant que la page est ouverte (aucun serveur). Les alertes déjà présentes au chargement ne sont pas notifiées.
      </p>
    </HowItWorks>
  )
}
