import { lazy, useEffect, type ReactNode } from 'react'
import clsx from 'clsx'
import { Segmented, Slider } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { fmt, useMechStore, useTick } from '../store'
import { LOCK_DEG, MODULE, PINION_R, PINION_Z, sim, steerAngles, step, useSteerStore, type ControlId, type SteerMode } from './sim'

const Scene = lazy(() => import('./SteeringScene'))

export default function SteeringPage() {
  // steering is slow enough to be followed in real time
  useEffect(() => {
    useMechStore.getState().set({ speed: 0.5 })
  }, [])
  return (
    <MechShell
      Scene={Scene}
      camera={{ position: [0.9, 5.2, 7.6], fov: 38 }}
      step={step}
      onNudge={() => step(0.1)}
      nudgeLabel="+0,1 s"
      noCut
      controls={<Controls />}
      panel={<Panel />}
      hud={<Hud />}
    />
  )
}

function Controls() {
  const s = useSteerStore()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Pilotage</span>
          <Segmented<SteerMode>
            label="Mode de pilotage"
            value={s.mode}
            options={[
              { value: 'auto', label: 'Chicane + épingle' },
              { value: 'manuel', label: 'Manuel' },
            ]}
            onChange={(mode) => s.set({ mode, wheelDeg: Math.round(sim.wheelDeg) })}
          />
        </div>
        <p className="text-xs text-muted">En mode automatique, le volant enchaîne une chicane puis une épingle serrée (type Monaco) en braquage maximal.</p>
      </div>
      <Slider
        label="Angle du volant"
        value={s.mode === 'manuel' ? s.wheelDeg : Math.round(sim.wheelDeg)}
        min={-LOCK_DEG}
        max={LOCK_DEG}
        step={1}
        unit="°"
        onChange={(wheelDeg) => s.set({ mode: 'manuel', wheelDeg })}
        hint="Négatif = à gauche, positif = à droite. Passe en mode manuel."
      />
    </div>
  )
}

function Hud() {
  useTick(12)
  const a = steerAngles()
  return (
    <>
    <span className="rounded-md bg-bg/85 px-2 py-1 font-mono text-xs font-bold text-accent ring-1 ring-border">
      Volant {sim.wheelDeg >= 0 ? '+' : ''}
      {fmt(sim.wheelDeg)}° · roues {fmt(a.l, 1)}° / {fmt(a.r, 1)}°
    </span>
    <span className="ml-auto rounded-md bg-bg/85 px-2 py-1 text-[11px] text-muted ring-1 ring-border">Volant agrandi ×1,6 pour la lisibilité</span>
    </>
  )
}

const CONTROL_INFO: { id: ControlId; label: string; text: ReactNode }[] = [
  { id: 'ecran', label: 'Écran', text: 'Rapport engagé, vitesse, écart au tour (delta), alertes, état de charge de la batterie. Les diodes du haut indiquent le moment de passer le rapport.' },
  { id: 'palettes', label: 'Palettes de vitesses', text: 'Derrière le volant : droite pour monter, gauche pour descendre. Elles commandent électroniquement la boîte séquentielle à 8 rapports (passage en quelques millisecondes).' },
  { id: 'embrayage', label: 'Palettes d’embrayage', text: 'Utilisées au départ et dans les stands. Le pilote relâche la palette jusqu’à un point de patinage réglé à l’avance ; ensuite l’embrayage n’est plus utilisé en course.' },
  {
    id: 'aero',
    label: 'Aéro active',
    text: (
      <>
        En 2026, le DRS disparaît : des volets avant et arrière mobiles passent en mode « ligne droite » (moins de traînée) puis reviennent en mode « virage ».
        Conditions d’activation détaillées <Uncertain>à vérifier</Uncertain>.
      </>
    ),
  },
  {
    id: 'override',
    label: 'Override (dépassement)',
    text: (
      <>
        « Manual Override Mode » : surplus d’énergie électrique accordé au pilote qui suit une voiture de près (moins d’une seconde environ), pour l’attaquer
        <Uncertain>seuils exacts</Uncertain>.
      </>
    ),
  },
  { id: 'radio', label: 'Radio', text: 'Bouton à maintenir pour parler à l’ingénieur de course.' },
  { id: 'limiteur', label: 'Limiteur stand', text: 'Bloque la vitesse dans la voie des stands (80 km/h en général, 60 km/h sur les circuits étroits).' },
  { id: 'neutre', label: 'Neutre', text: 'Engage le point mort, par exemple pour s’arrêter en bord de piste ou sur la grille.' },
  { id: 'diff', label: 'Différentiel', text: 'Règle le blocage du différentiel, souvent séparément à l’entrée, au milieu et à la sortie du virage : plus bloqué = plus de motricité, mais la voiture tourne moins bien.' },
  { id: 'freinage', label: 'Répartition de freinage', text: 'Déplace l’effort de freinage vers l’avant ou l’arrière, virage par virage. À l’arrière, le brake-by-wire combine la récupération du MGU-K et les freins hydrauliques.' },
  { id: 'moteur', label: 'Mode moteur', text: 'Cartographies du groupe propulseur : qualification, course, économie de carburant, sécurité en cas de problème.' },
  { id: 'recharge', label: 'Recharge / déploiement', text: 'Stratégie d’énergie électrique : plus de récupération pour recharger la batterie, ou plus de déploiement pour attaquer ou défendre.' },
]

function Panel() {
  useTick(8)
  const { focus, set } = useSteerStore()
  const a = steerAngles()
  const turning = Math.abs(sim.wheelDeg) > 2
  const right = sim.wheelDeg > 0
  const inner = right ? a.r : a.l
  const outer = right ? a.l : a.r
  const text = turning
    ? `Le volant est tourné de ${fmt(Math.abs(sim.wheelDeg))}° vers la ${right ? 'droite' : 'gauche'}. Le pignon fait glisser la crémaillère de ${fmt(Math.abs(sim.rack), 1)} mm vers la ${sim.rack > 0 ? 'droite' : 'gauche'} ; les biellettes poussent et tirent les bras de direction, qui font pivoter les porte-moyeux. La roue intérieure braque de ${fmt(Math.abs(inner), 1)}°, l’extérieure de ${fmt(Math.abs(outer), 1)}° : c’est l’effet Ackermann.`
    : 'Volant au centre : la crémaillère est au milieu, les deux roues sont parallèles (au pincement près).'
  return (
    <>
      <PanelCard title="En ce moment">
        <Narration tone={turning ? 'accent' : 'ok'}>{text}</Narration>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Fig label="Volant" value={`${fmt(sim.wheelDeg)}°`} />
          <Fig label="Crémaillère" value={fmt(sim.rack, 1)} unit="mm" note={`= r × θ, r = ${fmt(PINION_R, 1)} mm`} />
          <Fig label="Roue intérieure" value={turning ? `${fmt(Math.abs(inner), 1)}°` : '0°'} />
          <Fig label="Roue extérieure" value={turning ? `${fmt(Math.abs(outer), 1)}°` : '0°'} />
          <Fig label="Démultiplication" value={turning ? `${fmt(Math.abs(sim.wheelDeg / a.mean), 1)} : 1` : '—'} note="angle volant / angle roue" />
          <Fig label="Rayon de virage" value={Number.isFinite(a.radius) ? fmt(a.radius, 1) : '∞'} unit="m" note="géométrique, sans dérive des pneus" />
        </div>
      </PanelCard>

      <PanelCard title="Les commandes du volant">
        <p className="text-xs text-muted">Cliquez une commande pour la repérer sur le volant 3D. Disposition générique : chaque équipe dessine le sien.</p>
        <ul className="space-y-1">
          {CONTROL_INFO.map((c) => (
            <li key={c.id}>
              <button
                type="button"
                onClick={() => set({ focus: focus === c.id ? null : c.id })}
                aria-pressed={focus === c.id}
                className={clsx('w-full rounded-md border px-2 py-1.5 text-left transition-colors', focus === c.id ? 'border-accent bg-accent/10' : 'border-border hover:bg-surface-2')}
              >
                <span className={clsx('block text-sm font-bold', focus === c.id && 'text-accent')}>{c.label}</span>
                {focus === c.id && <span className="block text-xs leading-relaxed text-muted">{c.text}</span>}
              </button>
            </li>
          ))}
        </ul>
        <p className="text-muted">
          Un volant de F1 coûte plusieurs dizaines de milliers d’euros et pèse environ 1,3 kg <Uncertain>ordre de grandeur</Uncertain>. Il se déclipse pour que le pilote
          puisse sortir de la monocoque en quelques secondes.
        </p>
      </PanelCard>

      <PanelCard title="La direction à crémaillère">
        <p>
          La colonne fait tourner un <b>pignon</b> ({PINION_Z} dents, module {fmt(MODULE, 1)} mm dans ce modèle) qui engrène sur une <b>crémaillère</b> à denture droite : la
          rotation devient une translation. Deux <b>biellettes</b> transmettent ce mouvement aux <b>bras de direction</b> des porte-moyeux.
        </p>
        <p>
          Les bras sont inclinés vers l’intérieur : la roue intérieure braque plus que l’extérieure, car elle décrit un cercle plus petit (<b>Ackermann</b>). En F1, les
          pneus travaillent avec de forts angles de dérive et les équipes réduisent souvent cet effet, voire l’inversent <Uncertain>selon les équipes</Uncertain>.
        </p>
        <p>
          La direction est très directe (environ ±{LOCK_DEG}° de volant au maximum ici) <Uncertain>varie selon le circuit</Uncertain> et assistée hydrauliquement ; les
          systèmes de direction qui modifient le pincement en roulant (le « DAS » de Mercedes en 2020) sont interdits depuis 2021.
        </p>
      </PanelCard>
    </>
  )
}
