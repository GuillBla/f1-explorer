import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { Radio, History } from 'lucide-react'
import { CartesianGrid, ComposedChart, Legend, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Scatter, Tooltip, XAxis, YAxis } from 'recharts'
import { TYRE_COLORS, type Driver, type Session } from '@/lib/api'
import { Card, ErrorState, Loader, TeamStripe } from '@/components/ui'
import { useRaceSessions, useSessionBundle } from '../lib/hooks'
import { scheduledLaps, type SessionBundle } from '../lib/data'
import { fmtDateTime } from '../lib/schedule'
import { analyseCut, cleanLaps, estimatePitLoss, fitDegradation, projectFinish, raceState, FUEL_EFFECT, OUTLAP_WARMUP, type DegModel, type ProjectedDriver } from '../models/raceProjection'
import { HowItWorks, Select, Stat, axisProps, num, pct, tooltipStyle } from './common'

const LIVE_MARGIN = 15 * 60_000

function isLive(s: Session | undefined, now = Date.now()) {
  return !!s && Date.parse(s.date_start) <= now && now <= Date.parse(s.date_end) + LIVE_MARGIN
}

export default function LiveProjectionPage() {
  const year = new Date().getFullYear()
  const sessions = useRaceSessions(year)
  // Early in the year (no race yet): fall back to last season.
  const prev = useRaceSessions(year - 1, sessions.isSuccess && !sessions.data.length)
  const list = sessions.data?.length ? sessions.data : prev.data ?? []
  const [key, setKey] = useState<number | null>(null)
  const session = list.find((s) => s.session_key === key) ?? list[0]

  if (sessions.isLoading) return <Loader label="Recherche des sessions OpenF1…" />
  if (sessions.error) return <ErrorState error={sessions.error} onRetry={() => sessions.refetch()} />
  if (!session) return <Card>Aucune course disponible sur OpenF1.</Card>

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <Select
          label="Session"
          value={session.session_key}
          onChange={setKey}
          options={list.map((s) => ({ value: s.session_key, label: `${s.circuit_short_name} · ${s.session_name === 'Sprint' ? 'Sprint' : 'Course'} · ${fmtDateTime(Date.parse(s.date_start))}` }))}
        />
      </div>
      <SessionProjection key={session.session_key} session={session} />
    </div>
  )
}

function SessionProjection({ session }: { session: Session }) {
  const live = isLive(session)
  const bundle = useSessionBundle(session.session_key, live)
  if (bundle.isLoading) return <Loader label="Chargement des tours, relais et arrêts (OpenF1)…" />
  if (bundle.error) return <ErrorState error={bundle.error} onRetry={() => bundle.refetch()} />
  if (!bundle.data?.laps.length)
    return (
      <Card>
        {live
          ? 'Session en cours mais aucune donnée reçue : le temps réel OpenF1 nécessite un compte payant. Les données gratuites arrivent peu après la fin de la session.'
          : 'Pas encore de données de tours pour cette session.'}
      </Card>
    )
  return <Analysis session={session} data={bundle.data} live={live} updatedAt={bundle.dataUpdatedAt} fetching={bundle.isFetching} />
}

function truncate(data: SessionBundle, lap: number) {
  return {
    laps: data.laps.filter((l) => l.lap_number <= lap),
    pits: data.pits.filter((p) => p.lap_number <= lap),
    stints: data.stints.filter((s) => s.lap_start <= lap).map((s) => ({ ...s, lap_end: Math.min(s.lap_end ?? lap, lap) })),
  }
}

function analyse(data: SessionBundle, lap: number, totalLaps: number) {
  const { laps, pits, stints } = truncate(data, lap)
  const clean = cleanLaps(laps, stints, pits)
  const deg = fitDegradation(clean)
  const pit = estimatePitLoss(laps, pits, clean)
  const states = raceState(laps, stints, pits, deg, clean)
  const projection = projectFinish(states, deg, totalLaps, pit.loss)
  return { clean, deg, pit, states, projection }
}

function Analysis({ session, data, live, updatedAt, fetching }: { session: Session; data: SessionBundle; live: boolean; updatedAt: number; fetching: boolean }) {
  const maxLap = Math.max(...data.laps.map((l) => l.lap_number))
  const finished = !live && Date.parse(session.date_end) < Date.now()
  const totalLaps = scheduledLaps(session, maxLap, finished)
  const [lap, setLap] = useState<number | null>(null)
  // Follow the live race; in replay, start at ~60 % of the race to compare with the real result.
  const refLap = live ? maxLap : lap ?? Math.max(3, Math.round(maxLap * 0.6))
  const drivers = useMemo(() => new Map<number, Driver>(data.drivers.map((d) => [d.driver_number, d])), [data.drivers])

  const a = useMemo(() => analyse(data, Math.min(refLap, maxLap), totalLaps), [data, refLap, maxLap, totalLaps])
  const final = useMemo(() => (finished ? raceState(data.laps, data.stints, data.pits, a.deg, a.clean) : null), [finished, data, a.deg, a.clean])

  const accuracy = useMemo(() => {
    if (!final || refLap >= maxLap) return null
    const actual = new Map(final.filter((s) => !s.retired).map((s) => [s.driver, s.position]))
    const proj = a.projection.filter((p) => actual.has(p.driver) && !p.retired)
    if (!proj.length) return null
    // Re-rank among drivers who actually finished, for a fair comparison.
    const rank = (xs: { driver: number; v: number }[]) => new Map([...xs].sort((x, y) => x.v - y.v).map((x, i) => [x.driver, i + 1]))
    const p = rank(proj.map((x) => ({ driver: x.driver, v: x.projectedPosition })))
    const c = rank(proj.map((x) => ({ driver: x.driver, v: x.position })))
    const act = rank(proj.map((x) => ({ driver: x.driver, v: actual.get(x.driver)! })))
    const mae = (m: Map<number, number>) => proj.reduce((s, x) => s + Math.abs(m.get(x.driver)! - act.get(x.driver)!), 0) / proj.length
    const exact = (m: Map<number, number>) => proj.filter((x) => m.get(x.driver) === act.get(x.driver)).length
    return { n: proj.length, maeModel: mae(p), maeFrozen: mae(c), exactModel: exact(p), exactFrozen: exact(c) }
  }, [final, a.projection, refLap, maxLap])

  const active = a.projection.filter((p) => !p.retired)
  const label = (n: number) => drivers.get(n)?.name_acronym ?? `#${n}`

  return (
    <div className="space-y-6">
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {live ? (
              <span className="flex items-center gap-1.5 rounded bg-f1 px-2 py-1 text-xs font-black uppercase text-white"><Radio size={14} className="animate-pulse" />Direct</span>
            ) : (
              <span className="flex items-center gap-1.5 rounded bg-surface-2 px-2 py-1 text-xs font-bold uppercase text-muted"><History size={14} />{finished ? 'Terminée · rejeu' : 'Dernières données'}</span>
            )}
            <div>
              <p className="font-bold">{session.circuit_short_name} — {session.session_name === 'Sprint' ? 'Sprint' : 'Course'}</p>
              <p className="text-xs text-muted">
                {live ? `Rafraîchi toutes les 10 s · dernière mise à jour ${new Date(updatedAt).toLocaleTimeString('fr-FR')}${fetching ? ' · mise à jour…' : ''}` : `${maxLap} tours disponibles sur ${totalLaps}`}
              </p>
            </div>
          </div>
          {!live && (
            <label className="flex flex-wrap items-center gap-3 text-sm">
              <span className="font-semibold">Projeter depuis le tour</span>
              <input type="range" min={3} max={maxLap} value={refLap} onChange={(e) => setLap(Number(e.target.value))} className="w-48 accent-[var(--color-f1)]" />
              <span className="w-16 font-mono">{refLap}/{totalLaps}</span>
            </label>
          )}
        </div>
        {live && <p className="mt-2 text-xs text-muted">Sans abonnement OpenF1, les données « en direct » peuvent être absentes ou retardées : la projection se met à jour dès qu’elles arrivent.</p>}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Temps perdu au stand" value={`${num(a.pit.loss, 1)} s`} sub={a.pit.samples.length >= 2 ? `médiane de ${a.pit.samples.length} arrêts` : 'valeur par défaut (pas assez d’arrêts)'} />
        <Stat label="Tours représentatifs" value={a.clean.length} sub="hors tour 1, entrées/sorties de stand, SC/VSC" />
        <Stat label="Tour de référence" value={`${refLap} / ${totalLaps}`} sub={`${Math.max(0, totalLaps - refLap)} tours à projeter`} />
        {accuracy ? (
          <Stat label="Précision de cette projection" value={`±${num(accuracy.maeModel, 1)} pl.`} sub={`erreur moyenne vs ±${num(accuracy.maeFrozen, 1)} si l’ordre restait figé · ${accuracy.exactModel}/${accuracy.n} exacts`} />
        ) : (
          <Stat label="Précision" value="—" sub={finished ? 'reculez le curseur pour comparer au résultat réel' : 'disponible après la course'} />
        )}
      </div>

      <Card title={`Classement projeté à l’arrivée (depuis le tour ${refLap})`}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-left text-xs uppercase tracking-wider text-muted">
              <tr>
                <th className="py-2 pr-2">Proj.</th>
                <th className="px-2">Pilote</th>
                <th className="px-2">Actuel</th>
                <th className="px-2">Écart actuel</th>
                <th className="px-2">Pneu</th>
                <th className="px-2">Rythme</th>
                <th className="px-2">Arrêt prévu</th>
                <th className="px-2">Écart projeté</th>
                {final && refLap < maxLap && <th className="px-2">Réel</th>}
              </tr>
            </thead>
            <tbody>
              {a.projection.map((p) => (
                <ProjectionRow key={p.driver} p={p} driver={drivers.get(p.driver)} actual={final?.find((f) => f.driver === p.driver)} showActual={!!final && refLap < maxLap} />
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <DegradationChart deg={a.deg} />
        <PitWindowCard projection={active} label={label} totalLaps={totalLaps} />
      </div>

      <CutCard projection={active} deg={a.deg} label={label} />

      <HowItWorks>
        <p>
          <strong>Données.</strong> Tours, relais (composé et âge des pneus) et arrêts OpenF1. Les écarts sont recalculés à partir des heures de passage (fin de chaque tour), à nombre de tours égal avec le leader.
          Un pilote dont le dernier tour date de plus de 3 tours-types est considéré comme abandonné.
        </p>
        <p>
          <strong>Dégradation.</strong> On garde les tours « représentatifs » (pas de tour 1, ni de tour d’entrée/sortie des stands, et à moins de 107 % de la médiane du pilote pour exclure SC/VSC et trafic).
          Chaque temps est corrigé de l’effet carburant (<code>+{FUEL_EFFECT} s × n° de tour</code> : la voiture s’allège d’environ 1,5 kg par tour) puis rapporté au temps médian du pilote. Une régression
          linéaire <code>Δt = a + b × âge</code> par composé donne la dégradation <code>b</code> (s/tour) et l’écart de rythme pneus neufs <code>a</code>. Moins de 10 tours sur un composé → valeurs par défaut.
        </p>
        <p>
          <strong>Projection.</strong> Rythme de base de chaque pilote = médiane de ses 5 derniers tours représentatifs, nettoyée du carburant et de l’usure. Chaque tour restant vaut
          <code> base − carburant + a + b × âge</code>, +{OUTLAP_WARMUP} s pour un tour en pneus froids et +1 s par tour au-delà de la durée de vie observée du composé. Un arrêt est ajouté si le pilote n’a
          pas encore utilisé deux composés secs (règlement) ou si ses pneus n’iront pas au bout ; il est placé au tour qui minimise le temps total (la <strong>fenêtre</strong> = tours à moins d’1 s de l’optimum).
          Le temps perdu au stand est estimé par <code>(tour d’entrée + tour de sortie) − 2 × tour normal</code>, médiane des arrêts de la course.
        </p>
        <p>
          <strong>Undercut / overcut.</strong> On compare, sur 1 à 3 tours, le pilote qui roule en pneus neufs (avec tour de chauffe) à celui resté en pneus usés. Le gain est confronté à l’écart actuel ;
          la probabilité suppose une incertitude normale de ±0,7 s (arrêt, trafic, tour de sortie).
        </p>
        <p>
          <strong>Limites.</strong> Pas de Safety Car, de pluie, de trafic, ni de dépassement difficile : un pilote plus rapide est supposé passer. La dégradation réelle n’est pas linéaire (graining, falaise)
          et les tours sous drapeau jaune sont mal filtrés en début de relais. Le nombre de tours prévus vient d’une table interne (course) ou ≈ 100 km pour un sprint. Le curseur « projeter depuis le tour »
          permet de vérifier honnêtement la projection sur une course terminée.
        </p>
      </HowItWorks>
    </div>
  )
}

function TyreDot({ compound }: { compound: string }) {
  const c = TYRE_COLORS[compound] ?? '#888'
  return <span className="inline-block h-3 w-3 rounded-full border-2" style={{ borderColor: c }} title={compound} />
}

function ProjectionRow({ p, driver, actual, showActual }: { p: ProjectedDriver; driver?: Driver; actual?: { position: number; retired: boolean }; showActual: boolean }) {
  return (
    <tr className={clsx('border-t border-border', p.retired && 'opacity-50')}>
      <td className="py-1.5 pr-2 font-mono font-bold">{p.retired ? 'AB' : p.projectedPosition}</td>
      <td className="px-2">
        <span className="flex items-center gap-2">
          <TeamStripe color={driver?.team_colour} />
          <span className="font-bold">{driver?.name_acronym ?? `#${p.driver}`}</span>
          {!p.retired && p.delta !== 0 && <span className={clsx('font-mono text-xs', p.delta > 0 ? 'text-ok' : 'text-f1')}>{p.delta > 0 ? `▲${p.delta}` : `▼${-p.delta}`}</span>}
        </span>
      </td>
      <td className="px-2 font-mono">{p.position}</td>
      <td className="px-2 font-mono text-xs">{p.retired ? '—' : p.position === 1 ? 'leader' : p.lapsDown > 0 ? `+${p.lapsDown} t.` : `+${num(p.gapToLeader, 1)} s`}</td>
      <td className="px-2"><span className="flex items-center gap-1.5"><TyreDot compound={p.compound} /><span className="font-mono text-xs">{p.compound.slice(0, 1)} · {p.tyreAge} t.</span></span></td>
      <td className="px-2 font-mono text-xs">{num(p.recentLap, 2)}</td>
      <td className="px-2 text-xs">
        {p.retired ? '—' : p.plan.needed ? (
          <span>T{p.plan.bestLap} <span className="text-muted">({p.plan.window?.[0]}–{p.plan.window?.[1]})</span> → <TyreDot compound={p.plan.compound ?? ''} /></span>
        ) : (
          <span className="text-muted">aucun</span>
        )}
      </td>
      <td className="px-2 font-mono text-xs">{p.retired ? '—' : p.projectedPosition === 1 ? '—' : `+${num(p.projectedGap, 1)} s`} {!p.retired && <span className="text-muted">±{num(p.uncertainty, 1)}</span>}</td>
      {showActual && <td className="px-2 font-mono">{actual ? (actual.retired ? 'AB' : actual.position) : '—'}</td>}
    </tr>
  )
}

function DegradationChart({ deg }: { deg: Record<string, DegModel> }) {
  const models = Object.values(deg).filter((d) => d.n > 0 || !d.fallback)
  const maxAge = Math.max(10, ...models.flatMap((m) => m.points.map((p) => p.age)))
  return (
    <Card title="Dégradation des pneus (Δ temps au tour vs âge)">
      <div className="h-64">
        <ResponsiveContainer>
          <ComposedChart margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} />
            <XAxis type="number" dataKey="age" domain={[0, maxAge]} name="Âge" unit=" t." {...axisProps} allowDuplicatedCategory={false} />
            <YAxis type="number" dataKey="delta" domain={[-2.5, 2.5]} allowDataOverflow unit=" s" {...axisProps} />
            <Tooltip {...tooltipStyle} formatter={(v) => num(Number(v), 2)} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {models.map((m) => (
              <Scatter key={`s-${m.compound}`} name={m.compound} data={m.points} fill={TYRE_COLORS[m.compound] ?? '#888'} fillOpacity={0.35} shape="circle" legendType="circle" />
            ))}
            {models.map((m) => (
              <Line
                key={`l-${m.compound}`}
                data={[{ age: 0, delta: m.offset }, { age: maxAge, delta: m.offset + m.slope * maxAge }]}
                dataKey="delta"
                stroke={TYRE_COLORS[m.compound] ?? '#888'}
                strokeWidth={2}
                dot={false}
                legendType="none"
                name={`${m.compound} (régression)`}
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
        {Object.values(deg).map((m) => (
          <li key={m.compound} className="flex items-center gap-1.5">
            <TyreDot compound={m.compound} />
            {m.compound} : <span className="font-mono text-text">{m.slope >= 0 ? '+' : ''}{num(m.slope, 3)} s/tour</span>
            {m.fallback ? ' (par défaut)' : ` · n=${m.n}, R²=${num(m.r2, 2)}`}
          </li>
        ))}
      </ul>
    </Card>
  )
}

function PitWindowCard({ projection, label, totalLaps }: { projection: ProjectedDriver[]; label: (n: number) => string; totalLaps: number }) {
  const candidates = projection.filter((p) => p.plan.needed)
  const [sel, setSel] = useState<number | null>(null)
  const p = candidates.find((c) => c.driver === sel) ?? candidates[0]
  if (!p)
    return (
      <Card title="Fenêtre d’arrêt optimale">
        <p className="text-sm text-muted">Aucun pilote n’a besoin de s’arrêter d’ici l’arrivée selon le modèle.</p>
      </Card>
    )
  return (
    <Card title="Fenêtre d’arrêt optimale">
      <div className="mb-2 flex flex-wrap items-end justify-between gap-3">
        <Select label="Pilote" value={p.driver} onChange={setSel} options={candidates.map((c) => ({ value: c.driver, label: `P${c.position} · ${label(c.driver)}` }))} />
        <p className="text-sm">
          Arrêt idéal au <strong>tour {p.plan.bestLap}</strong> (fenêtre {p.plan.window?.[0]}–{p.plan.window?.[1]}) pour des {p.plan.compound}.
          <span className="block text-xs text-muted">{p.plan.reason}</span>
        </p>
      </div>
      <div className="h-48">
        <ResponsiveContainer>
          <ComposedChart data={p.plan.costs} margin={{ top: 8, right: 8, left: -10, bottom: 0 }}>
            <CartesianGrid stroke="var(--color-border)" strokeOpacity={0.4} vertical={false} />
            {p.plan.window && <ReferenceArea x1={p.plan.window[0]} x2={p.plan.window[1]} fill="var(--color-ok)" fillOpacity={0.12} />}
            <XAxis dataKey="lap" type="number" domain={[p.lapsDone + 1, totalLaps - 1]} {...axisProps} />
            <YAxis domain={[0, (max: number) => Math.min(30, Math.ceil(max))]} allowDataOverflow unit=" s" {...axisProps} />
            <Tooltip {...tooltipStyle} labelFormatter={(l) => `Arrêt au tour ${l}`} formatter={(v) => [`+${num(Number(v), 1)} s`, 'vs optimum']} />
            {p.plan.bestLap && <ReferenceLine x={p.plan.bestLap} stroke="var(--color-ok)" strokeDasharray="4 3" />}
            <Line dataKey="delta" stroke="var(--color-accent)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <p className="text-xs text-muted">Temps total perdu selon le tour d’arrêt, par rapport à l’arrêt optimal (zone verte : moins d’1 s de perte).</p>
    </Card>
  )
}

function CutCard({ projection, deg, label }: { projection: ProjectedDriver[]; deg: Record<string, DegModel>; label: (n: number) => string }) {
  const byPos = [...projection].sort((x, y) => x.position - y.position)
  const [aSel, setA] = useState<number | null>(null)
  const [bSel, setB] = useState<number | null>(null)
  const a = byPos.find((p) => p.driver === aSel) ?? byPos[0]
  const b = byPos.find((p) => p.driver === bSel && p.driver !== a?.driver) ?? byPos.find((p) => p.position > (a?.position ?? 0))
  if (!a || !b) return null
  const [front, back] = a.position < b.position ? [a, b] : [b, a]
  const gap = (back.gapToLeader ?? NaN) - (front.gapToLeader ?? 0)
  const newCompound = back.plan.compound ?? (back.compound === 'HARD' ? 'MEDIUM' : 'HARD')
  const cut = Number.isFinite(gap) && back.lapsDown === front.lapsDown ? analyseCut(front, back, gap, deg, newCompound) : null
  const opts = byPos.map((p) => ({ value: p.driver, label: `P${p.position} · ${label(p.driver)}` }))
  return (
    <Card title="Undercut / overcut entre deux pilotes">
      <div className="flex flex-wrap items-end gap-4">
        <Select label="Pilote A" value={a.driver} onChange={setA} options={opts} />
        <Select label="Pilote B" value={b.driver} onChange={setB} options={opts.filter((o) => o.value !== a.driver)} />
        <div className="text-sm">
          <span className="font-bold">{label(back.driver)}</span> est à <span className="font-mono">{Number.isFinite(gap) ? `${num(gap, 1)} s` : '—'}</span> de <span className="font-bold">{label(front.driver)}</span>
          <span className="text-muted"> · pneus {front.compound} {front.tyreAge} t. vs {back.compound} {back.tyreAge} t.</span>
        </div>
      </div>
      {cut ? (
        <>
          <p className="mt-3 font-semibold">{cut.verdict}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <thead className="text-left text-xs uppercase tracking-wider text-muted">
                <tr><th className="py-1">Décalage d’arrêt</th><th>Gain undercut de {label(back.driver)}</th><th>Proba undercut</th><th>Gain overcut de {label(back.driver)}</th><th>Proba overcut</th></tr>
              </thead>
              <tbody>
                {cut.options.map((o) => (
                  <tr key={o.k} className="border-t border-border">
                    <td className="py-1">{o.k} tour{o.k > 1 ? 's' : ''}</td>
                    <td className="font-mono">{o.undercutGain >= 0 ? '+' : ''}{num(o.undercutGain, 2)} s</td>
                    <td className="font-mono">{pct(o.undercutProb)}</td>
                    <td className="font-mono">{o.overcutGain >= 0 ? '+' : ''}{num(o.overcutGain, 2)} s</td>
                    <td className="font-mono">{pct(o.overcutProb)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-muted">Undercut : {label(back.driver)} s’arrête d’abord (pneus {newCompound} neufs), {label(front.driver)} k tours plus tard. Overcut : l’inverse. Les deux perdent le même temps au stand ; il faut un gain supérieur à l’écart pour passer devant.</p>
        </>
      ) : (
        <p className="mt-3 text-sm text-muted">Pilotes séparés d’un tour ou plus : pas d’interaction stratégique directe.</p>
      )}
    </Card>
  )
}
