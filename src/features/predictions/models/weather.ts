/**
 * Weather model for a Grand Prix weekend — pure functions.
 * - projects hourly Open-Meteo forecasts on each session window,
 * - estimates track temperature from air temperature, sun elevation and cloud cover,
 * - derives tiered alerts (info / vigilance / alerte) with their sporting impact.
 */
import type { JRace } from '@/lib/api'

const HOUR = 3_600_000
const DAY = 86_400_000

export interface HourPoint {
  time: number // UTC ms (start of the hour)
  temp: number
  precipProb: number
  precip: number
  wind: number
  gust: number
  cloud: number
  code: number
}

export interface SessionSlot {
  key: 'FP1' | 'FP2' | 'FP3' | 'SQ' | 'SPRINT' | 'Q' | 'RACE'
  label: string
  start: number
  end: number
}

const SESSION_DEFS: { field: keyof JRace | 'race'; key: SessionSlot['key']; label: string; minutes: number }[] = [
  { field: 'FirstPractice', key: 'FP1', label: 'Essais libres 1', minutes: 60 },
  { field: 'SecondPractice', key: 'FP2', label: 'Essais libres 2', minutes: 60 },
  { field: 'ThirdPractice', key: 'FP3', label: 'Essais libres 3', minutes: 60 },
  { field: 'SprintQualifying', key: 'SQ', label: 'Qualifs sprint', minutes: 45 },
  { field: 'Sprint', key: 'SPRINT', label: 'Sprint', minutes: 60 },
  { field: 'Qualifying', key: 'Q', label: 'Qualifications', minutes: 60 },
  { field: 'race', key: 'RACE', label: 'Course', minutes: 120 },
]

export function parseUtc(date: string, time?: string): number {
  const t = time ?? '12:00:00Z'
  return Date.parse(`${date}T${t.endsWith('Z') ? t : `${t}Z`}`)
}

/** Session windows of a race weekend, sorted chronologically. */
export function weekendSessions(race: Pick<JRace, 'date' | 'time' | 'FirstPractice' | 'SecondPractice' | 'ThirdPractice' | 'SprintQualifying' | 'Sprint' | 'Qualifying'>): SessionSlot[] {
  const out: SessionSlot[] = []
  for (const d of SESSION_DEFS) {
    const s = d.field === 'race' ? { date: race.date, time: race.time } : (race[d.field as keyof typeof race] as { date: string; time?: string } | undefined)
    if (!s?.date) continue
    const start = parseUtc(s.date, s.time)
    out.push({ key: d.key, label: d.label, start, end: start + d.minutes * 60_000 })
  }
  return out.sort((a, b) => a.start - b.start)
}

/* ---------------- Track temperature model ---------------- */

/** Sun elevation (degrees) — simple astronomical approximation (±1°, no equation of time). */
export function solarElevation(lat: number, lon: number, timeMs: number): number {
  const d = new Date(timeMs)
  const start = Date.UTC(d.getUTCFullYear(), 0, 0)
  const doy = (timeMs - start) / DAY
  const decl = ((23.44 * Math.PI) / 180) * Math.sin((2 * Math.PI * (284 + doy)) / 365)
  const hours = d.getUTCHours() + d.getUTCMinutes() / 60
  const hourAngle = ((hours + lon / 15 - 12) * 15 * Math.PI) / 180
  const phi = (lat * Math.PI) / 180
  const sinE = Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos(hourAngle)
  return (Math.asin(Math.max(-1, Math.min(1, sinE))) * 180) / Math.PI
}

/** Global horizontal irradiance (W/m²): clear-sky (Haurwitz) × Kasten–Czeplak cloud attenuation. */
export function irradiance(elevationDeg: number, cloudPct: number): number {
  const sinE = Math.sin((elevationDeg * Math.PI) / 180)
  if (sinE <= 0) return 0
  const clear = 1098 * sinE * Math.exp(-0.057 / sinE)
  return clear * (1 - 0.75 * Math.pow(Math.max(0, Math.min(100, cloudPct)) / 100, 3.4))
}

export const TRACK_MODEL = {
  base: 1.5, // asphalt stays slightly warmer than air (thermal inertia), even at night
  solarGain: 0.022, // °C per W/m² of irradiance
  windHalf: 40, // wind (km/h) that halves the solar gain
  wetThresholdMm: 0.3, // above this, the track is wet and close to air temperature
}

/** Estimated track temperature (°C). */
export function trackTemperature(airC: number, irradianceWm2: number, windKmh: number, precipMm: number): number {
  if (precipMm >= TRACK_MODEL.wetThresholdMm) return airC + 1
  return airC + TRACK_MODEL.base + (TRACK_MODEL.solarGain * irradianceWm2) / (1 + windKmh / TRACK_MODEL.windHalf)
}

export function enrichHour(h: HourPoint, lat: number, lon: number) {
  // middle of the hour for the sun position
  const elev = solarElevation(lat, lon, h.time + HOUR / 2)
  const sw = irradiance(elev, h.cloud)
  return { ...h, irradiance: sw, track: trackTemperature(h.temp, sw, h.wind, h.precip) }
}
export type EnrichedHour = ReturnType<typeof enrichHour>

/* ---------------- Session projection ---------------- */

export type Reliability = 'haute' | 'moyenne' | 'tendance' | 'indisponible'

export function reliabilityFor(leadMs: number, hasData: boolean): Reliability {
  if (!hasData) return 'indisponible'
  const days = leadMs / DAY
  if (days <= 3) return 'haute'
  if (days <= 7) return 'moyenne'
  return 'tendance'
}

export interface SessionWeather {
  session: SessionSlot
  reliability: Reliability
  hours: EnrichedHour[]
  rainProb: number // max over the session
  rainMm: number // accumulated (overlap-weighted)
  windAvg: number
  gustMax: number
  airAvg: number
  airMax: number
  trackMin: number
  trackMax: number
  rainProbSwing: number // max - min precipitation probability within the session
  wetHours: number
  dryHours: number
}

export function projectSession(session: SessionSlot, hours: EnrichedHour[], now: number): SessionWeather {
  const sel = hours.filter((h) => h.time < session.end && h.time + HOUR > session.start)
  const overlap = (h: EnrichedHour) => (Math.min(h.time + HOUR, session.end) - Math.max(h.time, session.start)) / HOUR
  const pick = (f: (h: EnrichedHour) => number) => sel.map(f)
  const max = (xs: number[]) => (xs.length ? Math.max(...xs) : NaN)
  const min = (xs: number[]) => (xs.length ? Math.min(...xs) : NaN)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN)
  const probs = pick((h) => h.precipProb)
  return {
    session,
    reliability: reliabilityFor(session.start - now, sel.length > 0),
    hours: sel,
    rainProb: max(probs),
    rainMm: sel.reduce((a, h) => a + h.precip * overlap(h), 0),
    windAvg: avg(pick((h) => h.wind)),
    gustMax: max(pick((h) => h.gust)),
    airAvg: avg(pick((h) => h.temp)),
    airMax: max(pick((h) => h.temp)),
    trackMin: min(pick((h) => h.track)),
    trackMax: max(pick((h) => h.track)),
    rainProbSwing: probs.length ? max(probs) - min(probs) : 0,
    wetHours: sel.filter((h) => h.precip >= 0.1).length,
    dryHours: sel.filter((h) => h.precip < 0.1).length,
  }
}

/* ---------------- Alerts ---------------- */

export type AlertLevel = 'info' | 'vigilance' | 'alerte'
export type AlertKind = 'pluie' | 'vent' | 'chaleur' | 'froid' | 'changement'

export interface WeatherAlert {
  id: string
  level: AlertLevel
  kind: AlertKind
  sessionKey: SessionSlot['key']
  sessionLabel: string
  start: number
  title: string
  detail: string
  impact: string
  trend: boolean
}

export const LEVEL_RANK: Record<AlertLevel, number> = { info: 0, vigilance: 1, alerte: 2 }

export const ALERT_THRESHOLDS = {
  rain: { info: 15, vigilance: 30, alerte: 60, mmVigilance: 0.5, mmAlerte: 2 },
  gust: { vigilance: 45, alerte: 60 },
  windInfo: 30,
  track: { vigilance: 45, alerte: 52 },
  air: { vigilance: 32, alerte: 36 },
  coldTrack: 18,
  swing: { vigilance: 40, alerte: 60 },
}

const IMPACT: Record<AlertKind, Record<AlertLevel, string>> = {
  pluie: {
    info: 'Risque faible : les équipes préparent des réglages de compromis, mais la session devrait rester sèche.',
    vigilance: 'Averse possible : pneus intermédiaires à prévoir, timing crucial des arrêts, risque de drapeau rouge ou de Safety Car.',
    alerte: 'Piste mouillée probable : intermédiaires ou pluie, hiérarchie bousculée, la qualification peut se jouer sur le dernier run, variance très forte en course.',
  },
  vent: {
    info: 'Vent sensible : équilibre aéro plus délicat dans les virages rapides.',
    vigilance: 'Rafales fortes : voitures instables au freinage, pilotes plus prudents, appuis aéro adaptés.',
    alerte: 'Rafales violentes : risque de sorties de piste, de débris et de suspension de session.',
  },
  chaleur: {
    info: 'Piste chaude : surveillance de la gestion thermique.',
    vigilance: 'Piste très chaude : surchauffe et dégradation accrue des gommes tendres, stratégies à plus d’arrêts, freins et moteur à refroidir.',
    alerte: 'Chaleur extrême : forte dégradation thermique, probables stratégies à 2-3 arrêts, fatigue physique des pilotes.',
  },
  froid: {
    info: 'Piste froide : mise en température des pneus difficile, graining possible, tours de préparation plus longs en qualifs.',
    vigilance: 'Piste froide : graining, adhérence faible.',
    alerte: 'Piste très froide.',
  },
  changement: {
    info: 'Conditions évolutives : écarts de grip d’un relais à l’autre.',
    vigilance: 'Conditions changeantes pendant la session : passage sec/mouillé possible, les choix de pneus en direct (crossover) feront la différence.',
    alerte: 'Bascule météo attendue en pleine session : fenêtre de crossover sec → intermédiaires (≈ 1,5-3 s/tour d’écart) décisive, loterie stratégique.',
  },
}

function cap(level: AlertLevel, trend: boolean): AlertLevel {
  return trend ? 'info' : level
}

const fmt = (x: number, d = 0) => (Number.isFinite(x) ? x.toFixed(d) : '—')

export function sessionAlerts(sw: SessionWeather): WeatherAlert[] {
  if (sw.reliability === 'indisponible') return []
  const trend = sw.reliability === 'tendance'
  const T = ALERT_THRESHOLDS
  const out: WeatherAlert[] = []
  const add = (kind: AlertKind, level: AlertLevel, title: string, detail: string) => {
    const l = cap(level, trend)
    out.push({
      id: `${sw.session.key}-${kind}-${l}`,
      level: l,
      kind,
      sessionKey: sw.session.key,
      sessionLabel: sw.session.label,
      start: sw.session.start,
      title: trend ? `Tendance : ${title.toLowerCase()}` : title,
      detail,
      impact: IMPACT[kind][level],
      trend,
    })
  }

  // Rain
  const rainLevel: AlertLevel | null =
    sw.rainProb >= T.rain.alerte || sw.rainMm >= T.rain.mmAlerte ? 'alerte'
    : sw.rainProb >= T.rain.vigilance || sw.rainMm >= T.rain.mmVigilance ? 'vigilance'
    : sw.rainProb >= T.rain.info ? 'info' : null
  if (rainLevel) add('pluie', rainLevel, 'Risque de pluie', `Probabilité max ${fmt(sw.rainProb)} %, cumul estimé ${fmt(sw.rainMm, 1)} mm.`)

  // Wind
  const windLevel: AlertLevel | null =
    sw.gustMax >= T.gust.alerte ? 'alerte' : sw.gustMax >= T.gust.vigilance ? 'vigilance' : sw.windAvg >= T.windInfo ? 'info' : null
  if (windLevel) add('vent', windLevel, 'Vent fort', `Vent moyen ${fmt(sw.windAvg)} km/h, rafales jusqu’à ${fmt(sw.gustMax)} km/h.`)

  // Heat
  const heatLevel: AlertLevel | null =
    sw.trackMax >= T.track.alerte || sw.airMax >= T.air.alerte ? 'alerte'
    : sw.trackMax >= T.track.vigilance || sw.airMax >= T.air.vigilance ? 'vigilance' : null
  if (heatLevel) add('chaleur', heatLevel, 'Chaleur extrême', `Air jusqu’à ${fmt(sw.airMax)} °C, piste estimée jusqu’à ${fmt(sw.trackMax)} °C.`)
  else if (sw.trackMax < T.coldTrack) add('froid', 'info', 'Piste froide', `Piste estimée à ${fmt(sw.trackMax)} °C au maximum.`)

  // Changing conditions inside the session
  const mixed = sw.wetHours > 0 && sw.dryHours > 0
  const changeLevel: AlertLevel | null =
    sw.rainProbSwing >= T.swing.alerte || (mixed && sw.rainProb >= T.rain.alerte) ? 'alerte'
    : sw.rainProbSwing >= T.swing.vigilance || mixed ? 'vigilance'
    : sw.trackMax - sw.trackMin >= 8 ? 'info' : null
  if (changeLevel)
    add('changement', changeLevel, 'Conditions changeantes', `Probabilité de pluie qui varie de ${fmt(sw.rainProbSwing)} points pendant la session ; piste ${fmt(sw.trackMin)} → ${fmt(sw.trackMax)} °C.`)

  return out.sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level])
}

export function maxLevel(alerts: WeatherAlert[]): AlertLevel | null {
  return alerts.reduce<AlertLevel | null>((m, a) => (m === null || LEVEL_RANK[a.level] > LEVEL_RANK[m] ? a.level : m), null)
}

/** Coarse wording used when only a trend is available (> 7 days). */
export function trendLabel(sw: SessionWeather): string {
  if (sw.reliability === 'indisponible') return 'Prévision indisponible'
  if (sw.rainProb >= 50) return 'Tendance humide'
  if (sw.rainProb >= 25) return 'Averses possibles'
  return 'Plutôt sec'
}
