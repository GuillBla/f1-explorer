import { useLive } from '../context'
import { useReplay } from '../store'

/**
 * Time every view is pinned on (epoch ms), quantised to `step` to limit re-renders:
 * - replay → replay clock;
 * - otherwise → "now" (live) clamped to the end of the session (finished → final state).
 */
export function useViewTime(step = 1000) {
  const { range } = useLive()
  const replayT = useReplay((s) => (s.replay ? Math.floor(s.t / step) * step : null))
  const now = useReplay((s) => s.now)
  if (replayT != null) return replayT
  return Math.min(now, range.end)
}
