import { useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { CloudRain } from 'lucide-react'
import { Card, ErrorState, Loader, TeamStripe } from '@/components/ui'
import { useQualifying, useSchedule, useSimulation, useTeamCircuit } from '../lib/hooks'
import { useCalibration } from '../lib/useCalibration'
import { useWeekendWeather } from '../lib/useWeekendWeather'
import { fmtDateTime, nextRace, raceStart } from '../lib/schedule'
import { toEntry } from '../lib/data'
import { teamColor } from '../lib/teams'
import { DEFAULT_PARAMS, type BacktestResult, type EntryDriver } from '../models/racePrediction'
import type { WorkerPayload } from '../workers/protocol'
import { HowItWorks, ProbBar, Stat, axisProps, num, pct, tooltipStyle } from './common'

const DRAWS = 10_000

export default function RacePredictionPage() {
  const schedule = useSchedule()
  const race = useMemo(() => (schedule.data ? nextRace(schedule.data) : null), [schedule.data])
  const { season, calib } = useCalibration()
  const quali = useQualifying(race?.season, race?.round)
  const circuit = useTeamCircuit(race?.Circuit.circuitId, race ? Number(race.season) : undefined)
  const { weekend } = useWeekendWeather(race)
  const [rainOverride, setRainOverride] = useState<number | null>(null)

  const raceWeather = weekend?.sessions.find((s) => s.session.key === 'RACE')
  const forecastRain = raceWeather && raceWeather.reliability !== 'indisponible' && Number.isFinite(raceWeather.rainProb) ? raceWeather.rainProb / 100 : null
  const rainProb = rainOverride ?? forecastRain ?? 0

  const entries = useMemo<EntryDriver[]>(() => {
    if (quali.data?.length) return quali.data.map(toEntry)
    const last = season.data?.races[season.data.races.length - 1]
    return (last?.Results ?? []).map(toEntry)
  }, [quali.data, season.data])
  const grid = useMemo(() => (quali.data?.length ? Object.fromEntries(quali.data.map((q) => [q.Driver.driverId, Number(q.position)])) : undefined), [quali.data])

  // Without a known grid, use the σ calibrated on form only (wider uncertainty).
  const best = grid ? calib.data?.best : calib.data?.formOnly
  const circuitReady = !circuit.isLoading
  const payload = useMemo<(WorkerPayload & { type: 'race' }) | null>(() => {
    if (!season.data || !best || !entries.length || !circuitReady || quali.isLoading) return null
    return {
      type: 'race',
      draws: DRAWS,
      sigma: best.sigma,
      input: {
        drivers: entries,
        history: season.data.records,
        grid,
        circuitTeam: circuit.data?.avg,
        rainProb,
        params: { weights: { ...DEFAULT_PARAMS.weights, grid: best.gridWeight } },
      },
    }
  }, [season.data, best, entries, grid, circuit.data, circuitReady, quali.isLoading, rainProb])
  const sim = useSimulation(['race', race?.round, grid ? 'grid' : 'nogrid', rainProb.toFixed(2), best?.sigma, best?.gridWeight, entries.length], payload)

  if (schedule.isLoading || season.isLoading) return <Loader label="Chargement des résultats de la saison…" />
  if (schedule.error || season.error) return <ErrorState error={schedule.error ?? season.error} onRetry={() => { schedule.refetch(); season.refetch() }} />
  if (!race) return <Card>La saison est terminée : rendez-vous à la prochaine pour de nouvelles prédictions.</Card>

  const rows = sim.data
    ? sim.data.strengths.map((s) => ({ s, o: sim.data!.odds.find((o) => o.driverId === s.driverId)! })).sort((a, b) => b.o.win - a.o.win || a.s.expectedPos - b.s.expectedPos)
    : []
  const chart = rows.slice(0, 10).map(({ s, o }) => ({ code: s.code, Victoire: +(o.win * 100).toFixed(1), Podium: +(o.podium * 100).toFixed(1), Points: +(o.points * 100).toFixed(1) }))

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">Prochaine course · manche {race.round}</p>
            <h2 className="text-2xl font-black">{race.raceName}</h2>
            <p className="text-sm text-muted">{race.Circuit.circuitName} · départ {fmtDateTime(raceStart(race))}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <DataPill ok={!!grid} label={grid ? 'Grille : qualifications disponibles' : 'Grille inconnue (qualifs à venir)'} />
            <DataPill ok={!!circuit.data?.seasons.length} label={circuit.data?.seasons.length ? `Historique circuit : ${circuit.data.seasons.join(', ')}` : 'Pas d’historique circuit récent'} />
            <DataPill ok={forecastRain !== null} label={forecastRain !== null ? `Météo course : ${pct(forecastRain)} de pluie (${raceWeather?.reliability})` : 'Météo course indisponible'} />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-lg bg-surface-2/60 px-3 py-2 text-sm">
          <CloudRain size={16} className="text-info" />
          <label htmlFor="rain" className="font-semibold">Scénario pluie</label>
          <input id="rain" type="range" min={0} max={100} step={5} value={Math.round(rainProb * 100)} onChange={(e) => setRainOverride(Number(e.target.value) / 100)} className="w-40 accent-[var(--color-info)]" />
          <span className="w-12 font-mono">{pct(rainProb)}</span>
          {rainOverride !== null && (
            <button onClick={() => setRainOverride(null)} className="text-xs text-accent underline">revenir à la prévision</button>
          )}
          <span className="text-xs text-muted">La pluie augmente la dispersion (σ × {num(1 + DEFAULT_PARAMS.rainSigmaBoost * rainProb, 2)}) et le risque d’abandon.</span>
        </div>
      </Card>

      {calib.error && <ErrorState error={calib.error} />}
      {sim.error && <ErrorState error={sim.error} />}
      {(!sim.data || calib.isLoading) && !sim.error && !calib.error && <Loader label={calib.isLoading ? 'Calibrage du modèle sur la saison (backtest)…' : `Simulation de ${DRAWS.toLocaleString('fr-FR')} courses…`} />}

      {sim.data && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Favori" value={rows[0]?.s.code ?? '—'} sub={`${pct(rows[0]?.o.win ?? 0)} de chances de gagner`} />
            <Stat label="Tirages Monte Carlo" value={DRAWS.toLocaleString('fr-FR')} sub={`calculés en ${num(sim.data.ms)} ms dans un Web Worker`} />
            <Stat label="Dispersion σ" value={`${num(best!.sigma * (1 + DEFAULT_PARAMS.rainSigmaBoost * rainProb), 2)} pl.`} sub={`calibrée sur ${best!.races.length} courses${rainProb > 0 ? ', ajustée pluie' : ''}`} />
          </div>

          <Card title="Probabilités — 10 premiers favoris (%)">
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={chart} margin={{ top: 8, right: 8, left: -18, bottom: 0 }} barGap={2}>
                  <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} vertical={false} />
                  <XAxis dataKey="code" {...axisProps} />
                  <YAxis domain={[0, 100]} {...axisProps} />
                  <Tooltip {...tooltipStyle} cursor={{ fill: 'var(--color-surface-2)' }} formatter={(v) => `${num(Number(v), 1)} %`} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Victoire" fill="var(--color-f1)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Podium" fill="var(--color-warn)" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Points" fill="var(--color-accent)" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>

          <Card title="Détail par pilote">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="text-left text-xs uppercase tracking-wider text-muted">
                  <tr>
                    <th className="py-2 pr-2">Pilote</th>
                    <th className="px-2" title="Moyenne pondérée des dernières arrivées">Forme</th>
                    <th className="px-2">Grille</th>
                    <th className="px-2" title="Position moyenne de l'équipe sur ce circuit">Circuit</th>
                    <th className="px-2" title="Position attendue μ">μ</th>
                    <th className="px-2">Victoire</th>
                    <th className="px-2">Podium</th>
                    <th className="px-2">Points</th>
                    <th className="px-2">Abandon</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ s, o }) => (
                    <tr key={s.driverId} className="border-t border-border">
                      <td className="py-1.5 pr-2">
                        <span className="flex items-center gap-2"><TeamStripe color={teamColor(s.constructorId)} /><span className="font-bold">{s.code}</span><span className="hidden text-muted md:inline">{s.name}</span></span>
                      </td>
                      <td className="px-2 font-mono">{num(s.formPos, 1)}<span className="text-xs text-muted"> ({s.formRaces})</span></td>
                      <td className="px-2 font-mono">{s.gridPos ?? '—'}</td>
                      <td className="px-2 font-mono">{num(s.circuitPos, 1)}</td>
                      <td className="px-2 font-mono font-bold">{num(s.expectedPos, 1)}</td>
                      <td className="px-2"><ProbBar value={o.win} color="var(--color-f1)" /></td>
                      <td className="px-2"><ProbBar value={o.podium} color="var(--color-warn)" /></td>
                      <td className="px-2"><ProbBar value={o.points} /></td>
                      <td className="px-2 font-mono text-xs text-muted">{pct(o.dnf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}

      {calib.data && <BacktestCard best={calib.data.best} all={calib.data.all} names={season.data!.drivers} />}

      <HowItWorks>
        <p>
          <strong>1. Position attendue μ.</strong> Pour chaque pilote, on mélange trois indicateurs exprimés en « places » :
          la <strong>forme récente</strong> (moyenne de ses {DEFAULT_PARAMS.formRaces} dernières arrivées, pondérée ×{DEFAULT_PARAMS.decay} par course d’ancienneté, abandons exclus, légèrement ramenée vers le milieu de grille quand il y a peu de données),
          la <strong>grille</strong> (résultat des qualifications Jolpica, sans les pénalités) et l’<strong>historique de l’équipe sur ce circuit</strong> (position moyenne lors des 3 dernières éditions).
          Poids : forme {DEFAULT_PARAMS.weights.form}, grille {best?.gridWeight ?? DEFAULT_PARAMS.weights.grid} (calibré), circuit {DEFAULT_PARAMS.weights.circuit}, renormalisés selon les données disponibles.
        </p>
        <p>
          <strong>2. Une course simulée</strong> = μ + bruit gaussien de σ places pour chaque pilote, puis tri. Chaque pilote peut abandonner avec une probabilité tirée de son taux d’abandon de la saison
          (a priori bêta ≈ 8 %). La pluie multiplie σ par (1 + {DEFAULT_PARAMS.rainSigmaBoost} × p<sub>pluie</sub>) et le risque d’abandon par (1 + {DEFAULT_PARAMS.rainDnfBoost} × p<sub>pluie</sub>).
        </p>
        <p>
          <strong>3. Monte Carlo.</strong> {DRAWS.toLocaleString('fr-FR')} courses sont tirées dans un Web Worker (l’interface reste fluide) ; les probabilités sont les fréquences observées. Le générateur aléatoire est
          déterministe (graine fixe) : mêmes données, mêmes résultats.
        </p>
        <p>
          <strong>Calibrage.</strong> σ et le poids de la grille sont choisis par recherche sur grille en minimisant le score de Brier sur les courses déjà disputées (backtest ci-dessus, sans le facteur circuit ni la météo).
        </p>
        <p>
          <strong>Limites.</strong> Le modèle ignore les évolutions techniques, les pénalités moteur, les incidents de course (Safety Car), les consignes d’équipe et la performance pure en qualifs vs en course.
          Il sous-estime probablement les surprises : les probabilités extrêmes (proche de 0 ou 100 %) sont à prendre avec recul. Les écuries renommées (Sauber → Audi, etc.) sont rapprochées pour l’historique circuit.
        </p>
      </HowItWorks>
    </div>
  )
}

function DataPill({ ok, label }: { ok: boolean; label: string }) {
  return <span className={ok ? 'rounded-full bg-ok/10 px-2 py-1 text-ok' : 'rounded-full bg-surface-2 px-2 py-1 text-muted'}>{label}</span>
}

function BacktestCard({ best, all, names }: { best: BacktestResult; all: BacktestResult[]; names: Map<string, EntryDriver> }) {
  if (!best.races.length) return <Card title="Précision sur la saison">Pas encore assez de courses disputées pour un backtest (minimum 4).</Card>
  const code = (id: string) => names.get(id)?.code ?? id
  return (
    <Card title="Précision sur la saison en cours (backtest)">
      <p className="mb-3 text-sm text-muted">
        Pour chaque course depuis la manche 4, le modèle est relancé avec uniquement les résultats antérieurs et la grille réelle, puis comparé au résultat. Meilleure configuration : σ = {best.sigma}, poids grille = {best.gridWeight}
        ({all.length} configurations testées).
      </p>
      <div className="grid gap-3 sm:grid-cols-4">
        <Stat label="Favori vainqueur" value={pct(best.hitRate)} sub={`${best.races.filter((r) => r.predictedId === r.winnerId).length}/${best.races.length} courses`} />
        <Stat label="Référence « poleman gagne »" value={pct(best.poleBaseline)} sub="base naïve à battre" />
        <Stat label="Podium bien prédit" value={`${num(best.meanPodiumHits, 2)} / 3`} sub="pilotes du podium réel dans le top 3 prédit" />
        <Stat label="Score de Brier (victoire)" value={num(best.brierWin, 3)} sub={`vs ${num(best.brierUniform, 3)} au hasard (plus bas = mieux)`} />
      </div>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead className="text-left text-xs uppercase tracking-wider text-muted">
            <tr><th className="py-1">Manche</th><th>Favori (proba)</th><th>Vainqueur réel (proba donnée)</th><th>Podium</th></tr>
          </thead>
          <tbody>
            {best.races.map((r) => (
              <tr key={r.round} className="border-t border-border">
                <td className="py-1 font-mono">R{r.round}</td>
                <td className={r.predictedId === r.winnerId ? 'font-bold text-ok' : ''}>{code(r.predictedId)} ({pct(r.predictedWinProb)})</td>
                <td>{code(r.winnerId)} ({pct(r.actualWinnerProb)})</td>
                <td className="font-mono">{r.podiumHits}/3</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  )
}
