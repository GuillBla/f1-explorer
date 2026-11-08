import { useMemo } from 'react'
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Card, ErrorState, Loader, TeamStripe } from '@/components/ui'
import { useDriverStandings, useSchedule, useSimulation } from '../lib/hooks'
import { useCalibration } from '../lib/useCalibration'
import { driverCode, driverName } from '../lib/data'
import { teamColor } from '../lib/teams'
import { fmtDay, raceStart } from '../lib/schedule'
import { computeStrengths, type EntryDriver } from '../models/racePrediction'
import { maxRemainingPoints, RACE_POINTS, SPRINT_POINTS } from '../models/championship'
import type { WorkerPayload } from '../workers/protocol'
import { HowItWorks, ProbBar, Stat, axisProps, num, tooltipStyle } from './common'

const DRAWS = 10_000

export default function ChampionshipPage() {
  const schedule = useSchedule()
  const standings = useDriverStandings()
  const { season, calib } = useCalibration()

  const remaining = useMemo(() => (schedule.data && standings.data ? schedule.data.filter((r) => Number(r.round) > standings.data.round) : []), [schedule.data, standings.data])
  const sprints = remaining.filter((r) => r.Sprint).length

  const strengths = useMemo(() => {
    if (!season.data || !standings.data) return null
    const rounds = [...new Set(season.data.records.map((r) => r.round))].sort((a, b) => b - a).slice(0, 3)
    // Drivers who raced recently are considered still active.
    const active = new Map<string, EntryDriver>()
    for (const r of season.data.records) if (rounds.includes(r.round)) active.set(r.driverId, season.data.drivers.get(r.driverId)!)
    return computeStrengths({ drivers: [...active.values()], history: season.data.records, rainProb: 0 })
  }, [season.data, standings.data])

  const sigma = calib.data?.formOnly.sigma
  const payload = useMemo<(WorkerPayload & { type: 'championship' }) | null>(() => {
    if (!standings.data || !strengths || sigma == null) return null
    return {
      type: 'championship',
      input: {
        standings: standings.data.standings.map((s) => ({ driverId: s.Driver.driverId, points: Number(s.points), wins: Number(s.wins) })),
        strengths,
        races: remaining.length,
        sprints,
        sigma,
        draws: DRAWS,
      },
    }
  }, [standings.data, strengths, sigma, remaining.length, sprints])
  const sim = useSimulation(['championship', standings.data?.round, remaining.length, sprints, sigma], payload)

  if (schedule.isLoading || standings.isLoading || season.isLoading) return <Loader label="Chargement du classement…" />
  const err = schedule.error ?? standings.error ?? season.error
  if (err) return <ErrorState error={err} onRetry={() => { schedule.refetch(); standings.refetch(); season.refetch() }} />
  if (!standings.data?.standings.length) return <Card>Aucun classement disponible pour la saison en cours.</Card>

  const info = new Map(standings.data.standings.map((s) => [s.Driver.driverId, s]))
  const rows = sim.data ? [...sim.data.odds].sort((a, b) => b.title - a.title || b.points - a.points) : []
  const chart = rows.filter((r) => r.title >= 0.001).slice(0, 8).map((r) => {
    const s = info.get(r.driverId)!
    return { code: driverCode(s.Driver), title: +(r.title * 100).toFixed(1), color: teamColor(s.Constructors[0]?.constructorId ?? '') }
  })
  const leader = standings.data.standings[0]
  const maxRem = maxRemainingPoints(remaining.length, sprints)

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Classement après" value={`Manche ${standings.data.round}`} sub={`saison ${standings.data.season}`} />
        <Stat label="Leader" value={driverCode(leader.Driver)} sub={`${leader.points} pts`} />
        <Stat label="Courses restantes" value={remaining.length} sub={sprints ? `+ ${sprints} sprint(s)` : 'aucun sprint'} />
        <Stat label="Points encore en jeu" value={maxRem} sub="maximum pour un pilote" />
      </div>

      {remaining.length === 0 && <Card>Le championnat est terminé : le classement ci-dessous est définitif.</Card>}

      {calib.error && <ErrorState error={calib.error} />}
      {sim.error && <ErrorState error={sim.error} />}
      {!sim.data && !sim.error && !calib.error && <Loader label={calib.isLoading ? 'Calibrage du modèle (backtest de la saison)…' : `Simulation de ${DRAWS.toLocaleString('fr-FR')} fins de saison…`} />}

      {sim.data && (
        <>
          {chart.length > 0 && (
            <Card title="Probabilité de titre (%)">
              <div className="h-64">
                <ResponsiveContainer>
                  <BarChart data={chart} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
                    <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} horizontal={false} />
                    <XAxis type="number" domain={[0, 100]} {...axisProps} />
                    <YAxis type="category" dataKey="code" width={44} {...axisProps} />
                    <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--color-surface-2)' }} formatter={(v) => [`${num(Number(v), 1)} %`, 'Titre']} />
                    <Bar dataKey="title" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fill: 'var(--color-text)', fontSize: 11, formatter: (v: unknown) => `${num(Number(v), 1)} %` }}>
                      {chart.map((c) => <Cell key={c.code} fill={c.color} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
          )}

          <Card title="Projection de fin de saison">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[700px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-2 pr-2">Pos.</th>
                    <th className="px-2">Pilote</th>
                    <th className="px-2">Points</th>
                    <th className="px-2">Max possible</th>
                    <th className="px-2">Titre</th>
                    <th className="px-2">Top 3</th>
                    <th className="px-2" title="Fourchette 10e – 90e centile">Points finaux (médiane, 80 %)</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => {
                    const s = info.get(r.driverId)!
                    const top3 = r.posDist.slice(0, 3).reduce((a, b) => a + b, 0)
                    return (
                      <tr key={r.driverId} className="border-t border-border">
                        <td className="py-1.5 pr-2 font-mono">{s.position}</td>
                        <td className="px-2">
                          <span className="flex items-center gap-2"><TeamStripe color={teamColor(s.Constructors[0]?.constructorId ?? '')} /><span className="font-bold">{driverCode(s.Driver)}</span><span className="hidden text-muted md:inline">{driverName(s.Driver)}</span></span>
                        </td>
                        <td className="px-2 font-mono font-bold">{r.points}</td>
                        <td className="px-2 font-mono">{r.maxPoints}{r.eliminated && <span className="ml-2 rounded bg-surface-2 px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">éliminé</span>}</td>
                        <td className="px-2"><ProbBar value={r.title} color="var(--color-f1)" /></td>
                        <td className="px-2"><ProbBar value={top3} color="var(--color-warn)" /></td>
                        <td className="px-2 font-mono text-xs">{num(r.p50)} <span className="text-muted">({num(r.p10)}–{num(r.p90)})</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {remaining.length > 0 && (
        <Card title="Manches restantes">
          <ul className="flex flex-wrap gap-2 text-sm">
            {remaining.map((r) => (
              <li key={r.round} className="rounded-md border border-border bg-surface-2/50 px-2 py-1">
                <span className="font-mono text-muted">R{r.round}</span> {r.raceName.replace(' Grand Prix', '')} · {fmtDay(raceStart(r))}{r.Sprint && <span className="ml-1 text-xs text-accent">+ sprint</span>}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <HowItWorks>
        <p>
          <strong>Principe.</strong> On part du classement officiel (Jolpica) et on simule {DRAWS.toLocaleString('fr-FR')} fois les {remaining.length} course(s) restante(s){sprints ? ` et ${sprints} sprint(s)` : ''} avec le même
          modèle que la prédiction de course : position attendue = forme récente (6 dernières courses pondérées), bruit gaussien de σ = {num(sigma, 2)} place(s) — calibré sur la saison <em>sans</em> connaître
          la grille, donc plus large — et abandons selon le taux de chaque pilote. Barème : {RACE_POINTS.join('-')} en course, {SPRINT_POINTS.join('-')} en sprint (pas de point du meilleur tour).
        </p>
        <p>
          <strong>Égalités.</strong> Départagées au nombre de victoires (simulées incluses), puis au hasard. Un pilote est « éliminé » quand ses points + {maxRem} (maximum restant) ne rattrapent pas le leader actuel :
          c’est une élimination mathématique stricte, indépendante de la simulation.
        </p>
        <p>
          <strong>Limites.</strong> La forme est figée : le modèle ne prévoit ni progression technique ni changement de pilote ; les pilotes absents des 3 dernières courses ne marquent plus. Les courses sont
          supposées indépendantes, ce qui sous-estime les séries (une voiture dominante le reste souvent) ; les très faibles probabilités sont donc peu fiables. Un sprint simulé déjà disputé mais non encore
          intégré au classement serait compté deux fois.
        </p>
      </HowItWorks>
    </div>
  )
}
