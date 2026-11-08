import { useMemo, useState } from 'react'
import { Card, ErrorState, Loader } from '@/components/ui'
import type { CircuitInfo } from '../data/types'
import { useCircuitWinners } from '../lib/data'

export function HistoryPanel({ info }: { info: CircuitInfo }) {
  const q = useCircuitWinners(info.id)
  const [showAll, setShowAll] = useState(false)

  const { rows, drivers, teams } = useMemo(() => {
    const races = q.data ?? []
    const rows = races
      .map((r) => ({ season: r.season, round: r.round, raceName: r.raceName, w: r.Results?.[0] }))
      .filter((r) => r.w)
      .sort((a, b) => +b.season - +a.season || +b.round - +a.round)
    const dCount = new Map<string, { name: string; wins: number; years: string[] }>()
    const tCount = new Map<string, { name: string; wins: number }>()
    for (const r of rows) {
      const d = r.w!.Driver
      const e = dCount.get(d.driverId) ?? { name: `${d.givenName} ${d.familyName}`, wins: 0, years: [] }
      e.wins++; e.years.push(r.season); dCount.set(d.driverId, e)
      const c = r.w!.Constructor
      const t = tCount.get(c.constructorId) ?? { name: c.name, wins: 0 }
      t.wins++; tCount.set(c.constructorId, t)
    }
    return {
      rows,
      drivers: [...dCount.values()].sort((a, b) => b.wins - a.wins).slice(0, 5),
      teams: [...tCount.values()].sort((a, b) => b.wins - a.wins).slice(0, 5),
    }
  }, [q.data])

  const max = drivers[0]?.wins ?? 1
  const visible = showAll ? rows : rows.slice(0, 12)

  return (
    <Card title="Historique">
      {q.isLoading && <Loader label="Chargement du palmarès…" />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.isSuccess && rows.length === 0 && <p className="text-sm text-muted">Aucun Grand Prix terminé sur ce circuit pour l’instant.</p>}

      {rows.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Pilotes les plus titrés ici</p>
            <ul className="space-y-2">
              {drivers.map((d) => (
                <li key={d.name}>
                  <div className="flex justify-between text-sm"><span className="font-semibold">{d.name}</span><span className="font-mono">{d.wins}</span></div>
                  <div className="mt-0.5 h-1.5 rounded bg-surface-2"><div className="h-full rounded bg-f1" style={{ width: `${(d.wins / max) * 100}%` }} /></div>
                  <p className="mt-0.5 text-[11px] text-muted">{[...d.years].sort().join(', ')}</p>
                </li>
              ))}
            </ul>
            <p className="mb-2 mt-4 text-xs font-bold uppercase tracking-wider text-muted">Écuries</p>
            <div className="flex flex-wrap gap-2 text-xs">
              {teams.map((t) => <span key={t.name} className="rounded bg-surface-2 px-2 py-1">{t.name} <b className="font-mono">{t.wins}</b></span>)}
            </div>
            <p className="mt-4 text-xs text-muted">{rows.length} Grand(s) Prix de championnat disputé(s) sur ce circuit (données Jolpica).</p>
          </div>

          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Vainqueurs par année</p>
            <div className="max-h-96 overflow-auto rounded-lg border border-border">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-surface-2 text-left text-xs text-muted">
                  <tr><th className="px-2 py-1">Année</th><th className="px-2 py-1">Vainqueur</th><th className="px-2 py-1">Écurie</th></tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={`${r.season}-${r.round}`} className="border-t border-border" title={r.raceName}>
                      <td className="px-2 py-1 font-mono">{r.season}</td>
                      <td className="px-2 py-1">{r.w!.Driver.givenName} {r.w!.Driver.familyName}</td>
                      <td className="px-2 py-1 text-muted">{r.w!.Constructor.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rows.length > 12 && (
              <button onClick={() => setShowAll((s) => !s)} className="mt-2 text-xs font-semibold text-f1">
                {showAll ? 'Réduire' : `Voir les ${rows.length} éditions`}
              </button>
            )}
          </div>
        </div>
      )}

      {info.anecdotes && info.anecdotes.length > 0 && (
        <div className="mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">Le saviez-vous ?</p>
          <ul className="space-y-2 text-sm">
            {info.anecdotes.map((a) => (
              <li key={a} className="flex gap-2"><span className="mt-1.5 h-1.5 w-1.5 shrink-0 -skew-x-12 bg-f1" />{a}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}
