import { useEffect, useState } from 'react'
import { motion, useSpring, useTransform } from 'motion/react'
import { Card } from '@/components/ui'
import { computeAero, G } from '../../airflow/aeroModel'
import { Segmented } from '../controls'

/** Inverted NACA-like airfoil as an SVG path, leading edge at (0,0), chord along +x, camber towards +y (down). */
function airfoilPath(chord: number, t = 0.12, m = 0.08) {
  const up: string[] = []
  const lo: string[] = []
  const n = 24
  for (let i = 0; i <= n; i++) {
    const x = (1 - Math.cos((i / n) * Math.PI)) / 2
    const yt = 5 * t * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4)
    const p = 0.4
    const yc = x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / (1 - p) ** 2) * (1 - 2 * p + 2 * p * x - x * x)
    up.push(`${(x * chord).toFixed(1)},${((yc - yt) * chord).toFixed(1)}`)
    lo.push(`${(x * chord).toFixed(1)},${((yc + yt) * chord).toFixed(1)}`)
  }
  return `M${up.join(' L')} L${lo.reverse().join(' L')} Z`
}

const MAIN = airfoilPath(210)
const FLAP_CHORD = 130
const FLAP = airfoilPath(FLAP_CHORD, 0.1, 0.09)
const PIVOT = { x: 493, y: -7 }

const FLOW_CLOSED = [
  'M0 70 C 120 70, 220 60, 300 40 S 480 -10, 600 -30',
  'M0 110 C 120 110, 220 104, 320 80 S 480 30, 600 10',
  'M0 150 C 120 152, 220 160, 320 140 S 480 90, 600 70',
  'M0 190 C 140 192, 260 198, 360 180 S 500 150, 600 140',
]
const FLOW_OPEN = [
  'M0 70 C 120 70, 220 66, 300 62 S 480 50, 600 46',
  'M0 110 C 120 110, 220 108, 320 100 S 480 88, 600 84',
  'M0 150 C 120 151, 220 156, 320 146 S 480 128, 600 122',
  'M0 190 C 140 191, 260 194, 360 186 S 500 172, 600 168',
]

export function DrsSheet() {
  const [mode, setMode] = useState<'closed' | 'open'>('closed')
  const open = mode === 'open'
  const angle = useSpring(open ? -6 : -34, { stiffness: 90, damping: 14 })
  useEffect(() => angle.set(open ? -6 : -34), [open, angle])
  const flapTransform = useTransform(angle, (a) => `translate(${PIVOT.x} ${PIVOT.y}) rotate(${a}) translate(${-FLAP_CHORD} 0)`)

  const closedAero = computeAero({ speedKmh: 300, open: false, rideHeightMm: 30 })
  const openAero = computeAero({ speedKmh: 300, open: true, rideHeightMm: 30 })
  const a = open ? openAero : closedAero

  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-text/90">
        L’aileron arrière produit beaucoup d’appui, mais aussi beaucoup de traînée. En ligne droite, l’appui est inutile : ouvrir le volet supérieur
        « couche » l’aileron, la traînée chute et la vitesse de pointe augmente. C’est le principe du <strong>DRS</strong> (2011-2025), généralisé en
        2026 sous forme d’<strong>aérodynamique active</strong> sur les deux ailerons.
      </p>

      <Card title="Profil de l’aileron arrière">
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <Segmented
            label="Position du volet"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'closed', label: 'Fermé · mode Z (virage)' },
              { value: 'open', label: 'Ouvert · DRS / mode X' },
            ]}
          />
          <span className="text-xs text-muted">Ouverture DRS maximale : 85 mm entre les éléments.</span>
        </div>
        <svg viewBox="-20 -60 640 280" className="w-full" role="img" aria-label="Aileron arrière, volet ouvert ou fermé">
          {(open ? FLOW_OPEN : FLOW_CLOSED).map((d, i) => (
            <motion.path
              key={i}
              initial={false}
              animate={{ d }}
              transition={{ duration: 0.6 }}
              fill="none"
              stroke="var(--color-accent)"
              strokeOpacity={0.55}
              strokeWidth={2}
              strokeDasharray="10 12"
            >
              <animate attributeName="stroke-dashoffset" from="44" to="0" dur={open ? '0.5s' : '0.8s'} repeatCount="indefinite" />
            </motion.path>
          ))}
          <g transform="translate(190 112) rotate(-9)">
            <path d={MAIN} className="fill-surface-2 stroke-muted" strokeWidth={1.5} />
          </g>
          <motion.g transform={flapTransform}>
            <path d={FLAP} className="fill-f1" />
          </motion.g>
          <circle cx={PIVOT.x} cy={PIVOT.y} r={4} className="fill-warn" />
          <text x={PIVOT.x + 8} y={PIVOT.y - 6} className="fill-warn text-[11px]">pivot</text>
          <text x={200} y={175} className="fill-muted text-[11px]">plan principal (fixe)</text>
          <text x={330} y={-30} className="fill-f1 text-[11px] font-bold">volet mobile</text>
          <text x={0} y={215} className="fill-muted text-[11px]">→ air (la voiture roule vers la gauche)</text>
        </svg>
        <div className="mt-3 grid grid-cols-2 gap-3 md:grid-cols-4">
          <Metric label="Appui à 300 km/h" value={`${Math.round(a.downforceN / G)} kgf`} delta={((a.downforceN - closedAero.downforceN) / closedAero.downforceN) * 100} />
          <Metric label="Traînée à 300 km/h" value={`${Math.round(a.dragN)} N`} delta={((a.dragN - closedAero.dragN) / closedAero.dragN) * 100} />
          <Metric label="Puissance absorbée" value={`${Math.round(a.dragPowerKw)} kW`} delta={((a.dragPowerKw - closedAero.dragPowerKw) / closedAero.dragPowerKw) * 100} />
          <Metric label="Équilibre avant" value={`${a.frontPct.toFixed(1)} %`} />
        </div>
        <p className="mt-2 text-xs text-muted">Valeurs issues du modèle simplifié de la soufflerie (ordres de grandeur).</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Le DRS (2011-2025)">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-text/90">
            <li>Utilisable uniquement dans des <strong>zones</strong> définies (souvent les grandes lignes droites).</li>
            <li>
              En course, il faut être à <strong>moins d’une seconde</strong> de la voiture qui précède au <strong>point de détection</strong>.
            </li>
            <li>Activé à partir du 3ᵉ tour (deux tours après le départ ou une neutralisation), désactivable par la direction de course (pluie, incidents).</li>
            <li>Libre en essais et en qualifications dans les zones.</li>
            <li>Le volet se referme automatiquement dès que le pilote freine ou appuie sur le bouton.</li>
            <li>Gain typique : 10 à 15 km/h en bout de ligne droite.</li>
          </ul>
        </Card>
        <Card title="2026 : aéro active et Manual Override">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-text/90">
            <li>
              <strong>Mode Z (« Corner Mode »)</strong> : volets fermés, appui maximal, utilisé par défaut.
            </li>
            <li>
              <strong>Mode X (« Straight Line Mode »)</strong> : volets avant <em>et</em> arrière ouverts sur les lignes droites désignées, pour
              <strong> tous</strong> les pilotes, plus seulement l’attaquant.
            </li>
            <li>Ouvrir les deux ailerons ensemble évite de déséquilibrer la voiture (sinon l’avant deviendrait trop appuyé).</li>
            <li>
              Le dépassement repose sur le <strong>Manual Override Mode</strong> : à moins d’une seconde, le pilote dispose d’un surplus d’énergie
              électrique et de puissance du MGU-K plus longtemps en haut de ligne droite.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  )
}

function Metric({ label, value, delta }: { label: string; value: string; delta?: number }) {
  return (
    <div className="rounded-lg border border-border bg-bg/60 p-3">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted">{label}</div>
      <div className="font-mono text-lg font-bold">{value}</div>
      {delta !== undefined && Math.abs(delta) > 0.5 && (
        <div className={delta < 0 ? 'text-xs font-bold text-accent' : 'text-xs font-bold text-f1'}>
          {delta > 0 ? '+' : ''}
          {delta.toFixed(0)} % vs fermé
        </div>
      )}
    </div>
  )
}
