import { lazy, useCallback } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { Segmented, Slider, Switch } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { fmt, useTick } from '../store'
import {
  ENGAGE,
  FINAL,
  GEARS,
  RING_NAMES,
  RING_OF,
  SHIFT_TIME,
  STEP_DEG,
  WHEEL_R,
  carSpeed,
  engagedGears,
  ratio,
  requestShift,
  ringOffsets,
  rpmOf,
  shifting,
  sim,
  step,
  useGearboxStore,
  type GbMode,
} from './sim'

const GearboxScene = lazy(() => import('./GearboxScene'))

const gearName = (g: number) => (g === 0 ? 'point mort' : g === 1 ? '1er' : `${g}e`)

export default function GearboxPage() {
  const nudge = useCallback(() => step(0.004), [])
  return (
    <MechShell
      Scene={GearboxScene}
      camera={{ position: [6.2, 2.9, 2.4], fov: 38 }}
      step={step}
      onNudge={nudge}
      nudgeLabel="+4 ms"
      controls={<Controls />}
      panel={<Panel />}
      hud={<Hud />}
    />
  )
}

function Hud() {
  useTick(12)
  const g = Math.round(sim.pos)
  const rpm = rpmOf(sim.wP)
  const eng = engagedGears(sim.pos)
  return (
    <div className="flex items-end gap-2 rounded-lg bg-bg/85 px-3 py-2 ring-1 ring-border">
      <div className="text-center">
        <div className="text-[10px] font-bold uppercase tracking-wider text-muted">Rapport</div>
        <div className={clsx('font-mono text-3xl font-bold leading-none', eng.length > 1 ? 'text-warn' : 'text-accent')}>
          {eng.length > 1 ? eng.map((e) => e + 1).join('+') : g === 0 ? 'N' : g}
        </div>
      </div>
      <div className="min-w-32">
        <div className="font-mono text-sm font-bold">
          {fmt(rpm / 1000, 1)} <span className="text-[11px] text-muted">k tr/min</span>
        </div>
        <div className="mt-1 h-1.5 w-32 overflow-hidden rounded bg-surface-2">
          <div className="h-full bg-f1" style={{ width: `${Math.min(100, (rpm / 15000) * 100)}%` }} />
        </div>
        <div className="mt-1 font-mono text-[11px] text-muted">≈ {fmt(carSpeed())} km/h</div>
      </div>
    </div>
  )
}

function Controls() {
  const { mode, rpm, corner, message, set } = useGearboxStore()
  useTick(6)
  const shift = (d: 1 | -1) => {
    const err = requestShift(d)
    set({ message: err })
  }
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Segmented<GbMode>
            label="Mode"
            value={mode}
            onChange={(v) => {
              set({ mode: v, message: null, rpm: Math.round(rpmOf(sim.wP) / 50) * 50 })
              sim.phase = 'accel'
            }}
            options={[
              { value: 'auto', label: 'Séquence auto 1→8→1' },
              { value: 'manuel', label: 'Palettes' },
            ]}
          />
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={mode === 'auto' || shifting()}
            onClick={() => shift(-1)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-border bg-surface px-3 py-2 text-sm font-bold hover:bg-surface-2 disabled:opacity-40"
          >
            <ChevronDown size={16} /> Rétrograder
          </button>
          <button
            type="button"
            disabled={mode === 'auto' || shifting()}
            onClick={() => shift(1)}
            className="inline-flex flex-1 items-center justify-center gap-1 rounded-md border border-f1 bg-f1 px-3 py-2 text-sm font-bold text-on-f1 disabled:opacity-40"
          >
            <ChevronUp size={16} /> Monter
          </button>
        </div>
        {mode === 'auto' && <p className="text-xs text-muted">Passez en mode « Palettes » pour changer de rapport vous-même (palette droite = monter, gauche = rétrograder).</p>}
        {message && <p className="text-xs font-semibold text-f1">{message}</p>}
      </div>
      <div className="space-y-3">
        {mode === 'manuel' ? (
          <Slider label="Régime moteur" value={rpm} min={4000} max={15000} step={50} unit=" tr/min" onChange={(v) => set({ rpm: v })} hint="La vitesse de l’arbre secondaire (donc de la voiture) suit le régime et le rapport engagé." />
        ) : (
          <p className="text-xs text-muted">
            Mode auto : la voiture accélère (montée à ≈ 11 800 tr/min), puis freine en rétrogradant (≈ 8 200 tr/min). Le temps passé sur chaque rapport est fortement
            raccourci pour la démonstration.
          </p>
        )}
        <Switch checked={corner} onChange={(v) => set({ corner: v })} label="Virage" desc="La roue extérieure doit tourner plus vite : les satellites du différentiel se mettent à tourner sur leur axe." />
      </div>
    </div>
  )
}

function Panel() {
  useTick(8)
  const eng = engagedGears(sim.pos)
  const off = ringOffsets(sim.pos)
  const rpm = rpmOf(sim.wP)
  const outRpm = rpmOf(sim.wS)
  const isShifting = shifting()
  const corner = useGearboxStore((s) => s.corner)

  let text: string
  let tone: 'accent' | 'warn' | 'info' = 'accent'
  if (!isShifting) {
    const g = sim.target
    text =
      g === 0
        ? 'Point mort : aucun baladeur n’est engagé, les huit pignons du secondaire tournent fous autour de l’arbre.'
        : `${gearName(g).replace(/^./, (c) => c.toUpperCase())} rapport engagé : la fourchette plaque le baladeur ${RING_NAMES[RING_OF[g - 1]]} contre le pignon du ${gearName(g)}. Ses six crabots entrent dans ceux du pignon, qui devient solidaire de l’arbre secondaire. Les sept autres pignons, toujours en prise avec le primaire, tournent librement à leur propre vitesse.`
  } else {
    const a = sim.from
    const b = sim.target
    const up = b > a
    const newOn = eng.includes(b - 1)
    const oldOn = a > 0 && eng.includes(a - 1)
    const deg = Math.round(sim.pos * STEP_DEG)
    if (newOn && oldOn) {
      tone = 'warn'
      text = up
        ? `Instant clé du « seamless shift » : le ${gearName(a)} et le ${gearName(b)} sont engagés en même temps (deux baladeurs différents). Le pignon du ${gearName(a)}, désormais entraîné moins vite que l’arbre, glisse sur la face en rampe de ses crabots et se libère tout seul : le couple passe au ${gearName(b)} sans interruption.`
        : `Rétrogradage : le ${gearName(b)} s’engage pendant que le ${gearName(a)} est encore en prise. L’électronique ajuste le couple (gaz, allumage, MGU-K) pour que le régime remonte de façon synchronisée, sans bloquer les roues arrière.`
    } else if (!newOn) {
      tone = 'info'
      text = `Le barillet tourne (${deg}°) : la rainure du baladeur ${RING_NAMES[RING_OF[b - 1]]} dévie et pousse sa fourchette vers le pignon du ${gearName(b)}.${a > 0 ? ` Le ${gearName(a)} transmet encore tout le couple.` : ''}`
    } else {
      text = `${a > 0 ? `Le baladeur ${RING_NAMES[RING_OF[a - 1]]} revient au neutre. ` : ''}Le ${gearName(b)} transmet seul le couple${
        sim.lastDrop ? ` : le régime passe de ${fmt(sim.lastDrop.from)} à ${fmt(sim.lastDrop.to)} tr/min` : ''
      }.`
    }
  }

  return (
    <>
      <PanelCard title="En ce moment">
        <Narration tone={tone}>{text}</Narration>
        <div className="grid grid-cols-3 gap-2">
          <Fig label="Primaire" value={fmt(rpm)} unit="tr/min" />
          <Fig label="Secondaire" value={fmt(outRpm)} unit="tr/min" />
          <Fig label="Barillet" value={`${fmt(sim.pos * STEP_DEG)}°`} note={`${STEP_DEG}° par rapport`} />
        </div>
      </PanelCard>

      <PanelCard title="Baladeurs à crabots">
        <ul className="space-y-1.5">
          {RING_NAMES.map((n, j) => {
            const gears = GEARS.map((_, g) => g).filter((g) => RING_OF[g] === j)
            const o = off[j]
            const pct = Math.round(Math.abs(o) * 100)
            const toward = o < 0 ? gears[0] : gears[1]
            const state = Math.abs(o) > ENGAGE ? `engagé sur le ${gearName(toward + 1)}` : Math.abs(o) > 0.02 ? `en mouvement vers le ${gearName(toward + 1)}` : 'neutre'
            return (
              <li key={n} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 font-bold">
                  {n} <span className="font-normal text-muted">({gears.map((g) => g + 1).join(' / ')})</span>
                </span>
                <span className="relative h-2 flex-1 rounded bg-surface-2">
                  <span className="absolute top-0 h-2 w-0.5 bg-border" style={{ left: '50%' }} />
                  <span
                    className={clsx('absolute top-0 h-2 w-2 rounded-full', Math.abs(o) > ENGAGE ? 'bg-accent' : 'bg-muted')}
                    style={{ left: `calc(${50 + o * 45}% - 4px)` }}
                  />
                </span>
                <span className={clsx('w-36 shrink-0', Math.abs(o) > ENGAGE ? 'text-accent' : 'text-muted')}>
                  {state} {pct > 2 && pct < 98 ? `(${pct} %)` : ''}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-xs text-muted">
          Deux rapports consécutifs sont toujours portés par deux baladeurs différents : c’est ce qui permet d’engager le suivant avant de relâcher le
          précédent.
        </p>
      </PanelCard>

      <PanelCard title="Étagement">
        <table className="w-full text-xs">
          <thead className="text-muted">
            <tr className="text-left">
              <th className="py-0.5 font-semibold">Rapport</th>
              <th className="font-semibold">Dents</th>
              <th className="font-semibold">Boîte</th>
              <th className="font-semibold">Total</th>
              <th className="text-right font-semibold">à 12 000 tr/min</th>
            </tr>
          </thead>
          <tbody className="font-mono">
            {GEARS.map((g, i) => {
              const total = 1 / (ratio(i) * (FINAL.pinion / FINAL.crown))
              const v = ((12000 * 2 * Math.PI) / 60 / total) * WHEEL_R * 3.6
              return (
                <tr key={i} className={clsx(eng.includes(i) ? 'text-accent' : 'text-text')}>
                  <td className="py-0.5 font-sans font-bold">{i + 1}</td>
                  <td>
                    {g.a}/{g.b}
                  </td>
                  <td>{fmt(g.b / g.a, 2)}</td>
                  <td>{fmt(total, 2)}</td>
                  <td className="text-right">{fmt(v)} km/h</td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <p className="text-xs text-muted">
          Couple conique {FINAL.pinion}/{FINAL.crown} (÷ {fmt(FINAL.crown / FINAL.pinion, 1)}), roue de {fmt(WHEEL_R * 2, 2)} m. Dentures et étagement
          plausibles mais inventés <Uncertain>illustratif</Uncertain> : les équipes ne publient pas leurs rapports. Depuis 2014, les 8 rapports doivent être
          déclarés pour toute la saison.
        </p>
      </PanelCard>

      <PanelCard title="Différentiel">
        <p>
          Le pignon conique en bout d’arbre secondaire entraîne la couronne, solidaire du boîtier de différentiel. Les satellites, montés sur un axe en croix,
          répartissent le couple entre les deux planétaires reliés aux arbres de roue.
        </p>
        <p className={corner ? 'text-accent' : 'text-muted'}>
          {corner
            ? 'En virage, la roue extérieure parcourt un plus grand arc : les satellites tournent sur leur axe, une roue accélère et l’autre ralentit d’autant.'
            : 'En ligne droite, les satellites ne tournent pas sur leur axe : tout le boîtier tourne d’un bloc et les deux roues vont à la même vitesse.'}
        </p>
        <p>
          En F1, le différentiel est à glissement limité piloté hydrauliquement : l’ingénieur règle le blocage à l’entrée, au point de corde et à la sortie du
          virage pour équilibrer stabilité et motricité.
        </p>
      </PanelCard>

      <PanelCard title="À retenir">
        <ul className="list-disc space-y-1 pl-4">
          <li>8 rapports avant et une marche arrière obligatoires ; changement par palettes au volant, actionnement hydraulique du barillet.</li>
          <li>
            Passage « seamless » : interruption de couple quasi nulle ; un changement complet prend de l’ordre de quelques millisecondes à quelques dizaines de
            millisecondes <Uncertain />. Ici, un cran de barillet dure {fmt(SHIFT_TIME * 1000)} ms simulées.
          </li>
          <li>Les pignons sont toujours en prise : ce sont les crabots, pas les pignons, qui changent de position. Pas de synchroniseurs comme sur une voiture de série.</li>
          <li>Carter en carbone ou en titane, structurel : il porte la suspension arrière et l’aileron arrière.</li>
          <li>Simplifications : marche arrière, pompe à huile et rampes des crabots non représentées ; satellites et planétaires simplifiés.</li>
        </ul>
      </PanelCard>
    </>
  )
}
