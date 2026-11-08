import type { ColorBy } from '../store'

/** Google "Turbo" colormap, polynomial approximation (t in 0..1 → rgb in 0..1). */
export function turbo(t: number): [number, number, number] {
  const x = Math.min(1, Math.max(0, t))
  const r = 0.13572138 + x * (4.6153926 + x * (-42.66032258 + x * (132.13108234 + x * (-152.94239396 + x * 59.28637943))))
  const g = 0.09140261 + x * (2.19418839 + x * (4.84296658 + x * (-14.18503333 + x * (4.27729857 + x * 2.82956604))))
  const b = 0.1066733 + x * (12.64194608 + x * (-60.58204836 + x * (110.36276771 + x * (-89.90310912 + x * 27.34824973))))
  return [Math.min(1, Math.max(0, r)), Math.min(1, Math.max(0, g)), Math.min(1, Math.max(0, b))]
}

const LUT_SIZE = 256
/** Pre-computed RGB lookup table, 3 floats per entry. */
export const TURBO_LUT = (() => {
  const a = new Float32Array(LUT_SIZE * 3)
  for (let i = 0; i < LUT_SIZE; i++) a.set(turbo(i / (LUT_SIZE - 1)), i * 3)
  return a
})()

export function lutIndex(t: number) {
  return Math.min(LUT_SIZE - 1, Math.max(0, Math.round(t * (LUT_SIZE - 1)))) * 3
}

/** Ranges of the two colour scales. */
export const SCALES: Record<ColorBy, { min: number; max: number; label: string; unit: string; ticks: number[]; hint: [string, string] }> = {
  speed: { min: 0, max: 1.6, label: 'Vitesse locale / vitesse de l’air', unit: '× V∞', ticks: [0, 0.5, 1, 1.5], hint: ['lent', 'rapide'] },
  pressure: { min: -1.6, max: 1, label: 'Coefficient de pression Cp', unit: 'Cp', ticks: [-1.5, -1, -0.5, 0, 0.5, 1], hint: ['dépression', 'surpression'] },
}

/**
 * Normalised scalar (0..1) for a velocity, depending on the colour mode.
 * Cp = 1 − |u|² (Bernoulli) minus the total-pressure loss in wakes.
 */
export function scalar(colorBy: ColorBy, speed2: number, loss = 0) {
  if (colorBy === 'speed') return Math.sqrt(speed2) / SCALES.speed.max
  const cp = 1 - speed2 - loss
  return (cp - SCALES.pressure.min) / (SCALES.pressure.max - SCALES.pressure.min)
}

/** CSS linear-gradient for legends. */
export function turboGradientCss(steps = 12) {
  const stops: string[] = []
  for (let i = 0; i <= steps; i++) {
    const [r, g, b] = turbo(i / steps)
    stops.push(`rgb(${Math.round(r * 255)} ${Math.round(g * 255)} ${Math.round(b * 255)}) ${((i / steps) * 100).toFixed(1)}%`)
  }
  return `linear-gradient(90deg, ${stops.join(', ')})`
}
