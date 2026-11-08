/** Open-Meteo client — https://open-meteo.com/ (free, no key, CORS enabled) */
import { fetchJson } from './http'

export interface HourlyForecast {
  time: string[]
  temperature_2m: number[]
  precipitation_probability: number[]
  precipitation: number[]
  wind_speed_10m: number[]
  wind_gusts_10m: number[]
  wind_direction_10m: number[]
  cloud_cover: number[]
  weather_code: number[]
}

export async function forecast(lat: number, lon: number, days = 7) {
  const hourly = 'temperature_2m,precipitation_probability,precipitation,wind_speed_10m,wind_gusts_10m,wind_direction_10m,cloud_cover,weather_code'
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=${hourly}&forecast_days=${days}&timezone=UTC`
  const r = await fetchJson<{ hourly: HourlyForecast; utc_offset_seconds: number }>(url, { ttlMs: 900_000 })
  return r.hourly
}
