import { useEffect, useMemo, useRef, useState } from 'react'
import { Play, RotateCcw } from 'lucide-react'
import { Card } from '@/components/ui'
import { G, RHO } from '../../airflow/aeroModel'
import { Slider, Stat } from '../controls'

const MASS = 800 // kg, car + driver + some fuel
const MU = 1.7 // tyre friction coefficient, order of magnitude
const CLA = 3.65
const CDA = 1.05
const V_END = 80 / 3.6

interface Sample {
  t: number
  v: number
  d: number
  g: number
  temp: number
}

/**
 * Point-mass braking simulation: deceleration = (μ·(m·g + ½ρv²·ClA) + ½ρv²·CdA) / m.
 * Downforce lets the car brake much harder at high speed. Disc temperature rises with the energy
 * dissipated by the friction brakes (illustrative scale: ~+450 °C for a 320 → 80 km/h stop).
 */
function simulate(v0kmh: number): Sample[] {
  const out: Sample[] = []
  let v = v0kmh / 3.6
  let d = 0
  let t = 0
  const dt = 0.01
  const e0 = 0.5 * MASS * (88.9 ** 2 - V_END ** 2)
  let eBrake = 0
  while (v > V_END && t < 6) {
    const q = 0.5 * RHO * v * v
    const fTyre = MU * (MASS * G + q * CLA)
    const fDrag = q * CDA
    const a = (fTyre + fDrag) / MASS
    eBrake += fTyre * v * dt * 0.75 // ~25 % recovered by the MGU-K on the rear axle
    out.push({ t, v: v * 3.6, d, g: a / G, temp: 450 + (eBrake / e0) * 600 })
    v -= a * dt
    d += v * dt
    t += dt
  }
  out.push({ t, v: V_END * 3.6, d, g: 0, temp: out.length ? out[out.length - 1].temp : 450 })
  return out
}

function discColor(temp: number) {
  // approximate incandescence: dark → red → orange → yellow
  const k = Math.min(1, Math.max(0, (temp - 350) / 700))
  const h = 10 + k * 40
  const l = 18 + k * 47
  return `hsl(${h} 100% ${l}%)`
}

export function BrakesSheet() {
  const [v0, setV0] = useState(320)
  const sim = useMemo(() => simulate(v0), [v0])
  const [i, setI] = useState(sim.length - 1)
  const raf = useRef<number | null>(null)

  useEffect(() => setI(sim.length - 1), [sim])
  useEffect(() => () => {
    if (raf.current) cancelAnimationFrame(raf.current)
  }, [])

  const run = () => {
    if (raf.current) cancelAnimationFrame(raf.current)
    const start = performance.now()
    const total = sim[sim.length - 1].t
    const slow = 2.5 // slow motion factor
    const tick = (now: number) => {
      const t = (now - start) / 1000 / slow
      const idx = Math.min(sim.length - 1, Math.round((t / total) * (sim.length - 1)))
      setI(idx)
      if (idx < sim.length - 1) raf.current = requestAnimationFrame(tick)
    }
    setI(0)
    raf.current = requestAnimationFrame(tick)
  }

  const s = sim[i]
  const end = sim[sim.length - 1]
  const peakG = Math.max(...sim.map((p) => p.g))
  const W = 520
  const H = 120
  const sx = (d: number) => (d / Math.max(end.d, 1)) * W
  const sy = (v: number) => H - (v / 360) * H
  const curve = `M${sim.map((p) => `${sx(p.d).toFixed(1)},${sy(p.v).toFixed(1)}`).join(' L')}`

  return (
    <div className="space-y-6">
      <p className="max-w-3xl leading-relaxed text-text/90">
        Une F1 freine plus fort qu’elle n’accélère. À haute vitesse, l’appui aérodynamique plaque les pneus au sol et la traînée aide à ralentir :
        décélération de 5 à 6 g au début du freinage. Les disques et plaquettes en carbone-carbone encaissent cette énergie en montant jusqu’à environ 1000 °C.
      </p>

      <Card title="Simulation d’un freinage (masse ponctuelle)">
        <div className="grid gap-6 md:grid-cols-[200px_1fr] md:items-center">
          <svg viewBox="0 0 200 200" className="mx-auto w-48" role="img" aria-label="Disque de frein">
            <defs>
              <radialGradient id="disc-glow">
                <stop offset="55%" stopColor={discColor(s.temp)} />
                <stop offset="100%" stopColor={discColor(s.temp - 150)} />
              </radialGradient>
            </defs>
            <circle cx={100} cy={100} r={92} fill="url(#disc-glow)" style={{ filter: s.temp > 700 ? `drop-shadow(0 0 ${(s.temp - 700) / 25}px ${discColor(s.temp)})` : undefined }} />
            {Array.from({ length: 48 }).map((_, k) => {
              const a = (k / 48) * Math.PI * 2
              return <circle key={k} cx={100 + Math.cos(a) * 75} cy={100 + Math.sin(a) * 75} r={2} fill="#000" opacity={0.6} />
            })}
            {Array.from({ length: 36 }).map((_, k) => {
              const a = (k / 36) * Math.PI * 2 + 0.08
              return <circle key={k} cx={100 + Math.cos(a) * 62} cy={100 + Math.sin(a) * 62} r={1.8} fill="#000" opacity={0.6} />
            })}
            <circle cx={100} cy={100} r={44} className="fill-surface-2 stroke-border" />
            <rect x={150} y={60} width={34} height={80} rx={10} className="fill-f1" />
            <text x={100} y={105} textAnchor="middle" className="fill-text font-mono text-[14px] font-bold">
              {Math.round(s.temp)} °C
            </text>
          </svg>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <Stat label="Vitesse" value={s.v.toFixed(0)} unit="km/h" tone="accent" />
              <Stat label="Décélération" value={s.g.toFixed(1)} unit="g" tone="f1" />
              <Stat label="Distance" value={s.d.toFixed(0)} unit="m" />
              <Stat label="Temps" value={s.t.toFixed(2)} unit="s" />
            </div>
            <svg viewBox={`-30 -10 ${W + 40} ${H + 30}`} className="w-full" aria-label="Vitesse en fonction de la distance">
              <line x1={0} x2={W} y1={H} y2={H} className="stroke-border" />
              <line x1={0} x2={0} y1={0} y2={H} className="stroke-border" />
              <path d={curve} fill="none" stroke="var(--color-muted)" strokeWidth={2} />
              <circle cx={sx(s.d)} cy={sy(s.v)} r={5} className="fill-accent" />
              <text x={-4} y={sy(300) + 3} textAnchor="end" className="fill-muted font-mono text-[9px]">
                300
              </text>
              <text x={-4} y={sy(100) + 3} textAnchor="end" className="fill-muted font-mono text-[9px]">
                100
              </text>
              <text x={W} y={H + 16} textAnchor="end" className="fill-muted font-mono text-[9px]">
                {end.d.toFixed(0)} m
              </text>
            </svg>
          </div>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto] md:items-end">
          <Slider label="Vitesse au point de freinage" value={v0} min={160} max={350} step={10} unit=" km/h" onChange={setV0} hint="Freinage jusqu’à 80 km/h, au ralenti ×2,5." />
          <div className="flex gap-2">
            <button type="button" onClick={run} className="inline-flex items-center gap-1.5 rounded-md bg-f1 px-4 py-2 text-sm font-bold text-white">
              <Play size={15} /> Freiner
            </button>
            <button
              type="button"
              onClick={() => setI(sim.length - 1)}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-semibold text-muted hover:text-text"
              aria-label="Fin"
            >
              <RotateCcw size={15} />
            </button>
          </div>
        </div>
        <p className="mt-2 text-xs text-muted">
          Pic de décélération : {peakG.toFixed(1)} g. Hypothèses : masse 800 kg, μ ≈ 1,7, S·Cl = 3,65 m², S·Cd = 1,05 m², environ un quart de l’énergie
          récupérée par le MGU-K. Échelle de température illustrative.
        </p>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Carbone-carbone">
          <p className="text-sm text-text/90">
            Fibres de carbone dans une matrice de carbone : très léger, il garde son efficacité à très haute température et supporte les chocs thermiques. Il
            faut le maintenir au-dessus de ≈ 300-400 °C pour qu’il morde ; au-delà d’environ 1000 °C, il s’oxyde et s’use très vite.
          </p>
        </Card>
        <Card title="Refroidissement">
          <p className="text-sm text-text/90">
            Un disque avant compte plus de mille trous de ventilation radiaux. Les écopes sont adaptées à chaque circuit : Monza, Montréal ou Mexico (air
            raréfié en altitude) sont parmi les plus exigeants pour les freins.
          </p>
        </Card>
        <Card title="Brake-by-wire">
          <p className="text-sm text-text/90">
            À l’arrière, un calculateur répartit l’effort demandé par la pédale entre les freins hydrauliques et le MGU-K. Le pilote applique plus de 100 kg
            d’effort sur la pédale au pic du freinage.
          </p>
        </Card>
      </div>
    </div>
  )
}
