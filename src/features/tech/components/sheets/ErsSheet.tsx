import { useState } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Card } from '@/components/ui'
import { ERS_ERAS } from '../../content/sheets'
import { Segmented } from '../controls'

type NodeId = 'fuel' | 'ice' | 'wheels' | 'mguk' | 'turbo' | 'mguh' | 'ce' | 'es'
type Phase = 'braking' | 'accel' | 'harvest'
type Era = '2014' | '2026'

const NODES: Record<NodeId, { x: number; y: number; label: string; color: string; sub?: string }> = {
  fuel: { x: 90, y: 60, label: 'Carburant', color: 'var(--color-warn)' },
  ice: { x: 280, y: 140, label: 'V6 (ICE)', color: 'var(--color-text)', sub: '1,6 L turbo' },
  wheels: { x: 90, y: 240, label: 'Roues AR', color: 'var(--color-text)' },
  mguk: { x: 280, y: 250, label: 'MGU-K', color: 'var(--color-info)', sub: 'vilebrequin' },
  turbo: { x: 470, y: 60, label: 'Turbo', color: 'var(--color-warn)', sub: 'gaz d’échappement' },
  mguh: { x: 600, y: 140, label: 'MGU-H', color: 'var(--color-f1)', sub: 'arbre du turbo' },
  ce: { x: 470, y: 250, label: 'Électronique (CE)', color: 'var(--color-muted)' },
  es: { x: 620, y: 250, label: 'Batterie (ES)', color: 'var(--color-ok)' },
}

type Edge = [NodeId, NodeId]

const FLOWS: Record<Era, Record<Phase, Edge[]>> = {
  '2014': {
    braking: [
      ['wheels', 'mguk'],
      ['mguk', 'ce'],
      ['ce', 'es'],
    ],
    accel: [
      ['fuel', 'ice'],
      ['ice', 'wheels'],
      ['ice', 'turbo'],
      ['turbo', 'mguh'],
      ['mguh', 'ce'],
      ['es', 'ce'],
      ['ce', 'mguk'],
      ['mguk', 'wheels'],
    ],
    harvest: [
      ['fuel', 'ice'],
      ['ice', 'wheels'],
      ['ice', 'turbo'],
      ['turbo', 'mguh'],
      ['mguh', 'ce'],
      ['ce', 'es'],
    ],
  },
  '2026': {
    braking: [
      ['wheels', 'mguk'],
      ['mguk', 'ce'],
      ['ce', 'es'],
    ],
    accel: [
      ['fuel', 'ice'],
      ['ice', 'wheels'],
      ['ice', 'turbo'],
      ['es', 'ce'],
      ['ce', 'mguk'],
      ['mguk', 'wheels'],
    ],
    harvest: [
      ['fuel', 'ice'],
      ['ice', 'mguk'],
      ['ice', 'wheels'],
      ['mguk', 'ce'],
      ['ce', 'es'],
    ],
  },
}

const PHASE_TEXT: Record<Era, Record<Phase, string>> = {
  '2014': {
    braking: 'Au freinage, le MGU-K agit comme un générateur sur l’essieu arrière : jusqu’à 2 MJ par tour sont stockés dans la batterie.',
    accel: 'À l’accélération, le MGU-K restitue jusqu’à 120 kW (≈ 160 ch). Le MGU-H, entraîné par les gaz d’échappement, alimente directement le MGU-K et maintient le turbo en régime.',
    harvest: 'Même à fond, le MGU-H récupère l’énergie des gaz d’échappement qui serait sinon perdue, et recharge la batterie sans limite d’énergie.',
  },
  '2026': {
    braking: 'Au freinage, le MGU-K de 350 kW récupère beaucoup plus d’énergie qu’avant : jusqu’à 8,5 MJ par tour. Le brake-by-wire dose le freinage hydraulique en complément.',
    accel: 'À l’accélération, la batterie délivre jusqu’à 350 kW (≈ 475 ch) au MGU-K, autant ou presque que le V6 (≈ 400 kW) : la voiture est hybride à environ 50/50.',
    harvest: 'Sans MGU-H, la recharge hors freinage se fait en utilisant le V6 pour entraîner le MGU-K en générateur (par exemple en fin de ligne droite ou en léger lever de pied).',
  },
}

const SOC_DELTA: Record<Phase, number> = { braking: 1, accel: -1, harvest: 0.5 }

export function ErsSheet() {
  const [era, setEra] = useState<Era>('2026')
  const [phase, setPhase] = useState<Phase>('braking')
  const active = FLOWS[era][phase]
  const isActive = (a: NodeId, b: NodeId) => active.some(([x, y]) => x === a && y === b)
  const info = ERS_ERAS.find((e) => e.id === era)!
  const soc = 50 + SOC_DELTA[phase] * 28

  const allEdges: Edge[] = [
    ['fuel', 'ice'],
    ['ice', 'wheels'],
    ['ice', 'turbo'],
    ['turbo', 'mguh'],
    ['mguh', 'ce'],
    ['wheels', 'mguk'],
    ['mguk', 'wheels'],
    ['ice', 'mguk'],
    ['mguk', 'ce'],
    ['ce', 'mguk'],
    ['ce', 'es'],
    ['es', 'ce'],
  ]

  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-text/90">
        Le groupe propulseur d’une F1 est hybride : un V6 turbo de 1,6 litre et un système de récupération d’énergie (ERS, Energy Recovery System). L’énergie
        cinétique perdue au freinage, et jusqu’en 2025 l’énergie thermique des gaz d’échappement, est convertie en électricité, stockée, puis réinjectée.
      </p>

      <Card title="Flux d’énergie">
        <div className="mb-3 flex flex-wrap gap-3">
          <Segmented<Era>
            label="Époque"
            value={era}
            onChange={setEra}
            options={[
              { value: '2014', label: '2014-2025' },
              { value: '2026', label: '2026' },
            ]}
          />
          <Segmented<Phase>
            label="Phase"
            value={phase}
            onChange={setPhase}
            options={[
              { value: 'braking', label: 'Freinage' },
              { value: 'accel', label: 'Accélération' },
              { value: 'harvest', label: 'Recharge à fond / lever de pied' },
            ]}
          />
        </div>
        <svg viewBox="0 0 700 300" className="w-full" role="img" aria-label="Schéma des flux d’énergie">
          {allEdges.map(([a, b]) => {
            if ((a === 'mguh' || b === 'mguh') && era === '2026') return null
            const on = isActive(a, b)
            if (!on && allEdges.some(([x, y]) => x === b && y === a && isActive(x, y))) return null
            const A = NODES[a]
            const B = NODES[b]
            const reverse = allEdges.findIndex(([x, y]) => x === b && y === a) >= 0
            const off = reverse ? (a < b ? 6 : -6) : 0
            const d = `M${A.x + off} ${A.y + off} L${B.x + off} ${B.y + off}`
            return (
              <path
                key={`${a}-${b}`}
                d={d}
                fill="none"
                stroke={on ? 'var(--color-accent)' : 'var(--color-border)'}
                strokeWidth={on ? 3 : 1.5}
                strokeDasharray={on ? '8 8' : undefined}
                opacity={on ? 1 : 0.5}
              >
                {on && <animate attributeName="stroke-dashoffset" from="32" to="0" dur="0.6s" repeatCount="indefinite" />}
              </path>
            )
          })}
          {(Object.keys(NODES) as NodeId[]).map((id) => {
            const n = NODES[id]
            const removed = id === 'mguh' && era === '2026'
            return (
              <g key={id} opacity={removed ? 0.35 : 1}>
                <rect x={n.x - 58} y={n.y - 20} width={116} height={40} rx={8} className="fill-surface-2" stroke={n.color} strokeWidth={1.5} />
                <text x={n.x} y={n.y + (n.sub ? -2 : 4)} textAnchor="middle" className="fill-text text-[12px] font-bold">
                  {n.label}
                </text>
                {n.sub && (
                  <text x={n.x} y={n.y + 12} textAnchor="middle" className="fill-muted text-[9px]">
                    {n.sub}
                  </text>
                )}
                {removed && (
                  <line x1={n.x - 50} y1={n.y + 14} x2={n.x + 50} y2={n.y - 14} stroke="var(--color-f1)" strokeWidth={2.5} />
                )}
              </g>
            )
          })}
          {/* battery state of charge */}
          <rect x={572} y={282} width={96} height={10} rx={3} className="fill-bg stroke-border" />
          <motion.rect x={573} y={283} height={8} rx={2} className="fill-ok" animate={{ width: (94 * soc) / 100 }} transition={{ duration: 1.2 }} />
          <text x={566} y={291} textAnchor="end" className="fill-muted text-[9px]">
            charge
          </text>
        </svg>
        <p className="mt-2 min-h-12 text-sm text-text/90">{PHASE_TEXT[era][phase]}</p>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {ERS_ERAS.map((e) => (
          <Card key={e.id} title={e.label} className={clsx(e.id === era && 'border-accent/60')}>
            <dl className="grid grid-cols-2 gap-2 text-sm">
              {[
                ['Moteur thermique', e.ice],
                ['MGU-K', e.mguk],
                ['MGU-H', e.mguh],
                ['Récupération', e.harvest],
                ['Déploiement', e.deploy],
              ].map(([k, v]) => (
                <div key={k} className="rounded-md bg-bg/60 p-2">
                  <dt className="text-[11px] text-muted">{k}</dt>
                  <dd className="font-mono font-bold text-accent">{v}</dd>
                </div>
              ))}
            </dl>
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-text/90">
              {e.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>
      <p className="text-xs text-muted">
        {info.label} : chiffres issus du règlement technique FIA (puissance du MGU-K, énergie récupérable) ; la puissance du moteur thermique est une
        estimation publique, les motoristes ne la communiquent pas.
      </p>
    </div>
  )
}
