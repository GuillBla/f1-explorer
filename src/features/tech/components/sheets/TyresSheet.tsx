import { useMemo, useState } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Card } from '@/components/ui'
import { COMPOUNDS, WET_TYRES, type Compound } from '../../content/sheets'
import { Slider } from '../controls'

const T_MIN = 40
const T_MAX = 160
const W = 560
const H = 200

/** Relative grip vs temperature: plateau in the window, falling off on both sides (illustrative). */
function grip(c: Compound, t: number) {
  const [a, b] = c.window
  const peak = 0.75 + c.grip * 0.05
  if (t < a) return peak * Math.exp(-(((a - t) / 28) ** 2))
  if (t > b) return peak * Math.exp(-(((t - b) / 18) ** 2))
  return peak
}

function state(c: Compound, t: number) {
  const [a, b] = c.window
  if (t < a - 25) return { tone: 'text-info', title: 'Pneu froid', text: 'La gomme reste dure et glisse en surface : peu d’adhérence et risque de grainage (des petits rouleaux de gomme arrachés qui se recollent sur la bande de roulement).' }
  if (t < a) return { tone: 'text-info', title: 'Sous la fenêtre', text: 'Le pneu monte en température. Le pilote zigzague ou freine plus fort pour l’aider à chauffer (tour de sortie, restart).' }
  if (t <= b) return { tone: 'text-ok', title: 'Dans la fenêtre', text: 'La gomme est viscoélastique : elle épouse les aspérités de l’asphalte (adhésion) et se déforme (hystérésis). Adhérence maximale.' }
  if (t < b + 15) return { tone: 'text-warn', title: 'Surchauffe', text: 'La gomme se ramollit trop, glisse et s’use vite. Le pilote doit ménager ses pneus (lever de pied, trajectoires plus douces).' }
  return { tone: 'text-f1', title: 'Dégradation thermique', text: 'Au-delà, des cloques (blistering) peuvent apparaître : la gomme bout sous la surface et arrache des morceaux de bande de roulement.' }
}

const x = (t: number) => ((t - T_MIN) / (T_MAX - T_MIN)) * W
const y = (g: number) => H - g * (H - 20)

export function TyresSheet() {
  const [id, setId] = useState('C3')
  const [temp, setTemp] = useState(100)
  const c = COMPOUNDS.find((k) => k.id === id)!
  const path = useMemo(() => {
    const p: string[] = []
    for (let t = T_MIN; t <= T_MAX; t += 2) p.push(`${x(t).toFixed(1)},${y(grip(c, t)).toFixed(1)}`)
    return `M${p.join(' L')}`
  }, [c])
  const st = state(c, temp)

  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-text/90">
        Pirelli, fournisseur unique depuis 2011, propose six mélanges slicks, du C1 (le plus dur) au C6 (le plus tendre). Pour chaque Grand Prix, trois sont
        choisis et marqués <span className="font-bold text-tyre-hard">dur (blanc)</span>, <span className="font-bold text-tyre-medium">medium (jaune)</span>{' '}
        et <span className="font-bold text-tyre-soft">tendre (rouge)</span>. Plus un pneu est tendre, plus il accroche… et plus il s’use vite.
      </p>

      <Card title="Fenêtre de température">
        <div className="mb-4 flex flex-wrap gap-2">
          {COMPOUNDS.map((k) => (
            <button
              key={k.id}
              type="button"
              onClick={() => setId(k.id)}
              className={clsx(
                'flex items-center gap-2 rounded-full border px-3 py-1 text-sm font-bold transition-colors',
                k.id === id ? 'border-text bg-surface-2' : 'border-border text-muted hover:text-text',
              )}
            >
              <span className="h-3.5 w-3.5 rounded-full border-[3px]" style={{ borderColor: k.color, background: '#111' }} />
              {k.name}
            </button>
          ))}
        </div>
        <div className="grid gap-6 md:grid-cols-[1fr_180px] md:items-center">
          <svg viewBox={`-10 -10 ${W + 20} ${H + 40}`} className="w-full" role="img" aria-label="Adhérence en fonction de la température">
            <rect x={x(c.window[0])} y={0} width={x(c.window[1]) - x(c.window[0])} height={H} className="fill-ok/10" />
            <line x1={0} x2={W} y1={H} y2={H} className="stroke-border" />
            {[50, 75, 100, 125, 150].map((t) => (
              <g key={t}>
                <line x1={x(t)} x2={x(t)} y1={H} y2={H + 5} className="stroke-border" />
                <text x={x(t)} y={H + 18} textAnchor="middle" className="fill-muted font-mono text-[10px]">
                  {t} °C
                </text>
              </g>
            ))}
            <text x={x(c.window[0]) + 4} y={14} className="fill-ok text-[10px] font-bold">
              fenêtre {c.window[0]}-{c.window[1]} °C
            </text>
            <motion.path d={path} initial={false} animate={{ d: path }} fill="none" stroke={c.color} strokeWidth={3} />
            <motion.circle initial={false} animate={{ cx: x(temp), cy: y(grip(c, temp)) }} r={7} className="fill-accent" />
            <text x={0} y={-2} className="fill-muted text-[10px]">adhérence relative</text>
          </svg>
          <TyreDisc color={c.color} temp={temp} />
        </div>
        <Slider label="Température du pneu" value={temp} min={T_MIN} max={T_MAX} unit=" °C" onChange={setTemp} />
        <div className="mt-3 rounded-lg border border-border bg-bg/60 p-3">
          <div className={clsx('font-bold', st.tone)}>{st.title}</div>
          <p className="mt-1 text-sm text-text/90">{st.text}</p>
          <p className="mt-2 text-xs text-muted">{c.note}</p>
        </div>
        <p className="mt-2 text-xs text-muted">
          Fenêtres indicatives : Pirelli ne publie plus de plages exactes par mélange. La tendance est sûre : plus le mélange est tendre, plus sa fenêtre est
          basse et étroite. Les couvertures chauffantes préchauffent les pneus à 70 °C maximum.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Règles clés">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-text/90">
            <li>En course sur le sec, au moins deux mélanges différents doivent être utilisés.</li>
            <li>13 trains de slicks par week-end classique (12 lors des week-ends sprint).</li>
            <li>Pressions et carrossages minimaux imposés par Pirelli pour chaque circuit.</li>
            <li>Jantes de 18 pouces depuis 2022.</li>
          </ul>
        </Card>
        {WET_TYRES.map((w) => (
          <Card key={w.name} title={w.name}>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-6 w-6 shrink-0 rounded-full border-4" style={{ borderColor: w.color, background: '#111' }} />
              <p className="text-sm text-text/90">{w.text}</p>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}

function TyreDisc({ color, temp }: { color: string; temp: number }) {
  // heat tint from blue (cold) to red (hot)
  const k = Math.min(1, Math.max(0, (temp - 40) / 120))
  const heat = `hsl(${220 - k * 220} 90% 55%)`
  return (
    <svg viewBox="0 0 160 160" className="mx-auto w-40" aria-hidden>
      <defs>
        <radialGradient id="tyre-heat">
          <stop offset="60%" stopColor="#111" />
          <stop offset="100%" stopColor={heat} stopOpacity={0.55} />
        </radialGradient>
      </defs>
      <circle cx={80} cy={80} r={76} fill="url(#tyre-heat)" />
      <circle cx={80} cy={80} r={62} fill="none" stroke={color} strokeWidth={4} />
      <circle cx={80} cy={80} r={46} className="fill-surface-2" />
      <circle cx={80} cy={80} r={10} className="fill-f1" />
      <text x={80} y={150} textAnchor="middle" className="fill-text font-mono text-[12px] font-bold">
        {temp} °C
      </text>
    </svg>
  )
}
