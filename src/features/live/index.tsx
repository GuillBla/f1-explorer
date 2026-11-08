import { lazy, Suspense, useEffect, useMemo } from 'react'
import { NavLink, Route, Routes, useLocation, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import { ErrorState, Loader, Page, PageHeader } from '@/components/ui'
import { SessionPicker } from './components/SessionPicker'
import { ReplayBar } from './components/ReplayBar'
import { StatusBadge, type DataState } from './components/StatusBadge'
import { LiveContext, useLive, type LiveCtx, type SessionStatus } from './context'
import { useDrivers, useLapsRaw, useMeetingsOfYear, useSessionsOfYear } from './hooks/useOpenF1'
import { isRestricted, of1, type SessionX } from './lib/api'
import { ms } from './lib/format'
import { useReplay } from './store'

const Standings = lazy(() => import('./views/Standings'))
const TrackMap = lazy(() => import('./views/TrackMap'))
const LapAnalysis = lazy(() => import('./views/LapAnalysis'))
const Strategy = lazy(() => import('./views/Strategy'))
const PositionsChart = lazy(() => import('./views/PositionsChart'))
const Telemetry = lazy(() => import('./views/Telemetry'))
const RaceControlView = lazy(() => import('./views/RaceControl'))

const TABS = [
  { path: '', label: 'Classement' },
  { path: 'carte', label: 'Circuit' },
  { path: 'tours', label: 'Tours' },
  { path: 'strategie', label: 'Pneus' },
  { path: 'positions', label: 'Positions' },
  { path: 'telemetrie', label: 'Télémétrie' },
  { path: 'direction', label: 'Direction & météo' },
]

const startedOk = (s: SessionX) => ms(s.date_start) <= Date.now() && !s.is_cancelled

/** Most recent started session (current year, else previous year). */
function useDefaultSessionKey(enabled: boolean) {
  const y = new Date().getFullYear()
  const cur = useSessionsOfYear(y)
  const needPrev = enabled && cur.isSuccess && !cur.data.some(startedOk)
  const prev = useQuery({
    queryKey: ['live', 'sessions', y - 1],
    queryFn: () => of1<SessionX>('sessions', { year: y - 1 }, 600_000),
    enabled: needPrev,
  })
  const list = needPrev ? prev.data : cur.data
  const key = list ? [...list].reverse().find(startedOk)?.session_key : undefined
  return { key, error: cur.error ?? prev.error, loading: cur.isLoading || (needPrev && prev.isLoading) }
}

function useSessionByKey(key: number | undefined) {
  return useQuery({
    queryKey: ['live', 'session', key],
    queryFn: async () => (await of1<SessionX>('sessions', { session_key: key }, 600_000))[0] ?? null,
    enabled: key != null,
    staleTime: 600_000,
  })
}

export default function LiveModule() {
  const [params, setParams] = useSearchParams()
  const urlKey = params.get('session') ? Number(params.get('session')) : undefined
  const def = useDefaultSessionKey(urlKey == null)
  const sessionKey = urlKey ?? def.key
  const sessionQ = useSessionByKey(sessionKey)
  const session = sessionQ.data ?? undefined

  const now = useReplay((s) => s.now)
  const replay = useReplay((s) => s.replay)
  const status: SessionStatus = !session
    ? 'finished'
    : now < ms(session.date_start) ? 'upcoming' : now <= ms(session.date_end) ? 'live' : 'finished'
  const polling = status === 'live' && !replay

  // "now" ticker: every 5 s while live, every minute otherwise (to notice a session starting/ending).
  useEffect(() => {
    const id = setInterval(() => useReplay.getState().setNow(Date.now()), status === 'live' ? 5_000 : 60_000)
    return () => clearInterval(id)
  }, [status])

  // Leaving replay when the session changes.
  useEffect(() => { useReplay.getState().stop() }, [sessionKey])

  const drivers = useDrivers(session?.session_key, polling)
  const laps = useLapsRaw(session?.session_key, polling)
  const meetings = useMeetingsOfYear(session?.year ?? new Date().getFullYear())
  const meetingName = meetings.data?.find((m) => m.meeting_key === session?.meeting_key)?.meeting_name ?? session?.country_name ?? ''

  const range = useMemo(() => {
    if (!session) return { start: 0, end: 0 }
    let start = ms(session.date_start)
    let end = ms(session.date_end)
    for (const l of laps.data ?? []) {
      const s = ms(l.date_start)
      if (!Number.isFinite(s)) continue
      start = Math.min(start, s - 30_000)
      end = Math.max(end, s + (l.lap_duration ?? 0) * 1000 + 60_000)
    }
    if (status === 'live') end = Math.max(end, now)
    return { start, end }
  }, [session, laps.data, status, now])

  const ctx = useMemo<LiveCtx | null>(() => {
    if (!session) return null
    const list = [...(drivers.data ?? [])].sort((a, b) => a.driver_number - b.driver_number)
    return {
      session, meetingName, drivers: list,
      driverMap: new Map(list.map((d) => [d.driver_number, d])),
      status, polling, range, isRace: session.session_type === 'Race',
    }
  }, [session, meetingName, drivers.data, status, polling, range])

  const hasData = (drivers.data?.length ?? 0) > 0 && (laps.data?.length ?? 0) > 0
  const loadingData = drivers.isLoading || laps.isLoading
  // Without a paid OpenF1 account a running session returns 401/403 (or simply nothing yet).
  const restricted = isRestricted(drivers.error) || isRestricted(laps.error)
    || (status === 'live' && !replay && !hasData && !loadingData)
  const dataState: DataState = restricted ? 'restricted'
    : replay ? 'replay'
    : status === 'upcoming' ? 'upcoming'
    : !hasData && !loadingData && !drivers.error && !laps.error ? 'unavailable'
    : status === 'live' ? 'live' : 'finished'

  const select = (key: number) => setParams((p) => { p.set('session', String(key)); return p }, { replace: false })

  return (
    <Page>
      <PageHeader
        title="Live & replay"
        subtitle="Chronos, carte, stratégies et télémétrie à partir des données OpenF1. Pendant une session, le temps réel est réservé aux comptes payants : les données arrivent peu après la fin. Le mode replay rejoue n’importe quelle session passée."
      />
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SessionPicker session={session} onSelect={select} />
        {session && <StatusBadge state={dataState} />}
      </div>

      {(def.error || sessionQ.error) && <ErrorState error={def.error ?? sessionQ.error} onRetry={() => sessionQ.refetch()} />}
      {!session && !def.error && !sessionQ.error && (def.loading || sessionQ.isLoading) && <Loader label="Recherche de la dernière session…" />}
      {sessionQ.isSuccess && !sessionQ.data && <ErrorState error={`Session ${sessionKey} introuvable.`} />}

      {ctx && session && (
        <LiveContext.Provider value={ctx}>
          <SessionInfo state={dataState} />
          {(drivers.isLoading || laps.isLoading) && <Loader label="Chargement de la session…" />}
          {!restricted && (drivers.error || laps.error) && (
            <ErrorState error={drivers.error ?? laps.error} onRetry={() => { drivers.refetch(); laps.refetch() }} />
          )}
          {hasData && (
            <>
              <div className="mb-4"><ReplayBar /></div>
              <Tabs />
              <Suspense fallback={<Loader />}>
                <Routes>
                  <Route index element={<Standings />} />
                  <Route path="carte" element={<TrackMap />} />
                  <Route path="tours" element={<LapAnalysis />} />
                  <Route path="strategie" element={<Strategy />} />
                  <Route path="positions" element={<PositionsChart />} />
                  <Route path="telemetrie" element={<Telemetry />} />
                  <Route path="direction" element={<RaceControlView />} />
                  <Route path="*" element={<Standings />} />
                </Routes>
              </Suspense>
            </>
          )}
        </LiveContext.Provider>
      )}
    </Page>
  )
}

function SessionInfo({ state }: { state: DataState }) {
  const { session, meetingName } = useLive()
  const date = new Date(session.date_start).toLocaleString('fr-FR', { dateStyle: 'full', timeStyle: 'short' })
  const notes: Partial<Record<DataState, string>> = {
    restricted: 'La session est en cours : OpenF1 réserve le temps réel aux comptes payants. Les données seront disponibles peu après la fin de la session.',
    unavailable: 'Aucune donnée pour cette session pour le moment. Si elle vient de se terminer, réessayez dans quelques minutes.',
    upcoming: 'Cette session n’a pas encore commencé.',
    live: 'Session en cours : mise à jour automatique toutes les 5 secondes.',
  }
  return (
    <div className="mb-4">
      <p className="text-lg font-bold">
        {meetingName} <span className="text-muted">· {session.session_name}</span>
      </p>
      <p className="text-sm text-muted">{session.circuit_short_name} ({session.country_name}) · {date}</p>
      {notes[state] && (
        <p className={clsx('mt-2 rounded-md border px-3 py-2 text-sm',
          state === 'live' ? 'border-f1/40 bg-f1/10' : 'border-warn/40 bg-warn/10')}>
          {notes[state]}
        </p>
      )}
    </div>
  )
}

function Tabs() {
  const { search } = useLocation()
  return (
    <nav className="-mx-4 mb-4 overflow-x-auto px-4">
      <div className="flex min-w-max gap-1 border-b border-border">
        {TABS.map((t) => (
          <NavLink
            key={t.path}
            to={{ pathname: t.path ? `/live/${t.path}` : '/live', search }}
            end
            className={({ isActive }) => clsx(
              'border-b-2 px-3 py-2 text-sm font-semibold transition',
              isActive ? 'border-f1 text-text' : 'border-transparent text-muted hover:text-text',
            )}
          >
            {t.label}
          </NavLink>
        ))}
      </div>
    </nav>
  )
}
