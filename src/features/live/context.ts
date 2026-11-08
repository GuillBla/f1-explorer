import { createContext, useContext } from 'react'
import type { Driver, SessionX } from './lib/api'

export type SessionStatus = 'upcoming' | 'live' | 'finished'

export interface LiveCtx {
  session: SessionX
  meetingName: string
  drivers: Driver[]
  driverMap: Map<number, Driver>
  status: SessionStatus
  /** true while the session is running and we are not replaying: queries refetch every ~5 s. */
  polling: boolean
  /** Time span covered by the session data (epoch ms). */
  range: { start: number; end: number }
  isRace: boolean
}

export const LiveContext = createContext<LiveCtx | null>(null)

export function useLive() {
  const ctx = useContext(LiveContext)
  if (!ctx) throw new Error('useLive hors du LiveContext')
  return ctx
}
