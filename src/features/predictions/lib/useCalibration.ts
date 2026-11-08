import { useMemo } from 'react'
import { useSeasonResults, useSimulation } from './hooks'
import type { WorkerPayload } from '../workers/protocol'

/** Season backtest + (σ, grid weight) calibration, computed once in the worker and shared by pages. */
export function useCalibration() {
  const season = useSeasonResults()
  const payload = useMemo<(WorkerPayload & { type: 'backtest' }) | null>(
    () => (season.data ? { type: 'backtest', records: season.data.records, drivers: [...season.data.drivers] } : null),
    [season.data],
  )
  const calib = useSimulation(['calibration', season.data?.records.length ?? 0], payload)
  return { season, calib }
}
