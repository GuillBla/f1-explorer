import type { BacktestResult, DriverOdds, DriverStrength, EntryDriver, RaceRecord, StrengthInput } from '../models/racePrediction'
import type { ChampionshipInput, ChampionshipOdds } from '../models/championship'

export type WorkerRequest =
  | { id: number; type: 'race'; input: StrengthInput; draws: number; sigma: number }
  | { id: number; type: 'championship'; input: ChampionshipInput }
  | { id: number; type: 'backtest'; records: RaceRecord[]; drivers: [string, EntryDriver][] }

export type WorkerResponse =
  | { id: number; type: 'race'; strengths: DriverStrength[]; odds: DriverOdds[]; ms: number }
  | { id: number; type: 'championship'; odds: ChampionshipOdds[]; ms: number }
  | { id: number; type: 'backtest'; best: BacktestResult; formOnly: BacktestResult; all: BacktestResult[]; ms: number }
  | { id: number; type: 'error'; message: string }

type DistributiveOmit<T, K extends keyof T> = T extends unknown ? Omit<T, K> : never
export type WorkerPayload = DistributiveOmit<WorkerRequest, 'id'>
