import { lazy } from 'react'
import clsx from 'clsx'
import { Segmented, Slider, Switch } from '../../components/controls'
import { Fig, MechShell, Narration, PanelCard, Uncertain } from '../shell/MechShell'
import { fmt, useTick } from '../store'
import { brakeSim, MGUK_MAX, REAR_SHARE, stepBrakes, useBrakeStore, type BrakeMode, type BrakePhase } from './sim'
import { glowFor } from './thermal'

const BrakesScene = lazy(() => import('./BrakesScene'))

const PHASE_LABEL: Record<BrakePhase, string> = {
  relance: 'Relance',
  ligne: 'Ligne droite',
  freinage: 'Freinage',
  virage: 'Virage',
}

export default function BrakesPage() {
  return (
    <MechShell
      Scene={BrakesScene}
      camera={{ position: [4.6, 3.1, 2.9], fov: 36 }}
      step={stepBrakes}
      onNudge={() => stepBrakes(0.05)}
      nudgeLabel="+ 50 ms"
      controls={<Controls />}
      hud={<Hud />}
      panel={<Panel />}
    />
  )
}

function Controls() {
  const { mode, pedal, batteryFull, set } = useBrakeStore()
  return (
    <div className="grid gap-4 md:grid-cols-[auto_1fr_1fr] md:items-start">
      <div>
        <div className="mb-1.5 text-sm font-semibold">Scénario</div>
        <Segmented<BrakeMode>
          label="Scénario"
          value={mode}
          onChange={(v) => set({ mode: v })}
          options={[
            { value: 'cycle', label: 'Freinage type (boucle)' },
            { value: 'manuel', label: 'Pédale manuelle' },
          ]}
        />
      </div>
      <div className={clsx(mode !== 'manuel' && 'pointer-events-none opacity-50')}>
        <Slider
          label="Pédale de frein"
          value={Math.round(pedal * 100)}
          min={0}
          max={100}
          unit=" %"
          onChange={(v) => set({ pedal: v / 100 })}
          hint="Mode manuel : 0 % = accélérateur à fond, sinon freinage."
        />
      </div>
      <Switch
        checked={batteryFull}
        onChange={(v) => set({ batteryFull: v })}
        label="Batterie pleine"
        desc="Le MGU-K ne peut plus récupérer : le brake-by-wire bascule tout le freinage arrière sur l’hydraulique."
      />
    </div>
  )
}

function Hud() {
  useTick(10)
  const s = brakeSim
  const kmh = s.v * 3.6
  return (
    <>
      <HudChip label="Vitesse" value={fmt(kmh)} unit="km/h" />
      <HudChip label={s.accelG < 0 ? 'Décélération' : 'Accélération'} value={fmt(Math.abs(s.accelG), 1)} unit="g" tone={s.accelG < -0.5 ? 'f1' : 'text'} />
      <HudChip label="Disque AR" value={fmt(s.temp)} unit="°C" tone={s.temp > 650 ? 'warn' : 'text'} />
      <div className="hidden min-w-[220px] flex-1 rounded-md bg-bg/85 px-2 py-1.5 ring-1 ring-border sm:block md:max-w-[340px]">
        <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-muted">Freinage essieu arrière</div>
        <SplitBar />
      </div>
    </>
  )
}

function HudChip({ label, value, unit, tone = 'text' }: { label: string; value: string; unit: string; tone?: 'text' | 'f1' | 'warn' }) {
  return (
    <div className="rounded-md bg-bg/85 px-2 py-1 ring-1 ring-border">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className={clsx('font-mono text-sm font-bold', tone === 'f1' ? 'text-f1' : tone === 'warn' ? 'text-warn' : 'text-text')}>
        {value}
        <span className="ml-1 text-[10px] text-muted">{unit}</span>
      </div>
    </div>
  )
}

/** Rear axle braking power split: MGU-K (regeneration) vs hydraulic. */
function SplitBar() {
  const s = brakeSim
  const total = s.pRear
  const kPct = total > 1000 ? (s.pMguk / total) * 100 : 0
  const hPct = total > 1000 ? 100 - kPct : 0
  return (
    <div>
      <div className="flex h-3 overflow-hidden rounded bg-surface-2" role="img" aria-label={`MGU-K ${fmt(kPct)} %, hydraulique ${fmt(hPct)} %`}>
        <div className="bg-info transition-[width] duration-100" style={{ width: `${kPct}%` }} />
        <div className="bg-warn transition-[width] duration-100" style={{ width: `${hPct}%` }} />
      </div>
      <div className="mt-1 flex justify-between font-mono text-[11px]">
        <span className="text-info">MGU-K {fmt(s.pMguk / 1000)} kW</span>
        <span className="text-warn">hydraulique {fmt(s.pHydRear / 1000)} kW</span>
      </div>
    </div>
  )
}

function narration(phase: BrakePhase, batteryFull: boolean) {
  const s = brakeSim
  const kmh = fmt(s.v * 3.6)
  const t = fmt(s.temp)
  switch (phase) {
    case 'relance':
      return (
        <>
          <b>Relance</b> à {kmh} km/h. Pédale relâchée : les joints carrés des pistons les font reculer d’une fraction de millimètre, les plaquettes se décollent.
          Le MGU-K repasse en moteur et pousse ({fmt(s.pDeploy / 1000)} kW). L’écope envoie de l’air frais au centre du disque : il ressort, chaud, par les
          canaux radiaux. Disque à {t} °C.
        </>
      )
    case 'ligne':
      return (
        <>
          <b>Ligne droite</b> à {kmh} km/h. Aucun frein : le disque refroidit ({t} °C). S’il descend trop bas (sous ≈ 350 °C), le carbone mord mal au
          prochain freinage ; s’il reste trop chaud, il s’oxyde et s’use vite. Les équipes jouent sur la taille des écopes à chaque circuit.
        </>
      )
    case 'freinage':
      return (
        <>
          <b>Gros freinage</b> : {fmt(Math.abs(s.accelG), 1)} g à {kmh} km/h. La voiture dissipe {fmt(s.pTotal / 1e6, 1)} MW, dont {fmt(REAR_SHARE * 100)} % à l’arrière.{' '}
          {batteryFull || s.pMguk < 1000 ? (
            <>Batterie pleine : le MGU-K ne récupère rien, l’hydraulique arrière fait tout le travail.</>
          ) : s.pHydRear < 1000 ? (
            <>À cette vitesse, le MGU-K ({fmt(s.pMguk / 1000)} kW) suffit pour l’essieu arrière : les plaquettes arrière ne serrent presque plus.</>
          ) : (
            <>
              Le MGU-K plafonne à {fmt(s.pMguk / 1000)} kW ; le brake-by-wire complète avec {fmt(s.pHydRear / 1000)} kW de freinage hydraulique.
            </>
          )}{' '}
          Les 6 pistons serrent, le disque monte à {t} °C et rougit.
        </>
      )
    case 'virage':
      return (
        <>
          <b>Entrée de virage</b> à {kmh} km/h : le pilote relâche progressivement la pédale (trail braking) pour garder du poids sur l’avant. Le disque, à {t} °C,
          commence à refroidir avant la relance.
        </>
      )
  }
}

function Panel() {
  useTick(8)
  const batteryFull = useBrakeStore((s) => s.batteryFull)
  const s = brakeSim
  const tone = s.phase === 'freinage' ? 'f1' : s.phase === 'virage' ? 'warn' : 'accent'
  return (
    <>
      <PanelCard title={`En ce moment · ${PHASE_LABEL[s.phase]}`}>
        <Narration tone={tone}>{narration(s.phase, batteryFull)}</Narration>
        <div className="grid grid-cols-2 gap-2">
          <Fig label="Puissance de freinage" value={fmt(s.pTotal / 1e6, 2)} unit="MW" note="voiture entière" />
          <Fig label="Pression étrier AR" value={fmt(s.pressure)} unit="bar" note={<>ordre de grandeur <Uncertain /></>} />
          <Fig label="Batterie" value={fmt(s.soc * 100)} unit="%" note="fenêtre utile ≈ 4 MJ" />
          <Fig label="Pic récent" value={fmt(s.peakTemp)} unit="°C" note="disque arrière" />
        </div>
        <TempScale temp={s.temp} />
      </PanelCard>

      <PanelCard title="Brake-by-wire à l’arrière">
        <SplitBar />
        <p>
          Le pilote ne commande pas directement les freins arrière. Sa pédale actionne un maître-cylindre ; un calculateur lit la demande, retranche le couple déjà
          fourni par le MGU-K en récupération (jusqu’à {fmt(MGUK_MAX / 1000)} kW en 2026) et pilote une valve qui envoie juste la pression manquante aux étriers
          arrière.
        </p>
        <p>
          But : une pédale et un équilibre avant/arrière constants pour le pilote, alors que la récupération varie à chaque instant (vitesse, état de charge,
          limite d’énergie récupérable par tour). Un circuit de secours reprend la main en cas de panne. Les freins avant restent purement hydrauliques.
        </p>
      </PanelCard>

      <PanelCard title="Repères">
        <ul className="list-disc space-y-1 pl-4">
          <li>Disques et plaquettes en carbone-carbone, efficaces entre ≈ 350 et 1 000 °C ; pointes au-delà <Uncertain />.</li>
          <li>Disque arrière ≈ Ø 280 mm, épaisseur max. 32 mm ; avant ≈ Ø 330 mm <Uncertain>approx.</Uncertain>.</li>
          <li>
            Ventilation : environ 1 000 à 1 500 canaux percés par disque selon le circuit (ici 1 056) <Uncertain />.
          </li>
          <li>Étrier monobloc en aluminium, 6 pistons maximum, 2 plaquettes par roue (règlement). Pistons de diamètres croissants pour une usure régulière.</li>
          <li>
            Décélération de plus de 5 g ; de ≈ 320 à ≈ 100 km/h en ≈ 2 s et une centaine de mètres <Uncertain>selon circuit</Uncertain>. Le pilote pousse la
            pédale à plus de 100 kg <Uncertain />.
          </li>
          <li>Modèle simplifié : masse 800 kg, 42 % du freinage à l’arrière, échauffement et refroidissement du premier ordre.</li>
        </ul>
      </PanelCard>
    </>
  )
}

/** Temperature scale of the disc with the current value. */
function TempScale({ temp }: { temp: number }) {
  const min = 200
  const max = 1100
  const stops = [300, 450, 600, 750, 900, 1050]
    .map((t) => {
      const [c] = glowFor(t)
      return `#${c.getHexString()} ${((t - min) / (max - min)) * 100}%`
    })
    .join(', ')
  const pos = Math.min(100, Math.max(0, ((temp - min) / (max - min)) * 100))
  return (
    <div className="pt-1">
      <div className="mb-1 flex justify-between text-[11px] text-muted">
        <span>Température du disque</span>
        <span className="font-mono">fenêtre ≈ 350-1 000 °C</span>
      </div>
      {/* colours = incandescence rendered in the 3D scene */}
      <div className="relative h-2.5 rounded bg-surface-2" style={{ backgroundImage: `linear-gradient(90deg, ${stops})` }}>
        <div className="absolute -top-1 h-4.5 w-1 -translate-x-1/2 rounded bg-text ring-2 ring-bg" style={{ left: `${pos}%` }} />
      </div>
      <div className="mt-0.5 flex justify-between font-mono text-[10px] text-muted">
        <span>200 °C</span>
        <span>650</span>
        <span>1 100 °C</span>
      </div>
    </div>
  )
}
