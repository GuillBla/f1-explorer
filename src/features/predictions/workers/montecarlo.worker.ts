/** Web Worker running the Monte Carlo simulations off the main thread. */
import { calibrate, computeStrengths, simulateRace, type StrengthInput, type RaceRecord, type EntryDriver } from '../models/racePrediction'
import { simulateChampionship, type ChampionshipInput } from '../models/championship'
import type { WorkerRequest, WorkerResponse } from './protocol'

self.onmessage = (e: MessageEvent<WorkerRequest>) => {
  const req = e.data
  const t0 = performance.now()
  try {
    let res: WorkerResponse
    if (req.type === 'race') {
      const strengths = computeStrengths(req.input as StrengthInput)
      const odds = simulateRace(strengths, { draws: req.draws, sigma: req.sigma, rainProb: req.input.rainProb })
      res = { id: req.id, type: 'race', strengths, odds, ms: performance.now() - t0 }
    } else if (req.type === 'championship') {
      res = { id: req.id, type: 'championship', odds: simulateChampionship(req.input as ChampionshipInput), ms: performance.now() - t0 }
    } else {
      const { best, formOnly, all } = calibrate(req.records as RaceRecord[], new Map(req.drivers as [string, EntryDriver][]))
      res = { id: req.id, type: 'backtest', best, formOnly, all, ms: performance.now() - t0 }
    }
    ;(self as unknown as Worker).postMessage(res)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id: req.id, type: 'error', message: err instanceof Error ? err.message : String(err) } satisfies WorkerResponse)
  }
}
