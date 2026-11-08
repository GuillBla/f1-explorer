import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import clsx from 'clsx'
import { Card } from '@/components/ui'
import { floorFactor } from '../../airflow/aeroModel'
import { turbo } from '../../airflow/colormap'
import { Slider } from '../controls'

const W = 600
const GROUND = 190
const X_IN = 70
const X_THROAT0 = 170
const X_THROAT1 = 390
const X_OUT = 540

/** Floor ceiling (svg y) along x for a ride height (mm). */
function ceilingY(x: number, h: number) {
  const gThroat = 6 + h * 0.9
  const gIn = gThroat + 26
  const gOut = gThroat + 58
  let g: number
  if (x <= X_IN) g = gIn
  else if (x < X_THROAT0) g = gIn + ((gThroat - gIn) * (x - X_IN)) / (X_THROAT0 - X_IN)
  else if (x <= X_THROAT1) g = gThroat
  else if (x < X_OUT) g = gThroat + ((gOut - gThroat) * (x - X_THROAT1)) / (X_OUT - X_THROAT1)
  else g = gOut
  return { y: GROUND - g, gap: g, gIn }
}

function rgb(t: number) {
  const [r, g, b] = turbo(t)
  return `rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)})`
}

const PORPOISE_STEPS = [
  { title: 'La voiture descend', text: 'À mesure que la vitesse augmente, l’appui écrase la voiture : le canal se resserre, l’air accélère, l’appui augmente encore.' },
  { title: 'Décrochage', text: 'Trop près du sol, la couche limite se décolle et le canal s’étrangle : l’appui du fond s’effondre en une fraction de seconde.' },
  { title: 'La voiture remonte', text: 'Sans appui, les suspensions détendent la voiture. La garde au sol augmente et l’écoulement se recolle.' },
  { title: 'Et ça recommence', text: 'L’appui revient brutalement, la voiture est de nouveau aspirée… Le cycle se répète plusieurs fois par seconde.' },
]

export function GroundEffectSheet() {
  const [h, setH] = useState(30)
  const [step, setStep] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setStep((s) => (s + 1) % 4), 2200)
    return () => clearInterval(id)
  }, [])

  const { floorPath, bars, timing, ratio } = useMemo(() => {
    const pts: string[] = []
    for (let x = 30; x <= W - 30; x += 10) pts.push(`${x},${ceilingY(x, h).y.toFixed(1)}`)
    const floorPath = `M30,${ceilingY(30, h).y - 14} L${pts.join(' L')} L${W - 30},${ceilingY(W - 30, h).y - 14} Z`
    const stall = h < 14 ? 0.55 : 1
    const bars: { x: number; cp: number }[] = []
    for (let x = 50; x <= 560; x += 20) {
      const c = ceilingY(x, h)
      const u = 1 + 0.55 * (c.gIn / c.gap - 1) * stall
      bars.push({ x, cp: 1 - u * u * 0.8 - 0.2 })
    }
    const c0 = ceilingY(X_THROAT0 + 1, h)
    const ratio = (1 + 0.55 * (c0.gIn / c0.gap - 1)) * stall
    // animateMotion timing: time ∝ length / speed for each section
    const lens = [X_IN - 20, X_THROAT0 - X_IN, X_THROAT1 - X_THROAT0, X_OUT - X_THROAT1, W - 20 - X_OUT]
    const speeds = [1, (1 + ratio) / 2, ratio, (ratio + 0.8) / 2, 0.85]
    const times = lens.map((l, i) => l / speeds[i])
    const tTot = times.reduce((a, b) => a + b, 0)
    const lTot = lens.reduce((a, b) => a + b, 0)
    let tc = 0
    let lc = 0
    const keyTimes = ['0']
    const keyPoints = ['0']
    for (let i = 0; i < lens.length; i++) {
      tc += times[i]
      lc += lens[i]
      keyTimes.push((tc / tTot).toFixed(3))
      keyPoints.push((lc / lTot).toFixed(3))
    }
    return { floorPath, bars, timing: { keyTimes: keyTimes.join(';'), keyPoints: keyPoints.join(';'), dur: (tTot / 160).toFixed(2) }, ratio }
  }, [h])

  const lanes = [0.25, 0.5, 0.75]
  const ff = floorFactor(h)

  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-text/90">
        Sous la voiture, l’air passe dans un canal formé par le fond plat et la piste. Ce canal se resserre (le <strong>col</strong>) puis s’élargit (le{' '}
        <strong>diffuseur</strong>). D’après le théorème de Bernoulli, là où la section diminue, l’air accélère et sa pression baisse :{' '}
        <span className="text-accent">p + ½ρv² = constante</span>. La différence entre la pression au-dessus de la voiture et la dépression en dessous la
        plaque au sol, avec très peu de traînée.
      </p>

      <Card title="Coupe longitudinale du fond plat">
        <svg viewBox={`0 0 ${W} 260`} className="w-full" role="img" aria-label="Écoulement sous le fond plat">
          <defs>
            {lanes.map((f, i) => {
              const d: string[] = []
              for (let x = 20; x <= W - 20; x += 10) {
                const c = ceilingY(x, h)
                d.push(`${x},${(GROUND - c.gap * f).toFixed(1)}`)
              }
              return <path key={i} id={`ge-lane-${i}`} d={`M${d.join(' L')}`} />
            })}
          </defs>
          {/* ground and moving road marks */}
          <rect x={0} y={GROUND} width={W} height={70} className="fill-surface-2" />
          {Array.from({ length: 16 }).map((_, i) => (
            <motion.rect
              key={i}
              y={GROUND + 6}
              width={18}
              height={2}
              className="fill-border"
              initial={{ x: i * 40 }}
              animate={{ x: [i * 40, i * 40 - 40] }}
              transition={{ duration: 0.4, repeat: Infinity, ease: 'linear' }}
            />
          ))}
          {/* floor */}
          <path d={floorPath} className="fill-surface stroke-muted" strokeWidth={1.5} />
          <text x={(X_THROAT0 + X_THROAT1) / 2} y={ceilingY(300, h).y - 22} textAnchor="middle" className="fill-muted text-[11px]">
            fond plat
          </text>
          <text x={X_IN + 10} y={GROUND + 30} className="fill-muted text-[10px]">entrée</text>
          <text x={(X_THROAT0 + X_THROAT1) / 2} y={GROUND + 30} textAnchor="middle" className="fill-accent text-[10px] font-bold">
            col : air rapide, basse pression
          </text>
          <text x={X_OUT - 60} y={GROUND + 30} className="fill-muted text-[10px]">diffuseur</text>
          {/* flowing particles */}
          {lanes.map((_, i) =>
            [0, 1, 2, 3].map((k) => (
              <circle key={`${i}-${k}`} r={2.6} className="fill-accent">
                <animateMotion
                  dur={`${timing.dur}s`}
                  begin={`${(-k * Number(timing.dur)) / 4 - i * 0.37}s`}
                  repeatCount="indefinite"
                  keyPoints={timing.keyPoints}
                  keyTimes={timing.keyTimes}
                  calcMode="linear"
                >
                  <mpath href={`#ge-lane-${i}`} xlinkHref={`#ge-lane-${i}`} />
                </animateMotion>
              </circle>
            )),
          )}
          {/* pressure bars (Cp) */}
          <line x1={30} x2={W - 30} y1={232} y2={232} className="stroke-border" />
          {bars.map((b) => (
            <rect
              key={b.x}
              x={b.x - 7}
              width={14}
              y={b.cp < 0 ? 232 : 232 - b.cp * 18}
              height={Math.abs(b.cp) * 18}
              fill={rgb((b.cp + 1.6) / 2.6)}
              opacity={0.9}
            />
          ))}
          <text x={34} y={256} className="fill-muted text-[10px]">Pression sous le fond (bleu = dépression)</text>
        </svg>
        <div className="mt-3 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Slider label="Hauteur de caisse" value={h} min={8} max={60} unit=" mm" onChange={setH} />
          <div className="flex gap-4 font-mono text-sm">
            <div>
              <div className="text-[11px] text-muted">Vitesse au col</div>
              <div className="font-bold text-accent">× {ratio.toFixed(2)}</div>
            </div>
            <div>
              <div className="text-[11px] text-muted">Appui du fond</div>
              <div className={clsx('font-bold', h < 14 ? 'text-f1' : 'text-ok')}>{Math.round(ff * 100)} %</div>
            </div>
          </div>
        </div>
        {h < 14 && <p className="mt-2 text-sm font-semibold text-f1">Décrochage : l’écoulement se décolle, l’appui chute. C’est le point de départ du marsouinage.</p>}
      </Card>

      <Card title="Le marsouinage (porpoising)">
        <div className="grid gap-4 md:grid-cols-[200px_1fr] md:items-center">
          <svg viewBox="0 0 200 120" className="mx-auto w-48" aria-hidden>
            <rect x={0} y={100} width={200} height={20} className="fill-surface-2" />
            <motion.g animate={{ y: [6, 10, -6, 0][step] }} transition={{ type: 'spring', stiffness: 160, damping: 9 }}>
              <path d="M20 78 L60 64 L110 60 L130 44 L150 46 L170 62 L185 62 L185 84 L20 84 Z" className="fill-f1" />
              <circle cx={50} cy={84} r={12} className="fill-bg stroke-muted" />
              <circle cx={160} cy={84} r={12} className="fill-bg stroke-muted" />
            </motion.g>
          </svg>
          <ol className="grid gap-2 sm:grid-cols-2">
            {PORPOISE_STEPS.map((s, i) => (
              <li key={s.title} className={clsx('rounded-lg border p-3 transition-colors', i === step ? 'border-f1 bg-f1/10' : 'border-border')}>
                <div className="text-sm font-bold">
                  {i + 1}. {s.title}
                </div>
                <p className="mt-1 text-xs text-muted">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="1977-1982">
          <p className="text-sm text-text/90">
            Lotus 78 puis 79 : des pontons en forme d’aile inversée et des jupes coulissantes qui frottent au sol pour sceller le dessous. L’effet est si
            puissant qu’il est interdit : fond plat obligatoire entre les roues dès 1983.
          </p>
        </Card>
        <Card title="2022-2025">
          <p className="text-sm text-text/90">
            Retour de l’effet de sol par deux canaux Venturi, pour réduire l’air perturbé et favoriser les dépassements. Marsouinage en 2022 : directive
            technique TD039, métrique d’oscillation (AOM), bords du fond relevés de 15 mm en 2023.
          </p>
        </Card>
        <Card title="2026">
          <p className="text-sm text-text/90">
            Fond plus plat, canaux moins profonds et diffuseur réduit : moins d’appui mais une voiture moins sensible à la hauteur de caisse, ce qui doit
            limiter le marsouinage et autoriser des réglages plus souples.
          </p>
        </Card>
      </div>
    </div>
  )
}
