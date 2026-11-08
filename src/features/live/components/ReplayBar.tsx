import { useEffect } from 'react'
import clsx from 'clsx'
import { Pause, Play, RotateCcw, X, History } from 'lucide-react'
import { useReplay, type Speed } from '../store'
import { useLive } from '../context'
import { clock, hhmm } from '../lib/format'

const TICK = 250
const SPEEDS: Speed[] = [1, 5, 20]

/** Drives the replay clock while playing. */
function useTicker(end: number) {
  const playing = useReplay((s) => s.playing)
  const speed = useReplay((s) => s.speed)
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const { t, seek, setPlaying } = useReplay.getState()
      const next = t + TICK * speed
      if (next >= end) { seek(end); setPlaying(false) } else seek(next)
    }, TICK)
    return () => clearInterval(id)
  }, [playing, speed, end])
}

export function ReplayBar() {
  const { range, status } = useLive()
  const { replay, playing, speed, t, start, stop, setPlaying, setSpeed, seek } = useReplay()
  useTicker(range.end)

  if (!replay) {
    return (
      <button
        onClick={() => start(range.start)}
        className="inline-flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-1.5 text-sm font-semibold hover:border-f1"
      >
        <History size={16} /> {status === 'live' ? 'Rejouer depuis le début' : 'Rejouer la session'}
      </button>
    )
  }

  const pct = ((t - range.start) / (range.end - range.start)) * 100
  return (
    <div className="flex w-full flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2">
      <div className="flex items-center gap-1">
        <button
          aria-label={playing ? 'Pause' : 'Lecture'}
          onClick={() => {
            if (!playing && t >= range.end) seek(range.start)
            setPlaying(!playing)
          }}
          className="grid h-8 w-8 place-items-center rounded-md bg-f1 text-white"
        >
          {playing ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button aria-label="Revenir au début" onClick={() => seek(range.start)} className="grid h-8 w-8 place-items-center rounded-md hover:bg-surface-2">
          <RotateCcw size={16} />
        </button>
      </div>
      <div className="flex overflow-hidden rounded-md border border-border text-xs font-bold">
        {SPEEDS.map((s) => (
          <button
            key={s}
            onClick={() => setSpeed(s)}
            className={clsx('px-2 py-1', s === speed ? 'bg-f1 text-white' : 'text-muted hover:bg-surface-2')}
          >
            x{s}
          </button>
        ))}
      </div>
      <div className="order-last flex w-full min-w-0 flex-1 items-center gap-2 sm:order-none sm:w-auto">
        <input
          type="range"
          aria-label="Position dans la session"
          min={range.start}
          max={range.end}
          step={1000}
          value={t}
          onChange={(e) => seek(Number(e.target.value))}
          className="w-full accent-[var(--color-f1)]"
          style={{ background: `linear-gradient(to right, var(--color-f1) ${pct}%, transparent ${pct}%)` }}
        />
      </div>
      <div className="font-mono text-xs tabular-nums text-muted">
        <span className="text-text">{clock(t - range.start)}</span> · {hhmm(t)}
      </div>
      <button onClick={stop} className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted hover:text-text">
        <X size={14} /> Quitter le replay
      </button>
    </div>
  )
}
