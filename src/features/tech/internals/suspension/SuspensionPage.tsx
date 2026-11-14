import { lazy, useEffect } from 'react'
import { Segmented, Slider, Switch } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { DEG, fmt, useMechStore, useTick } from '../store'
import { B, C, corner, INERTER_LEAD, KS, KT, motionRatio, MS, MU, restOf, sim, step, travel, travelV, useSuspStore, VIS, type RoadProfile, type SuspLayout } from './sim'

const Scene = lazy(() => import('./SuspensionScene'))

export default function SuspensionPage() {
  // a bump at racing speed lasts a few hundredths of a second: start in deep slow motion
  useEffect(() => {
    useMechStore.getState().set({ speed: 0.02 })
  }, [])
  return (
    <MechShell
      Scene={Scene}
      camera={{ position: [1.6, 3.6, 6.9], fov: 36 }}
      step={step}
      onNudge={() => step(0.004)}
      nudgeLabel="+4 ms"
      controls={<Controls />}
      panel={<Panel />}
      hud={<Hud />}
    />
  )
}

function Controls() {
  const s = useSuspStore()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Architecture</span>
          <Segmented<SuspLayout>
            label="Architecture"
            value={s.layout}
            options={[
              { value: 'push', label: 'Push-rod' },
              { value: 'pull', label: 'Pull-rod' },
            ]}
            onChange={(layout) => s.set({ layout })}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold">Obstacle</span>
          <Segmented<RoadProfile>
            label="Obstacle"
            value={s.profile}
            options={[
              { value: 'bosse', label: 'Bosse' },
              { value: 'vibreur', label: 'Vibreur' },
            ]}
            onChange={(profile) => s.set({ profile })}
          />
        </div>
        <Switch checked={s.inerter} onChange={(inerter) => s.set({ inerter })} label="Inerter (J-damper)" desc="Masse apparente qui résiste à l’accélération relative roue/châssis. Interdit aujourd’hui (voir panneau)." />
      </div>
      <div className="space-y-4">
        <Slider label="Hauteur de l’obstacle" value={s.bumpMm} min={5} max={50} step={1} unit=" mm" onChange={(bumpMm) => s.set({ bumpMm })} />
        <Slider label="Vitesse de la voiture" value={s.speedKmh} min={40} max={320} step={10} unit=" km/h" onChange={(speedKmh) => s.set({ speedKmh })} hint="Plus la voiture va vite, plus la bosse est « brève » : l’amortisseur et l’inerter travaillent davantage." />
      </div>
    </div>
  )
}

function Hud() {
  useTick(12)
  const tr = travel() * 1000
  return (
    <>
      <span className="rounded-md bg-bg/85 px-2 py-1 font-mono text-xs font-bold text-accent ring-1 ring-border">
        Débattement {tr >= 0 ? '+' : ''}
        {fmt(tr, 1)} mm
      </span>
      {!sim.contact && <span className="rounded-md bg-f1 px-2 py-1 text-xs font-bold text-on-f1">Roue en l’air</span>}
      <span className="ml-auto rounded-md bg-bg/85 px-2 py-1 text-[11px] text-muted ring-1 ring-border">Mouvements verticaux amplifiés ×{fmt(VIS, 1)} à l’écran</span>
    </>
  )
}

function narrate(layout: SuspLayout, inerter: boolean): { text: string; tone: 'accent' | 'warn' | 'f1' | 'ok' | 'info' } {
  const tr = travel() * 1000
  const v = travelV()
  const c = corner(layout, tr)
  const rest = restOf(layout)
  const rockDeg = Math.abs(c.phi) / DEG
  const stroke = rest.damperLen - c.damperLen
  const rod = layout === 'push' ? 'le poussoir (travaillant en compression) pousse' : 'le tirant (travaillant en traction) tire'
  if (!sim.contact) return { text: `La roue a quitté le sol : le pneu n’appuie plus sur la piste, plus aucune adhérence sur cette roue. Le ressort et l’amortisseur la ramènent vers le bas.`, tone: 'f1' }
  if (Math.abs(tr) < 0.6 && Math.abs(v) < 0.03) {
    return { text: 'Piste plane : la roue suit le sol, la suspension est à sa position d’équilibre statique (la voiture repose sur la barre de torsion).', tone: 'ok' }
  }
  const inert = inerter && Math.abs(sim.Finerter) > 30 ? ` L’inerter s’oppose à l’accélération relative : ${fmt(Math.abs(sim.Finerter))} N, sans freiner la vitesse elle-même.` : ''
  if (v > 0.02) {
    return {
      text: `Compression : la roue monte par rapport au châssis (débattement ${tr >= 0 ? '+' : ''}${fmt(tr, 1)} mm). Les triangles pivotent, ${rod} le culbuteur (à ${fmt(rockDeg, 1)}° de sa position statique), tord la barre de torsion et enfonce l’amortisseur (${fmt(stroke, 1)} mm de course).${inert}`,
      tone: 'accent',
    }
  }
  if (v < -0.02) {
    return {
      text: `Détente : la roue redescend (débattement ${fmt(tr, 1)} mm). La barre de torsion restitue l’énergie stockée ; l’amortisseur, en détente, freine ce retour pour que la roue ne rebondisse pas.${inert}`,
      tone: 'info',
    }
  }
  return { text: `Point mort : la roue est à ${fmt(tr, 1)} mm et change de sens. La force de l’amortisseur est nulle à cet instant, seule la barre de torsion travaille.${inert}`, tone: 'warn' }
}

function Panel() {
  useTick(8)
  const { layout, inerter } = useSuspStore()
  const tr = travel() * 1000
  const c = corner(layout, tr)
  const rest = restOf(layout)
  const n = narrate(layout, inerter)
  const mr = motionRatio(layout, tr)
  const twist = c.phi / DEG
  const flyTurns = (rest.inerterLen - c.inerterLen) / INERTER_LEAD
  return (
    <>
      <PanelCard title="En ce moment">
        <Narration tone={n.tone}>{n.text}</Narration>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <Fig label="Débattement roue" value={`${tr >= 0 ? '+' : ''}${fmt(tr, 1)}`} unit="mm" />
          <Fig label="Vitesse relative" value={fmt(travelV(), 2)} unit="m/s" />
          <Fig label="Culbuteur / barre" value={fmt(twist, 1)} unit="°" note="angle de torsion" />
          <Fig label="Rapport de levier" value={fmt(mr, 2)} note="course amortisseur / course roue" />
          <Fig label="Force amortisseur" value={fmt(sim.Fdamper)} unit="N" note="ramenée à la roue" />
          <Fig label={inerter ? 'Inerter' : 'Variation charge pneu'} value={inerter ? fmt(sim.Finerter) : fmt(sim.Ft)} unit="N" note={inerter ? `volant : ${fmt(flyTurns, 2)} tour` : undefined} />
        </div>
      </PanelCard>

      <PanelCard title="La chaîne cinématique">
        <ol className="list-decimal space-y-1 pl-5">
          <li>La roue est portée par le <b>porte-moyeu</b>, tenu par deux <b>triangles</b> en carbone articulés sur la coque : il ne peut que monter et descendre.</li>
          <li>
            Un <b>{layout === 'push' ? 'poussoir' : 'tirant'}</b> transmet ce mouvement vers l’intérieur de la coque, où un <b>culbuteur</b> le transforme en rotation.
          </li>
          <li>
            Le culbuteur tord une <b>barre de torsion</b> (le ressort, rayure jaune) et actionne l’<b>amortisseur</b> (dissipe l’énergie), avec un rapport de levier choisi par
            l’ingénieur.
          </li>
          <li>Une <b>barre anti-roulis</b> (non représentée) relie les culbuteurs gauche et droit pour raidir la voiture en virage sans la raidir sur les bosses symétriques.</li>
        </ol>
        <p className="text-muted">
          Une F1 est extrêmement raide : son fond plat ne fonctionne que si la garde au sol reste stable. Les débattements utiles se comptent en dizaines de millimètres
          <Uncertain>ordre de grandeur</Uncertain>.
        </p>
      </PanelCard>

      <PanelCard title="Push-rod ou pull-rod ?">
        <p>
          <b>Push-rod</b> : la tige part du bas du porte-moyeu et monte vers un culbuteur placé en haut de la coque. Elle travaille en compression, les réglages sont
          accessibles par le dessus.
        </p>
        <p>
          <b>Pull-rod</b> : la tige part du haut du porte-moyeu et descend vers un culbuteur placé en bas. Elle travaille en traction (peut être plus fine et légère), et
          les éléments lourds sont plus bas (centre de gravité), mais l’accès est plus difficile et l’encombrement change le flux d’air vers le fond.
        </p>
        <p className="text-muted">Le choix avant/arrière varie selon les équipes et les règlements ; il dépend surtout de l’aérodynamique et du packaging.</p>
      </PanelCard>

      <PanelCard title="L’inerter (« J-damper »)">
        <p>
          Une vis à billes transforme la translation en rotation d’un petit volant d’inertie : la force produite est proportionnelle à l’<b>accélération relative</b> entre
          la roue et le châssis (F = b·a). Il calme les oscillations de la roue et la variation de charge du pneu sur les bosses.
        </p>
        <p>
          Inventé à l’université de Cambridge, introduit en secret par McLaren vers 2005 (surnommé « J-damper » pour le cacher), puis copié par tout le plateau.
          Il est interdit depuis le règlement 2022, qui a aussi banni les suspensions hydrauliques <Uncertain>à vérifier</Uncertain>. En 2026, les suspensions
          hydrauliques interconnectées restent interdites.
        </p>
      </PanelCard>

      <PanelCard title="Modèle et chiffres">
        <p className="text-muted">
          Modèle « quart de voiture » : masse suspendue {MS} kg, masse non suspendue {MU} kg, raideur à la roue {fmt(KS / 1000)} N/mm, raideur pneu {fmt(KT / 1000)} N/mm,
          amortissement {fmt(C)} N·s/m, inertance {B} kg. Valeurs plausibles mais illustratives <Uncertain>non publiées</Uncertain> : les équipes ne communiquent pas
          leurs réglages.
        </p>
      </PanelCard>
    </>
  )
}
