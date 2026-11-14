import { lazy, useEffect } from 'react'
import clsx from 'clsx'
import { Gauge, Snail } from 'lucide-react'
import { Segmented, Slider } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { fmt, useMechStore, useTick } from '../store'
import {
  combustion,
  CYLS,
  cylPhase,
  engineSim,
  FIRING_ORDER,
  nudgeEngine,
  R,
  ROD,
  RPM_MAX,
  RPM_MIN,
  SPARK,
  stepEngine,
  STROKE_LABEL,
  STROKE_TOKEN,
  strokeOf,
  useEngineUi,
  VALVE,
  type Stroke,
} from './kinematics'

const EngineScene = lazy(() => import('./EngineScene'))

export default function EnginePage() {
  // slow enough to follow the pistons
  useEffect(() => useMechStore.getState().set({ speed: 0.01 }), [])
  return (
    <MechShell
      Scene={EngineScene}
      camera={{ position: [2.2, 7.4, 5.6], fov: 34 }}
      step={stepEngine}
      onNudge={nudgeEngine}
      nudgeLabel="+10°"
      controls={<Controls />}
      panel={<Panel />}
      hud={<Hud />}
    />
  )
}

function Controls() {
  const { rpm, focus, view, set } = useEngineUi()
  const setMech = useMechStore((s) => s.set)
  return (
    <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto]">
      <Slider
        label="Régime moteur"
        value={rpm}
        min={RPM_MIN}
        max={RPM_MAX}
        step={100}
        unit=" tr/min"
        onChange={(v) => set({ rpm: v })}
        hint="15 000 tr/min : limite réglementaire. En course, le débit de carburant limité fait plafonner la puissance vers 10 500-12 000 tr/min."
      />
      <div className="flex flex-wrap items-start gap-2 md:flex-col">
        <button
          type="button"
          onClick={() => {
            set({ rpm: RPM_MIN })
            setMech({ speed: 0.01, playing: true })
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"
        >
          <Snail size={16} /> Suivre un cycle (40 tr/min affichés)
        </button>
        <button
          type="button"
          onClick={() => {
            set({ rpm: 10500 })
            setMech({ speed: 0.05, playing: true })
          }}
          className="inline-flex items-center gap-1.5 rounded-md border border-border bg-surface px-3 py-1.5 text-sm font-semibold text-muted hover:bg-surface-2 hover:text-text"
        >
          <Gauge size={16} /> Régime de course
        </button>
      </div>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-3 md:col-span-2">
        <div>
          <div className="mb-1.5 text-sm font-semibold">Vue en coupe</div>
          <Segmented
            label="Vue en coupe"
            value={view}
            options={[
              { value: 'face', label: 'Coupe transversale' },
              { value: 'dessus', label: 'Coupe des bancs' },
            ]}
            onChange={(v) => set({ view: v })}
          />
        </div>
        <div>
          <div className="mb-1.5 text-sm font-semibold">Cylindre suivi par le panneau</div>
          <CylinderPicker focus={focus} onPick={(n) => set({ focus: n })} />
        </div>
      </div>
    </div>
  )
}

function CylinderPicker({ focus, onPick }: { focus: number; onPick: (n: number) => void }) {
  useTick(10)
  return (
    <div className="flex flex-wrap gap-1.5">
      {CYLS.map((c) => {
        const st = strokeOf(cylPhase(engineSim.theta, c))
        return (
          <button
            key={c.n}
            type="button"
            onClick={() => onPick(c.n)}
            aria-pressed={focus === c.n}
            className={clsx(
              'flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-bold transition-colors',
              focus === c.n ? 'border-text bg-surface-2 text-text' : 'border-border bg-bg text-muted hover:text-text',
            )}
          >
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: STROKE_TOKEN[st] }} />
            {c.n} <span className="font-normal">({c.bank === 'A' ? 'G' : 'D'})</span>
          </button>
        )
      })}
    </div>
  )
}

function Hud() {
  useTick(12)
  const speed = useMechStore((s) => s.speed)
  const playing = useMechStore((s) => s.playing)
  const rpm = engineSim.rpm
  const degPerFrame = (rpm / 60) * 360 * speed / 60
  return (
    <>
      <div className="rounded-md bg-bg/85 px-2.5 py-1.5 font-mono text-xs ring-1 ring-border">
        <div>
          <span className="text-muted">Vilebrequin </span>
          <span className="font-bold text-accent">{fmt(engineSim.theta % 360)}°</span>
          <span className="text-muted"> · cycle </span>
          <span className="font-bold text-text">{fmt(engineSim.theta)}°/720</span>
        </div>
        <div>
          <span className="text-muted">Réel </span>
          <span className="font-bold text-text">{fmt(rpm)} tr/min</span>
          <span className="text-muted"> → affiché </span>
          <span className="font-bold text-text">{fmt(rpm * speed, rpm * speed < 100 ? 1 : 0)} tr/min</span>
        </div>
      </div>
      {playing && degPerFrame > 50 && (
        <div className="rounded-md bg-bg/85 px-2.5 py-1.5 text-xs text-warn ring-1 ring-warn/50">
          Effet stroboscopique : ≈ {fmt(degPerFrame)}° de vilebrequin par image. Ralentissez pour suivre le mouvement.
        </div>
      )}
      <span className="ml-auto hidden rounded-md bg-bg/85 px-2 py-1 text-[11px] text-muted ring-1 ring-border sm:block">Glisser : tourner · molette : zoom</span>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* Explanation panel                                                   */
/* ------------------------------------------------------------------ */

const bankName = (b: 'A' | 'B') => (b === 'A' ? 'banc gauche' : 'banc droit')

function narrate(ph: number, n: number, bank: 'A' | 'B', throwIdx: number): { text: string; tone: 'accent' | 'warn' | 'f1' | 'ok' | 'info' } {
  const who = `Cylindre ${n} (${bankName(bank)})`
  const btdc = (720 - ph) % 720
  if (ph >= SPARK || ph < 4) {
    return {
      tone: 'f1',
      text: `${who} — allumage, ${ph >= SPARK ? `${fmt(btdc)}° avant` : `${fmt(ph)}° après`} le point mort haut. La bougie enflamme le petit volume de la préchambre ; la flamme jaillit par ses orifices calibrés en jets brûlants qui allument le mélange pauvre de la chambre principale en plusieurs points à la fois (« jet ignition »).`,
    }
  }
  if (ph < 30)
    return {
      tone: 'f1',
      text: `${who} — combustion, ${fmt(ph)}° après le PMH. Le front de flamme traverse la chambre en un temps très court : la pression culmine juste après le PMH, au moment où la bielle a le meilleur bras de levier pour pousser le maneton ${throwIdx + 1}.`,
    }
  if (ph < VALVE.exhaust.open)
    return {
      tone: 'f1',
      text: `${who} — détente, ${fmt(ph)}° après le PMH. Les gaz brûlés poussent le piston vers le bas : c’est le seul temps moteur du cycle. La bielle en titane transmet l’effort au vilebrequin.`,
    }
  if (ph < 180)
    return {
      tone: 'warn',
      text: `${who} — ouverture anticipée de l’échappement, ${fmt(180 - ph)}° avant le point mort bas. Les gaz encore sous pression s’échappent d’eux-mêmes (« blowdown ») : leur énergie part entraîner la turbine du turbo.`,
    }
  if (ph < VALVE.intake.open)
    return {
      tone: 'warn',
      text: `${who} — échappement, ${fmt(ph - 180)}° après le PMB. Le piston remonte et chasse les gaz brûlés vers le collecteur, puis vers la turbine.`,
    }
  if (ph < VALVE.exhaust.close)
    return {
      tone: 'accent',
      text: `${who} — croisement des soupapes autour du PMH : admission et échappement sont ouverts en même temps. L’onde de dépression du collecteur aspire les derniers gaz brûlés et amorce le remplissage en air frais.`,
    }
  if (ph < 540)
    return {
      tone: 'info',
      text: `${who} — admission, ${fmt(ph - 360)}° après le PMH. Le piston descend ; l’air comprimé par le turbo remplit le cylindre par les deux soupapes d’admission. L’injecteur pulvérise l’essence directement dans la chambre.`,
    }
  if (ph < VALVE.intake.close)
    return {
      tone: 'info',
      text: `${who} — fin d’admission, ${fmt(ph - 540)}° après le PMB. Les soupapes restent ouvertes alors que le piston remonte : l’inertie de la colonne d’air continue de remplir le cylindre.`,
    }
  return {
    tone: 'accent',
    text: `${who} — compression, ${fmt(btdc)}° avant le PMH. Toutes les soupapes sont fermées ; le piston comprime le mélange (rapport volumétrique plafonné à 16:1 en 2026, contre 18:1 auparavant).`,
  }
}

function Panel() {
  useTick(10)
  const focus = useEngineUi((s) => s.focus)
  const rpm = useEngineUi((s) => s.rpm)
  const th = engineSim.theta
  const c = CYLS[focus - 1]
  const ph = cylPhase(th, c)
  const nar = narrate(ph, c.n, c.bank, c.throw)
  const omega = (rpm / 60) * 2 * Math.PI
  const accelG = ((R / 1000) * omega * omega * (1 + R / ROD)) / 9.81
  const pistonSpeed = (2 * 0.053 * rpm) / 60
  const cb = combustion(ph)
  return (
    <>
      <PanelCard title="En ce moment">
        <Narration tone={nar.tone}>{nar.text}</Narration>
        <div className="flex items-center gap-3">
          <PhaseWheel theta={th} focus={focus} />
          <ul className="flex-1 space-y-0.5 text-xs">
            {CYLS.map((k) => {
              const p = cylPhase(th, k)
              const st = strokeOf(p)
              return (
                <li key={k.n} className={clsx('flex items-center gap-1.5', k.n === focus ? 'font-bold text-text' : 'text-muted')}>
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: STROKE_TOKEN[st] }} />
                  <span className="w-4 font-mono">{k.n}</span>
                  <span className="flex-1 truncate">{STROKE_LABEL[st]}</span>
                  <span className="font-mono">{fmt(p)}°</span>
                </li>
              )
            })}
          </ul>
        </div>
        <p className="text-xs text-muted">
          Ordre d’allumage modélisé : <span className="font-mono font-bold text-text">{FIRING_ORDER.join('-')}</span>, intervalles irréguliers 90° / 150° : c’est la conséquence
          d’un V à 90° avec trois manetons partagés. L’ordre réel de chaque motoriste n’est pas publié <Uncertain />.
        </p>
        {cb.pre > 0.05 && <p className="text-xs font-bold text-f1">Préchambre allumée</p>}
      </PanelCard>

      <PanelCard title="Chiffres à ce régime">
        <div className="grid grid-cols-2 gap-2">
          <Fig label="Combustions" value={fmt((rpm / 60) * 3)} unit="/ s" note="3 par tour de vilebrequin" />
          <Fig label="Vitesse moy. piston" value={fmt(pistonSpeed, 1)} unit="m/s" note="2 × course × régime" />
          <Fig label="Accél. max piston" value={fmt(Math.round(accelG / 100) * 100)} unit="g" note="r·ω²·(1 + r/L), au PMH" />
          <Fig label="Un cycle 4 temps" value={fmt((2 / (rpm / 60)) * 1000, 1)} unit="ms" note="2 tours de vilebrequin" />
        </div>
        <p className="text-xs text-muted">
          Alésage 80 mm et course 53 mm (1,6 L / 6) : imposés par le règlement. Longueur de bielle 110 mm et entraxe des cylindres 106 mm : valeurs plausibles, non publiées
          <Uncertain />.
        </p>
      </PanelCard>

      <PanelCard title="Distribution et soupapes">
        <p>
          Deux arbres à cames en tête par banc tournent à <b>la moitié</b> du régime du vilebrequin, entraînés par une cascade de pignons. Quatre soupapes par cylindre : deux d’admission
          côté intérieur du V, deux d’échappement côté extérieur.
        </p>
        <p>
          À 15 000 tr/min, des ressorts en acier ne suivraient pas : les F1 utilisent un <b>rappel pneumatique</b> (petits vérins d’azote sous pression) qui referme la soupape sans
          rebond.
        </p>
        <p className="text-xs text-muted">
          Calage modélisé : échappement ouvert de 50° avant le PMB à 25° après le PMH, admission de 25° avant le PMH à 70° après le PMB, levées 11-12 mm. Les calages réels sont
          confidentiels <Uncertain />.
        </p>
      </PanelCard>

      <PanelCard title="Préchambre : l’allumage par jets">
        <p>
          Dans un petit volume (quelques % de la chambre) autour de la bougie, un mélange plus riche s’enflamme facilement. La flamme sort par 6 à 8 orifices calibrés en
          <b> jets turbulents</b> qui allument le mélange très pauvre de la chambre principale en plusieurs points : combustion rapide, sans cliquetis, avec plus d’air que de carburant.
        </p>
        <p className="text-xs text-muted">
          Technologie issue de Mahle (TJI) et adoptée par tous les motoristes depuis ~2015. Nombre et taille des orifices, préchambre active ou passive : non publiés <Uncertain />.
        </p>
      </PanelCard>

      <FuelCard rpm={rpm} />
    </>
  )
}

/** 720° ring with the 4 strokes of the focus cylinder and the position of all 6 cylinders. */
function PhaseWheel({ theta, focus }: { theta: number; focus: number }) {
  const size = 120
  const cx = size / 2
  const r = 46
  const arc = (a0: number, a1: number) => {
    const p = (a: number) => {
      const t = ((a / 720) * 360 - 90) * (Math.PI / 180)
      return [cx + r * Math.cos(t), cx + r * Math.sin(t)]
    }
    const [x0, y0] = p(a0)
    const [x1, y1] = p(a1)
    return `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1}`
  }
  const segs: [number, number, Stroke][] = [
    [0, 180, 'detente'],
    [180, 360, 'echappement'],
    [360, 540, 'admission'],
    [540, 720, 'compression'],
  ]
  const pos = (ph: number, rr: number) => {
    const t = ((ph / 720) * 360 - 90) * (Math.PI / 180)
    return [cx + rr * Math.cos(t), cx + rr * Math.sin(t)]
  }
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label="Phase du cycle de chaque cylindre">
      {segs.map(([a, b, st]) => (
        <path key={st} d={arc(a + 1, b - 1)} stroke={STROKE_TOKEN[st]} strokeWidth={9} fill="none" opacity={0.85} />
      ))}
      <text x={cx} y={cx - 4} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
        PMH
      </text>
      <text x={cx} y={cx + 9} textAnchor="middle" fontSize={9} fill="var(--color-muted)">
        cylindre {focus}
      </text>
      {CYLS.map((c) => {
        const ph = cylPhase(theta, c)
        const [x, y] = pos(ph, c.n === focus ? r : r - 14)
        return (
          <g key={c.n}>
            <circle cx={x} cy={y} r={c.n === focus ? 7 : 5.5} fill={c.n === focus ? 'var(--color-text)' : 'var(--color-surface-2)'} stroke="var(--color-text)" strokeWidth={1} />
            <text x={x} y={y + 3} textAnchor="middle" fontSize={c.n === focus ? 9 : 7.5} fontWeight={700} fill={c.n === focus ? 'var(--color-bg)' : 'var(--color-text)'}>
              {c.n}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Fuel flow limit: 2014-2025 mass flow curve, 2026 energy flow. */
function FuelCard({ rpm }: { rpm: number }) {
  const flow = (n: number) => (n >= 10500 ? 100 : 0.009 * n + 5.5)
  const W = 300
  const H = 110
  const x = (n: number) => 28 + ((n - 4000) / 11000) * (W - 38)
  const y = (q: number) => H - 18 - (q / 110) * (H - 28)
  const pts = Array.from({ length: 23 }, (_, i) => 4000 + i * 500)
  const path = pts.map((n, i) => `${i ? 'L' : 'M'}${x(n)},${y(flow(n))}`).join(' ')
  return (
    <PanelCard title="Débit de carburant limité">
      <p>
        La puissance d’un moteur thermique dépend du carburant qu’il brûle par seconde. Le règlement plafonne donc le <b>débit</b> : passé un certain régime, tourner plus vite
        n’apporte presque plus rien. D’où des moteurs conçus pour le <b>rendement</b> (plus de 50 % de l’énergie du carburant transformée en travail, contre ~30 % pour une voiture
        de série).
      </p>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Débit de carburant maximal en fonction du régime (2014-2025)">
        <line x1={28} x2={W - 10} y1={y(0)} y2={y(0)} stroke="var(--color-border)" />
        <line x1={28} x2={28} y1={y(0)} y2={y(110)} stroke="var(--color-border)" />
        {[50, 100].map((q) => (
          <g key={q}>
            <line x1={28} x2={W - 10} y1={y(q)} y2={y(q)} stroke="var(--color-border)" strokeDasharray="2 3" />
            <text x={24} y={y(q) + 3} fontSize={9} textAnchor="end" fill="var(--color-muted)">
              {q}
            </text>
          </g>
        ))}
        <path d={path} fill="none" stroke="var(--color-warn)" strokeWidth={2} />
        <line x1={x(rpm)} x2={x(rpm)} y1={y(0)} y2={y(110)} stroke="var(--color-accent)" strokeWidth={1.5} />
        <circle cx={x(rpm)} cy={y(flow(rpm))} r={3.5} fill="var(--color-accent)" />
        {[4000, 10500, 15000].map((n) => (
          <text key={n} x={x(n)} y={H - 4} fontSize={9} textAnchor="middle" fill="var(--color-muted)">
            {fmt(n)}
          </text>
        ))}
        <text x={x(6200)} y={y(80)} fontSize={9} fill="var(--color-muted)">
          kg/h (2014-2025)
        </text>
      </svg>
      <p className="text-xs text-muted">
        2014-2025 : 100 kg/h maximum au-delà de 10 500 tr/min, Q = 0,009 × N + 5,5 kg/h en dessous ; à {fmt(rpm)} tr/min : <b className="text-text">{fmt(flow(rpm), 1)} kg/h</b>.
      </p>
      <p>
        <b>2026</b> : carburant <b>100 % durable</b> (synthétique ou biosourcé) et limite exprimée en <b>énergie</b> et non plus en masse : environ 3 000 MJ/h, soit de l’ordre de
        70 kg/h selon le pouvoir calorifique du carburant <Uncertain />. Le thermique tombe ainsi vers ~400 kW <Uncertain>approx.</Uncertain>, l’électrique montant à 350 kW.
      </p>
    </PanelCard>
  )
}
