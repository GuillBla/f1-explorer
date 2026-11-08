/** Data hooks for the circuits module (static files in public/data/circuits + Jolpica + Open-Meteo). */
import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import type { Feature, FeatureCollection, LineString } from 'geojson'
import { ergast, fetchJson, forecast, type JRace } from '@/lib/api'
import { CIRCUITS } from '../data/circuits'
import type { CircuitInfo } from '../data/types'
import { buildTrackModel, type LonLat, type TrackModel } from './geometry'
import { topoFeatures, type Topology } from './topojson'

export interface GeoProps {
  id: string; Location: string; Name: string; opened?: number; firstgp?: number; length?: number; altitude?: number
}
export type TrackFeature = Feature<LineString, GeoProps>

const staticUrl = (p: string) => new URL(p, document.baseURI).href
const WEEK = 7 * 86_400_000

// stable selectors so TanStack Query memoises the derived structures
const selectTracks = (fc: FeatureCollection<LineString, GeoProps>) => new Map(fc.features.map((f) => [f.properties.id, f as TrackFeature]))
const selectWorld = (topo: Topology) => topoFeatures(topo, 'countries')

/** All tracks (single ~115 kB file, fetched lazily the first time the module needs it). */
export function useTracks() {
  return useQuery({
    queryKey: ['circuits', 'tracks'],
    queryFn: () => fetchJson<FeatureCollection<LineString, GeoProps>>(staticUrl('./data/circuits/f1-circuits.geojson'), { ttlMs: WEEK }),
    staleTime: Infinity,
    select: selectTracks,
  })
}

export function useWorld() {
  return useQuery({
    queryKey: ['circuits', 'world'],
    queryFn: () => fetchJson<Topology>(staticUrl('./data/circuits/countries-110m.json'), { ttlMs: WEEK }),
    staleTime: Infinity,
    select: selectWorld,
  })
}

export function useSchedule() {
  return useQuery({ queryKey: ['circuits', 'schedule'], queryFn: () => ergast.schedule('current'), staleTime: 3_600_000 })
}

/** All winners on a circuit, paginated (Jolpica limit = 100). */
export function useCircuitWinners(id: string) {
  return useQuery({
    queryKey: ['circuits', 'winners', id],
    queryFn: async () => {
      const all: JRace[] = []
      for (let offset = 0; offset < 2000; offset += 100) {
        const page = await ergast.circuitResults(id, offset)
        all.push(...page)
        if (page.length < 100) break
      }
      return all
    },
    staleTime: 86_400_000,
  })
}

export function useForecast(lat: number, lon: number) {
  return useQuery({ queryKey: ['circuits', 'forecast', lat, lon], queryFn: () => forecast(lat, lon, 7), staleTime: 900_000 })
}

/** Track model for a circuit (memoised). */
export function useTrackModel(info: CircuitInfo | undefined, feature: TrackFeature | undefined): TrackModel | null {
  return useMemo(() => {
    if (!info || !feature) return null
    return buildTrackModel(feature.geometry.coordinates as LonLat[], { reverse: info.reverse, startFrac: info.startFrac })
  }, [info, feature])
}

/** Merge the editorial table with the live schedule (circuits in the schedule but unknown to the table are added). */
export function useCircuitList(schedule: JRace[] | undefined) {
  return useMemo(() => {
    const byCircuit = new Map<string, JRace>()
    schedule?.forEach((r) => byCircuit.set(r.Circuit.circuitId, r))
    const list: { info: CircuitInfo; race?: JRace }[] = CIRCUITS.map((info) => ({ info, race: byCircuit.get(info.id) }))
    schedule?.forEach((r) => {
      if (!CIRCUITS.some((c) => c.id === r.Circuit.circuitId)) {
        const L = r.Circuit.Location
        list.push({
          race: r,
          info: {
            id: r.Circuit.circuitId, geoId: '', name: r.Circuit.circuitName, shortName: r.Circuit.circuitName,
            locality: L.locality, country: L.country, continent: 'Europe', lat: +L.lat, lon: +L.long, type: 'permanent',
          },
        })
      }
    })
    return list
  }, [schedule])
}
