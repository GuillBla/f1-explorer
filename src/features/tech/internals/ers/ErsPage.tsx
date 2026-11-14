import { lazy, useEffect } from 'react'
import clsx from 'clsx'
import { Segmented } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { clamp, fmt, useMechStore, useTick } from '../store'
import { deployLimit, ersSim, HARVEST_LAP_MAX, LAP, LAP_TIME, OVERRIDE_EXTRA, P_MAX, SOC_WINDOW, stepErs, useErsUi, type ErsMode } from './sim'

const ErsScene = lazy(() => import('./ErsScene'))

export default function ErsPage() {
  useEffect(() => useMechStore.getState().set({ speed: 1 }), [])
  return <MechShell Scene={ErsScene} camera={{ position: [-0.65, 2.4, 3.1], fov: 46 }} step={stepErs} controls={<Controls />} panel={<Panel />} hud={<Hud />} />
}

function Controls() {
  const { mode, set } = useErsUi()
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold">Situation</div>
      <Segmented<ErsMode>
        label="Situation"
        value={mode}
        options={[
          { value: 'tour', label: 'Tour complet' },
          { value: 'freinage', label: 'Freinage' },
          { value: 'acceleration', label: 'Accélération' },
          { value: 'override', label: 'Manual Override' },
        ]}
        onChange={(v) => set({ mode: v })}
      />
      <p className="text-xs text-muted">
        Le « tour complet » enchaîne un circuit fictif de {fmt(LAP_TIME)} s : lignes droites, freinages, virages, une portion de recharge et un dépassement en mode Override.
      </p>
    </div>
  )
}

function Bar({ value, max, tone, label, sub }: { value: number; max: number; tone: 'ok' | 'info' | 'warn' | 'f1'; label: string; sub: string }) {
  const bg = { ok: 'bg-ok', info: 'bg-info', warn: 'bg-warn', f1: 'bg-f1' }[tone]
  return (
    <div>
      <div className="flex justify-between text-[11px]">
        <span className="font-bold text-muted">{label}</span>
        <span className="font-mono text-text">{sub}</span>
      </div>
      <div className="mt-0.5 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={clsx('h-full rounded-full transition-[width] duration-100', bg)} style={{ width: `${clamp((value / max) * 100, 0, 100)}%` }} />
      </div>
    </div>
  )
}

function Hud() {
  useTick(12)
  const s = ersSim
  const kw = s.power
  return (
    <div className="w-56 space-y-1 rounded-md bg-bg/85 px-2.5 py-2 ring-1 ring-border">
      <div className="flex items-baseline justify-between font-mono text-xs">
        <span className="text-muted">{fmt(s.speed)} km/h</span>
        <span className={clsx('font-bold', kw > 0 ? 'text-info' : kw < 0 ? 'text-ok' : 'text-muted')}>
          MGU-K {kw > 0 ? '+' : ''}
          {fmt(kw)} kW
        </span>
      </div>
      <Bar value={s.soc} max={SOC_WINDOW + OVERRIDE_EXTRA} tone="ok" label="Batterie (fenêtre utile)" sub={`${fmt(s.soc, 2)} / ${fmt(SOC_WINDOW)} MJ`} />
      <Bar value={s.harvested} max={HARVEST_LAP_MAX} tone="info" label="Récupéré ce tour" sub={`${fmt(s.harvested, 2)} / ${fmt(HARVEST_LAP_MAX, 1)} MJ`} />
      <Bar value={s.deployed} max={HARVEST_LAP_MAX} tone="warn" label="Déployé ce tour" sub={`${fmt(s.deployed, 2)} MJ`} />
      {s.overrideActive && <div className="text-center text-[11px] font-bold text-f1">MANUAL OVERRIDE ACTIF</div>}
    </div>
  )
}

function narrate(): { text: string; tone: 'accent' | 'warn' | 'f1' | 'ok' | 'info' } {
  const s = ersSim
  const mode = useErsUi.getState().mode
  const where = mode === 'tour' ? `${s.seg.label} — ` : ''
  if (s.power < 0 && s.iceCharge > 0)
    return {
      tone: 'warn',
      text: `${where}le V6 fournit plus que nécessaire : ${fmt(s.iceCharge)} kW entraînent le MGU-K en générateur pour recharger la batterie (SOC ${fmt(s.soc, 2)} MJ). Le pilote perd un peu de vitesse de pointe, mais regagne de l’énergie pour la ligne droite suivante.`,
    }
  if (s.power < 0)
    return {
      tone: 'ok',
      text: `${where}freinage : les roues arrière entraînent le MGU-K par la boîte et le vilebrequin. Il fonctionne en générateur et freine la voiture avec ${fmt(-s.power)} kW ; l’onduleur convertit le courant alternatif en continu pour la batterie. Les freins hydrauliques font le reste.`,
    }
  if (s.power === 0 && s.hydraulic > 0)
    return { tone: 'warn', text: `${where}batterie pleine ou plafond de récupération atteint : tout le freinage arrière passe par les disques.` }
  if (s.power > 0 && s.overrideActive)
    return {
      tone: 'f1',
      text: `${where}Manual Override : à moins d’une seconde de la voiture de devant, le pilote dispose d’énergie supplémentaire (+${fmt(OVERRIDE_EXTRA, 1)} MJ) et garde ${fmt(s.power)} kW jusqu’à une vitesse plus élevée que son adversaire.`,
    }
  if (s.power > 0) {
    const lim = deployLimit(s.speed, false)
    return {
      tone: 'info',
      text:
        lim < P_MAX
          ? `${where}à ${fmt(s.speed)} km/h, la puissance électrique autorisée diminue (${fmt(s.power)} kW) : on évite de vider la batterie en fin de ligne droite.`
          : `${where}accélération : la batterie envoie son énergie à l’onduleur, qui alimente le MGU-K en triphasé. ${fmt(s.power)} kW s’ajoutent aux ≈ 400 kW du V6 sur le vilebrequin.`,
    }
  }
  return { tone: 'accent', text: `${where}virage : le V6 entraîne seul la voiture, le MGU-K est quasiment au repos.` }
}

function Panel() {
  useTick(10)
  const n = narrate()
  const s = ersSim
  return (
    <>
      <PanelCard title="En ce moment">
        <Narration tone={n.tone}>{n.text}</Narration>
        {useErsUi.getState().mode === 'tour' && <LapStrip />}
        <div className="grid grid-cols-2 gap-2">
          <Fig label="MGU-K" value={`${s.power > 0 ? '+' : ''}${fmt(s.power)}`} unit="kW" note={s.power > 0 ? 'déploiement' : s.power < 0 ? 'récupération' : 'repos'} />
          <Fig label="V6 aux roues" value={fmt(s.ice)} unit="kW" />
        </div>
        <ul className="flex flex-wrap gap-x-3 text-[11px] text-muted">
          <li><span className="text-ok">●</span> récupération</li>
          <li><span className="text-info">●</span> déploiement</li>
          <li><span className="text-warn">●</span> puissance du V6</li>
        </ul>
      </PanelCard>
      <PanelCard title="Le MGU-K">
        <p>
          Un moteur-générateur électrique (stator bobiné, rotor à aimants permanents) relié au vilebrequin par un train de pignons. Il fonctionne dans les deux sens : en <b>moteur</b>
          il ajoute jusqu’à <b>350 kW</b> (≈ 475 ch, presque trois fois les 120 kW de 2014-2025) ; en <b>générateur</b> il freine la voiture et recharge la batterie.
        </p>
        <p>
          En 2026 la puissance est partagée à peu près moitié-moitié entre thermique et électrique. Sans MGU-H, toute l’énergie électrique vient du freinage et, si besoin, du V6
          qui entraîne le MGU-K.
        </p>
      </PanelCard>
      <PanelCard title="Énergie par tour et dépassement">
        <ul className="list-disc space-y-1 pl-5">
          <li>
            Récupération plafonnée vers <b>8,5 MJ par tour</b> <Uncertain>selon circuit</Uncertain>.
          </li>
          <li>
            Fenêtre utile de la batterie ≈ <b>4 MJ</b> <Uncertain /> : on ne peut pas stocker tout un tour d’avance, il faut récupérer et redéployer en permanence.
          </li>
          <li>
            Puissance électrique réduite au-delà de ≈ 290 km/h en mode normal <Uncertain>forme approximative</Uncertain>.
          </li>
          <li>
            <b>Manual Override</b> : à moins d’une seconde d’un adversaire, + ≈ 0,5 MJ et pleine puissance gardée jusqu’à ≈ 337 km/h <Uncertain />. Il remplace le DRS comme aide au dépassement.
          </li>
        </ul>
        <p className="text-xs text-muted">Ce circuit fictif est court : les énergies affichées par tour sont plus faibles que sur un vrai Grand Prix.</p>
      </PanelCard>
    </>
  )
}

/** Lap progress with coloured segments. */
function LapStrip() {
  const color = { accel: 'bg-info', brake: 'bg-ok', corner: 'bg-border', recharge: 'bg-warn' } as const
  return (
    <div>
      <div className="relative flex h-3 overflow-hidden rounded">
        {LAP.map((s, i) => (
          <div key={i} className={clsx('h-full border-r border-bg', s.override ? 'bg-f1' : color[s.kind])} style={{ width: `${(s.dur / LAP_TIME) * 100}%` }} title={s.label} />
        ))}
        <div className="absolute top-0 h-full w-0.5 bg-text" style={{ left: `${(ersSim.lapT / LAP_TIME) * 100}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between text-[10px] text-muted">
        <span>départ</span>
        <span>tour fictif · {fmt(LAP_TIME)} s</span>
      </div>
    </div>
  )
}
