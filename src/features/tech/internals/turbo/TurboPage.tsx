import { lazy, useEffect } from 'react'
import { Segmented, Slider, Switch } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { fmt, useMechStore, useTick } from '../store'
import { BOOST_TARGET, HIST, N_MAX, stepTurbo, turboSim, useTurboUi, type TurboScenario } from './sim'

const TurboScene = lazy(() => import('./TurboScene'))

export default function TurboPage() {
  useEffect(() => useMechStore.getState().set({ speed: 0.25 }), [])
  return (
    <MechShell
      Scene={TurboScene}
      camera={{ position: [1.6, 1.5, 4.6], fov: 40 }}
      step={stepTurbo}
      controls={<Controls />}
      panel={<Panel />}
      hud={<Hud />}
    />
  )
}

function Controls() {
  const ui = useTurboUi()
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="space-y-3">
        <div>
          <div className="mb-1.5 text-sm font-semibold">Scénario</div>
          <Segmented<TurboScenario>
            label="Scénario"
            value={ui.scenario}
            options={[
              { value: 'relance', label: 'Lever de pied puis relance' },
              { value: 'manuel', label: 'Pédale manuelle' },
            ]}
            onChange={(v) => ui.set({ scenario: v })}
          />
        </div>
        {ui.scenario === 'manuel' && (
          <Slider label="Pédale d’accélérateur" value={Math.round(ui.throttle * 100)} min={0} max={100} unit=" %" onChange={(v) => ui.set({ throttle: v / 100 })} />
        )}
      </div>
      <div className="space-y-1">
        <Switch
          checked={ui.antiLag}
          onChange={(v) => ui.set({ antiLag: v })}
          label="Stratégie « anti-lag » au lever de pied"
          desc="Papillons entrouverts + allumage retardé : des gaz chauds continuent d’entraîner la turbine."
        />
        <Switch
          checked={ui.mgukFill}
          onChange={(v) => ui.set({ mgukFill: v })}
          label="Le MGU-K comble le trou de couple"
          desc="Pendant que le turbo reprend ses tours, l’électrique fournit le couple manquant."
        />
      </div>
    </div>
  )
}

function Hud() {
  useTick(12)
  return (
    <div className="rounded-md bg-bg/85 px-2.5 py-1.5 font-mono text-xs ring-1 ring-border">
      <div>
        <span className="text-muted">Turbo </span>
        <span className="font-bold text-accent">{fmt(Math.round(turboSim.n / 1000) * 1000)} tr/min</span>
        <span className="text-muted"> · pression </span>
        <span className="font-bold text-text">{fmt(turboSim.boost, 2)} bar abs.</span>
      </div>
      <div className="text-muted">Rotation affichée très ralentie (proportionnelle à la vitesse réelle)</div>
    </div>
  )
}

function narrate(): { text: string; tone: 'accent' | 'warn' | 'f1' | 'ok' | 'info' } {
  const s = turboSim
  const r = s.n / N_MAX
  if (s.throttle < 0.5) {
    return {
      tone: 'info',
      text:
        useTurboUi.getState().antiLag && r > 0.5
          ? `Lever de pied : le débit de gaz chute mais la turbine tourne encore à ${fmt(Math.round(s.n / 1000))} 000 tr/min grâce à l’anti-lag. La pression retombe à ${fmt(s.boost, 1)} bar.`
          : `Lever de pied : presque plus de gaz d’échappement, la turbine ralentit (${fmt(Math.round(s.n / 1000))} 000 tr/min) et la pression de suralimentation s’effondre (${fmt(s.boost, 1)} bar).`,
    }
  }
  if (s.wastegate > 0.15)
    return {
      tone: 'f1',
      text: `Pression cible atteinte (${fmt(s.boost, 2)} bar) : la wastegate s’ouvre à ${fmt(s.wastegate * 100)} % et dévie une partie des gaz autour de la turbine pour ne pas la faire accélérer davantage.`,
    }
  if (s.boost < BOOST_TARGET - 0.4)
    return {
      tone: 'warn',
      text: `Temps de réponse : pied au plancher, mais la turbine doit d’abord reprendre des tours (${fmt(Math.round(s.n / 1000))} 000 tr/min). Pression ${fmt(s.boost, 1)} bar seulement : le V6 ne délivre que ${fmt(s.iceTorque * 100)} % de son couple${s.mguk > 0.02 ? `, le MGU-K comble ${fmt(s.mguk * 100)} %` : ''}.`,
    }
  return {
    tone: 'accent',
    text: `Régime établi : les gaz chauds font tourner la turbine, qui entraîne le compresseur sur le même arbre ; l’air est comprimé à ${fmt(s.boost, 1)} bar puis refroidi dans l’échangeur avant le plenum.`,
  }
}

function Panel() {
  useTick(10)
  const n = narrate()
  return (
    <>
      <PanelCard title="En ce moment">
        <Narration tone={n.tone}>{n.text}</Narration>
        <LagChart />
        <div className="grid grid-cols-2 gap-2">
          <Fig label="Régime turbo" value={fmt(Math.round(turboSim.n / 1000) * 1000)} unit="tr/min" />
          <Fig label="Pression" value={fmt(turboSim.boost, 2)} unit="bar abs." />
          <Fig label="Wastegate" value={fmt(turboSim.wastegate * 100)} unit="%" />
          <Fig label="Couple V6" value={fmt(turboSim.iceTorque * 100)} unit="%" note={turboSim.mguk > 0.01 ? `+ ${fmt(turboSim.mguk * 100)} % MGU-K` : undefined} />
        </div>
      </PanelCard>
      <PanelCard title="Comment ça marche">
        <p>
          Les gaz d’échappement (≈ 900-1 000 °C <Uncertain />) entrent tangentiellement dans la <b>volute</b> de la turbine, accélèrent vers son centre et la font tourner, puis sortent
          dans l’axe. Sur le même arbre, le <b>compresseur</b> aspire l’air frais par son œil et le projette vers l’extérieur : la volute transforme cette vitesse en pression.
        </p>
        <p>
          Le turbo récupère ainsi une énergie sinon perdue, et permet à un petit 1,6 L de respirer comme un gros moteur. La <b>wastegate</b> limite la pression en laissant une partie
          des gaz contourner la turbine.
        </p>
      </PanelCard>
      <PanelCard title="2026 : plus de MGU-H, retour du « turbo lag »">
        <p>
          De 2014 à 2025, le <b>MGU-H</b> (moteur électrique sur l’arbre du turbo) pouvait lancer le compresseur instantanément : pas de temps de réponse. Il est supprimé en 2026 (trop
          coûteux et complexe, sans intérêt pour la route).
        </p>
        <p>Pour limiter le temps de réponse, les motoristes jouent sur :</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>
            le <b>MGU-K</b> de 350 kW, qui fournit le couple pendant que le turbo reprend ses tours ;
          </li>
          <li>des turbos plus petits et plus légers (moins d’inertie), au prix d’un peu de puissance à haut régime ;</li>
          <li>
            des cartographies qui gardent la turbine en rotation au lever de pied (papillons entrouverts, allumage retardé) : l’« anti-lag », encadré par le règlement <Uncertain />.
          </li>
        </ul>
        <p className="text-xs text-muted">
          Régime maximal du turbo ≈ 125 000 tr/min (limite 2014-2025 ; valeur 2026 <Uncertain />). Pression de suralimentation plafonnée vers 4,8 bar abs. en 2026 <Uncertain />. Un seul étage
          de compression et une seule turbine sont autorisés. Les constantes de temps de cette animation sont illustratives.
        </p>
      </PanelCard>
    </>
  )
}

/** Boost and torque over the last seconds. */
function LagChart() {
  const h = turboSim.history
  const W = 320
  const H = 96
  if (h.length < 2) return null
  const x = (i: number) => (i / (HIST - 1)) * W
  const yB = (b: number) => H - 6 - ((b - 1) / (BOOST_TARGET - 1)) * (H - 16)
  const yT = (t: number) => H - 6 - t * (H - 16)
  const line = (f: (k: (typeof h)[number]) => number) => h.map((k, i) => `${i ? 'L' : 'M'}${x(i + HIST - h.length).toFixed(1)},${f(k).toFixed(1)}`).join(' ')
  const area = h.map((k, i) => `${i ? 'L' : 'M'}${x(i + HIST - h.length).toFixed(1)},${yT(k.ice + k.mguk).toFixed(1)}`).join(' ') +
    ' ' + [...h].reverse().map((k, i) => `L${x(HIST - 1 - i).toFixed(1)},${yT(k.ice).toFixed(1)}`).join(' ') + ' Z'
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded border border-border bg-bg/60" role="img" aria-label="Pression de suralimentation et couple sur les dernières secondes">
        <path d={area} fill="var(--color-info)" opacity={0.35} />
        <path d={line((k) => yT(k.throttle))} fill="none" stroke="var(--color-muted)" strokeDasharray="3 3" strokeWidth={1.2} />
        <path d={line((k) => yB(k.boost))} fill="none" stroke="var(--color-accent)" strokeWidth={2} />
        <path d={line((k) => yT(k.ice))} fill="none" stroke="var(--color-warn)" strokeWidth={1.5} />
      </svg>
      <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-muted">
        <span><span className="text-accent">━</span> pression</span>
        <span><span className="text-warn">━</span> couple V6</span>
        <span><span className="text-info">■</span> appoint MGU-K</span>
        <span>┄ pédale</span>
      </div>
    </div>
  )
}
