import { useEffect, useMemo, useState } from 'react'
import { useMeetingsOfYear, useSessionsOfYear } from '../hooks/useOpenF1'
import type { SessionX } from '../lib/api'

const FIRST_YEAR = 2023 // OpenF1 coverage starts in 2023

const started = (s: SessionX) => Date.parse(s.date_start) <= Date.now() && !s.is_cancelled

const selectCls =
  'rounded-md border border-border bg-surface-2 px-2 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-f1 min-w-0'

/** Year → Grand Prix → session. */
export function SessionPicker({ session, onSelect }: { session?: SessionX; onSelect: (key: number) => void }) {
  const thisYear = new Date().getFullYear()
  const [year, setYear] = useState(session?.year ?? thisYear)
  const [meetingKey, setMeetingKey] = useState<number | undefined>(session?.meeting_key)

  useEffect(() => {
    if (session) { setYear(session.year); setMeetingKey(session.meeting_key) }
  }, [session])

  const sessions = useSessionsOfYear(year)
  const meetings = useMeetingsOfYear(year)

  const meetingSessions = useMemo(
    () => (sessions.data ?? []).filter((s) => s.meeting_key === meetingKey),
    [sessions.data, meetingKey],
  )

  const pickMeeting = (mk: number, list = sessions.data ?? []) => {
    setMeetingKey(mk)
    const ms = list.filter((s) => s.meeting_key === mk)
    const target = [...ms].reverse().find(started) ?? ms[0]
    if (target) onSelect(target.session_key)
  }

  // When the year changes, jump to its most recent started meeting.
  const changeYear = (y: number) => {
    setYear(y)
    setMeetingKey(undefined)
    setAutoPick(true)
  }
  const [autoPick, setAutoPick] = useState(false)
  useEffect(() => {
    if (!autoPick || !sessions.data) return
    setAutoPick(false)
    const last = [...sessions.data].reverse().find(started) ?? sessions.data[0]
    if (last) pickMeeting(last.meeting_key, sessions.data)
  }, [sessions.data, autoPick])

  const years = Array.from({ length: thisYear - FIRST_YEAR + 1 }, (_, i) => thisYear - i)

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select aria-label="Année" className={selectCls} value={year} onChange={(e) => changeYear(Number(e.target.value))}>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
      <select
        aria-label="Grand Prix"
        className={`${selectCls} max-w-[14rem]`}
        value={meetingKey ?? ''}
        onChange={(e) => pickMeeting(Number(e.target.value))}
        disabled={!meetings.data}
      >
        {!meetings.data && <option>Chargement…</option>}
        {(meetings.data ?? []).map((m) => (
          <option key={m.meeting_key} value={m.meeting_key} disabled={m.is_cancelled}>
            {m.meeting_name}{m.is_cancelled ? ' (annulé)' : ''}
          </option>
        ))}
      </select>
      <select
        aria-label="Session"
        className={selectCls}
        value={session && session.meeting_key === meetingKey ? session.session_key : ''}
        onChange={(e) => onSelect(Number(e.target.value))}
        disabled={!meetingSessions.length}
      >
        {!(session && session.meeting_key === meetingKey) && <option value="">Session…</option>}
        {meetingSessions.map((s) => (
          <option key={s.session_key} value={s.session_key} disabled={s.is_cancelled}>
            {s.session_name}{s.is_cancelled ? ' (annulée)' : Date.parse(s.date_start) > Date.now() ? ' (à venir)' : ''}
          </option>
        ))}
      </select>
    </div>
  )
}
