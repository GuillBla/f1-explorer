import { useMemo } from 'react'
import type { JRace } from '@/lib/api'
import { useForecast } from './hooks'
import { enrichHour, projectSession, sessionAlerts, weekendSessions, LEVEL_RANK, type EnrichedHour, type SessionWeather, type WeatherAlert } from '../models/weather'

export interface WeekendWeather {
  sessions: SessionWeather[]
  alerts: WeatherAlert[]
  hours: EnrichedHour[] // hours covering the weekend (first session − 6 h → race + 6 h)
  forecastEnd: number | null
}

/** Forecast for a race weekend, projected on each session, with alerts. */
export function useWeekendWeather(race: JRace | null | undefined) {
  const lat = race ? Number(race.Circuit.Location.lat) : undefined
  const lon = race ? Number(race.Circuit.Location.long) : undefined
  const q = useForecast(lat, lon)
  const data = useMemo<WeekendWeather | null>(() => {
    if (!race || !q.data || lat == null || lon == null) return null
    const now = Date.now()
    const slots = weekendSessions(race)
    const from = slots[0].start - 6 * 3_600_000
    const to = slots[slots.length - 1].end + 6 * 3_600_000
    const hours = q.data.filter((h) => h.time >= from && h.time <= to).map((h) => enrichHour(h, lat, lon))
    const sessions = slots.map((s) => projectSession(s, hours, now))
    const alerts = sessions.filter((s) => s.session.end > now).flatMap(sessionAlerts).sort((a, b) => LEVEL_RANK[b.level] - LEVEL_RANK[a.level] || a.start - b.start)
    return { sessions, alerts, hours, forecastEnd: q.data.length ? q.data[q.data.length - 1].time : null }
  }, [race, q.data, lat, lon])
  return { ...q, weekend: data }
}
