import { useQuery } from '@tanstack/react-query'
import { driverStandingsWithRound, forecast16, qualifying, raceSessions, schedule, seasonResults, sessionBundle, teamCircuitHistory } from './data'
import type { WorkerPayload, WorkerResponse } from '../workers/protocol'

export const useSchedule = () => useQuery({ queryKey: ['pred', 'schedule'], queryFn: () => schedule('current'), staleTime: 3_600_000 })

export const useForecast = (lat?: number, lon?: number) =>
  useQuery({
    queryKey: ['pred', 'forecast', lat, lon],
    queryFn: () => forecast16(lat!, lon!),
    enabled: lat != null && lon != null,
    staleTime: 900_000,
    refetchInterval: 15 * 60_000, // new alerts can appear while the page is open
  })

export const useSeasonResults = () => useQuery({ queryKey: ['pred', 'season'], queryFn: () => seasonResults('current'), staleTime: 1_800_000 })

export const useQualifying = (season?: string, round?: string) =>
  useQuery({ queryKey: ['pred', 'quali', season, round], queryFn: () => qualifying(season!, round!), enabled: !!season && !!round, staleTime: 600_000 })

export const useTeamCircuit = (circuitId?: string, season?: number) =>
  useQuery({ queryKey: ['pred', 'circuitTeam', circuitId, season], queryFn: () => teamCircuitHistory(circuitId!, season!), enabled: !!circuitId && !!season, staleTime: 86_400_000 })

export const useDriverStandings = () => useQuery({ queryKey: ['pred', 'standings'], queryFn: () => driverStandingsWithRound('current'), staleTime: 1_800_000 })

export const useRaceSessions = (year: number, enabled = true) => useQuery({ queryKey: ['pred', 'sessions', year], queryFn: () => raceSessions(year), staleTime: 600_000, enabled })

export const useSessionBundle = (sessionKey: number | undefined, live: boolean) =>
  useQuery({
    queryKey: ['pred', 'bundle', sessionKey],
    queryFn: () => sessionBundle(sessionKey!, live),
    enabled: sessionKey != null,
    staleTime: live ? 5_000 : 3_600_000,
    refetchInterval: live ? 10_000 : false,
  })

/* ---------------- Worker bridge ---------------- */

let worker: Worker | null = null
let seq = 0
const pending = new Map<number, { resolve: (r: WorkerResponse) => void; reject: (e: Error) => void }>()

function getWorker() {
  if (!worker) {
    worker = new Worker(new URL('../workers/montecarlo.worker.ts', import.meta.url), { type: 'module' })
    worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
      const p = pending.get(e.data.id)
      if (!p) return
      pending.delete(e.data.id)
      if (e.data.type === 'error') p.reject(new Error(e.data.message))
      else p.resolve(e.data)
    }
    worker.onerror = (e) => {
      for (const p of pending.values()) p.reject(new Error(e.message || 'Erreur du Web Worker'))
      pending.clear()
      worker = null
    }
  }
  return worker
}

export function runInWorker<T extends WorkerResponse['type']>(payload: WorkerPayload & { type: T }): Promise<Extract<WorkerResponse, { type: T }>> {
  const id = ++seq
  return new Promise((resolve, reject) => {
    pending.set(id, { resolve: resolve as (r: WorkerResponse) => void, reject })
    getWorker().postMessage({ ...payload, id })
  })
}

export function useSimulation<T extends WorkerResponse['type']>(key: unknown[], payload: (WorkerPayload & { type: T }) | null) {
  return useQuery({
    queryKey: ['pred', 'sim', ...key],
    queryFn: () => runInWorker<T>(payload!),
    enabled: payload != null,
    staleTime: Infinity,
    retry: 0,
  })
}
