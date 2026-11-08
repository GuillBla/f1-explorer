import { useMemo } from 'react'
import { parseISO } from 'date-fns'
import { CloudRain, Wind } from 'lucide-react'
import type { JRace } from '@/lib/api'
import { Card, ErrorState, Loader } from '@/components/ui'
import { useForecast } from '../lib/data'
import { fmtDate, raceDate } from '../lib/format'

/** WMO weather codes → short French label. */
function wmo(code: number) {
  if (code === 0) return 'Ensoleillé'
  if (code <= 2) return 'Éclaircies'
  if (code === 3) return 'Couvert'
  if (code <= 48) return 'Brouillard'
  if (code <= 57) return 'Bruine'
  if (code <= 67) return 'Pluie'
  if (code <= 77) return 'Neige'
  if (code <= 82) return 'Averses'
  if (code <= 86) return 'Averses de neige'
  return 'Orage'
}

/** Compact 7-day forecast at the circuit (Open-Meteo), highlighting race day when it falls in the window. */
export function WeatherWidget({ lat, lon, race }: { lat: number; lon: number; race?: JRace }) {
  const q = useForecast(lat, lon)
  const raceDay = race ? race.date : null

  const days = useMemo(() => {
    const h = q.data
    if (!h) return []
    const map = new Map<string, { tMin: number; tMax: number; rain: number; wind: number; codes: number[] }>()
    h.time.forEach((t, i) => {
      const day = t.slice(0, 10)
      const e = map.get(day) ?? { tMin: Infinity, tMax: -Infinity, rain: 0, wind: 0, codes: [] }
      e.tMin = Math.min(e.tMin, h.temperature_2m[i]); e.tMax = Math.max(e.tMax, h.temperature_2m[i])
      e.rain = Math.max(e.rain, h.precipitation_probability[i] ?? 0); e.wind = Math.max(e.wind, h.wind_speed_10m[i])
      e.codes.push(h.weather_code[i])
      map.set(day, e)
    })
    return [...map.entries()].map(([day, e]) => ({ day, ...e, code: Math.max(...e.codes) }))
  }, [q.data])

  return (
    <Card title="Météo sur le circuit">
      {q.isLoading && <Loader label="Prévisions…" />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {days.length > 0 && (
        <>
          <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7">
            {days.map((d) => {
              const isRace = d.day === raceDay
              return (
                <div key={d.day} className={`rounded-lg p-1.5 text-center text-xs ${isRace ? 'bg-f1/20 ring-1 ring-f1' : 'bg-surface-2'}`}>
                  <p className="font-semibold capitalize">{fmtDate(parseISO(d.day), 'EEE d')}</p>
                  <p className="text-[10px] text-muted">{wmo(d.code)}</p>
                  <p className="font-mono"><b>{Math.round(d.tMax)}°</b> <span className="text-muted">{Math.round(d.tMin)}°</span></p>
                  <p className="flex items-center justify-center gap-0.5 text-info"><CloudRain size={10} />{d.rain}%</p>
                  <p className="flex items-center justify-center gap-0.5 text-muted"><Wind size={10} />{Math.round(d.wind)}</p>
                </div>
              )
            })}
          </div>
          <p className="mt-2 text-[11px] text-muted">
            Prévisions horaires agrégées par jour (UTC) : max/min °C, probabilité de pluie max, vent max km/h. Source : Open-Meteo.
            {race && !days.some((d) => d.day === raceDay) && <> Le GP ({fmtDate(raceDate(race))}) est hors de la fenêtre de prévision.</>}
          </p>
        </>
      )}
    </Card>
  )
}
