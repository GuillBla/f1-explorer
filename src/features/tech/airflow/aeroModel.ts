/**
 * Simplified aerodynamic model of a generic 2026-style car.
 *
 *   F = ½ · ρ · v² · S · C   (we use the products S·Cl and S·Cd, "ClA" and "CdA", in m²)
 *
 * The coefficients are plausible orders of magnitude (teams never publish theirs). They are
 * calibrated so that the car produces roughly 1.5 t of downforce at 300 km/h in corner mode,
 * with a front/rear balance around 40 %, as commonly reported for modern F1 cars.
 */

export const RHO = 1.225 // kg/m³, ISA sea level
export const G = 9.81

export interface AeroInputs {
  speedKmh: number
  /** DRS open / straight-line mode. */
  open: boolean
  rideHeightMm: number
}

export interface AeroBreakdown {
  frontWing: number
  floor: number
  rearWing: number
  body: number
}

export interface AeroOutputs {
  v: number
  q: number
  downforceN: number
  dragN: number
  /** Share of downforce on the front axle, %. */
  frontPct: number
  ld: number
  dragPowerKw: number
  clA: AeroBreakdown
  cdA: number
  /** Floor efficiency vs reference ride height (1 = 30 mm). */
  floorFactor: number
  /** 0..1 risk / intensity of porpoising. */
  porpoising: number
  /** Floor stalled (ride height too low). */
  stalled: boolean
}

const AXLE_F = 1.7
const WHEELBASE = 3.4
/** Share of a force applied at x that goes to the front axle (lever rule). */
const frontShare = (x: number) => (x + AXLE_F) / WHEELBASE

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))
const smooth = (e0: number, e1: number, x: number) => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1)
  return t * t * (3 - 2 * t)
}

/** Floor ClA as a function of ride height (mm): ground effect grows as the car gets lower, then stalls. */
export function floorFactor(h: number) {
  const ge = Math.pow(30 / clamp(h, 8, 80), 0.38)
  const stall = 1 - 0.38 * (1 - smooth(10, 18, h))
  return ge * stall
}

export function porpoisingIntensity(h: number, speedKmh: number) {
  return clamp((24 - h) / 10, 0, 1) * smooth(170, 260, speedKmh)
}

export function computeAero({ speedKmh, open, rideHeightMm }: AeroInputs): AeroOutputs {
  const v = speedKmh / 3.6
  const q = 0.5 * RHO * v * v
  const ff = floorFactor(rideHeightMm)
  const clA: AeroBreakdown = {
    frontWing: open ? 0.45 : 0.8,
    floor: 1.5 * ff,
    rearWing: open ? 0.35 : 1.2,
    body: 0.15,
  }
  const totalCl = clA.frontWing + clA.floor + clA.rearWing + clA.body
  // centre of pressure of the floor moves forward when the car is lower (pitch sensitivity)
  const floorX = -0.3 + 0.008 * (30 - rideHeightMm)
  const front =
    clA.frontWing * frontShare(2.55) + clA.floor * frontShare(floorX) + clA.rearWing * frontShare(-2.3) + clA.body * frontShare(0)
  const cdA = 0.45 /* body */ + 0.22 /* wheels */ + (open ? 0.08 : 0.28) + (open ? 0.04 : 0.07) + 0.02 * clA.floor
  const downforceN = q * totalCl
  const dragN = q * cdA
  return {
    v,
    q,
    downforceN,
    dragN,
    frontPct: (front / totalCl) * 100,
    ld: totalCl / cdA,
    dragPowerKw: (dragN * v) / 1000,
    clA,
    cdA,
    floorFactor: ff,
    porpoising: porpoisingIntensity(rideHeightMm, speedKmh),
    stalled: rideHeightMm < 16,
  }
}

/* ------------------------------------------------------------------ */
/* Following a car                                                     */
/* ------------------------------------------------------------------ */

/**
 * Downforce loss of the following car vs distance. Anchored on the FIA figures published when the
 * 2022 rules were presented (CFD): 2021 cars lost ~35 % at 20 m and ~47 % at 10 m, the new
 * generation ~4 % at 20 m and ~18 % at 10 m. Other points are interpolated / extrapolated.
 */
const LOSS_2022: [number, number][] = [
  [5, 30],
  [10, 18],
  [15, 9],
  [20, 4],
  [30, 1.5],
  [40, 0.5],
]
const LOSS_2021: [number, number][] = [
  [5, 55],
  [10, 47],
  [15, 40],
  [20, 35],
  [30, 24],
  [40, 15],
]
/** Drag reduction from slipstream, indicative. */
const TOW: [number, number][] = [
  [5, 40],
  [10, 28],
  [20, 15],
  [30, 8],
  [40, 4],
]

function interp(table: [number, number][], x: number) {
  if (x <= table[0][0]) return table[0][1]
  for (let i = 1; i < table.length; i++) {
    const [x1, y1] = table[i]
    const [x0, y0] = table[i - 1]
    if (x <= x1) return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0)
  }
  return table[table.length - 1][1]
}

export function followEffects(distanceM: number) {
  return {
    lossNow: interp(LOSS_2022, distanceM),
    loss2021: interp(LOSS_2021, distanceM),
    towPct: interp(TOW, distanceM),
  }
}

/* ------------------------------------------------------------------ */
/* Pedagogic explanations reacting to the settings                     */
/* ------------------------------------------------------------------ */

export interface Insight {
  tone: 'info' | 'ok' | 'warn' | 'f1'
  title: string
  text: string
}

const fmt = (n: number, d = 0) => n.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d })

export function insights(a: AeroOutputs, inp: AeroInputs & { followDistance?: number | null }): Insight[] {
  const out: Insight[] = []
  const kgf = a.downforceN / G
  out.push({
    tone: 'info',
    title: 'Pression dynamique',
    text: `À ${fmt(inp.speedKmh)} km/h, ½ρv² vaut ${fmt(a.q / 1000, 2)} kPa. Toutes les forces aérodynamiques varient avec le carré de la vitesse : doubler la vitesse multiplie l’appui et la traînée par quatre.`,
  })
  if (kgf > 768) {
    out.push({
      tone: 'ok',
      title: 'Plus d’appui que de poids',
      text: `L’appui (${fmt(kgf)} kgf) dépasse la masse minimale de la voiture (768 kg en 2026) : en théorie, elle pourrait rouler au plafond à cette vitesse.`,
    })
  }
  if (inp.open) {
    out.push({
      tone: 'info',
      title: 'Ailerons ouverts (DRS / mode X)',
      text: `Les volets s’effacent : la traînée chute à ${fmt(a.cdA, 2)} m² de CdA, mais l’appui aussi. Utilisable seulement en ligne droite, quand la voiture n’a pas besoin d’adhérence latérale. En 2026, l’aileron avant s’ouvre aussi pour conserver l’équilibre (ici ${fmt(a.frontPct)} % à l’avant).`,
    })
  } else {
    out.push({
      tone: 'info',
      title: 'Ailerons fermés (mode Z, virage)',
      text: `Configuration d’appui maximal : finesse (appui/traînée) de ${fmt(a.ld, 1)}. Le fond plat fournit ${fmt((a.clA.floor / (a.clA.floor + a.clA.frontWing + a.clA.rearWing + a.clA.body)) * 100)} % de l’appui.`,
    })
  }
  if (a.stalled) {
    out.push({
      tone: 'f1',
      title: 'Décrochage du fond plat',
      text: 'Trop bas : l’écoulement sous la voiture se décolle et le canal s’étrangle. L’appui du fond chute brutalement, la voiture remonte, l’écoulement se recolle, la voiture redescend… C’est le cycle du marsouinage.',
    })
  } else if (inp.rideHeightMm < 25) {
    out.push({
      tone: 'warn',
      title: 'Effet de sol maximal',
      text: `À ${inp.rideHeightMm} mm, le fond plat donne ${fmt((a.floorFactor - 1) * 100)} % d’appui de plus qu’à 30 mm : c’est tentant, mais on s’approche de la zone de décrochage, et la planche s’use au contact du sol.`,
    })
  } else if (inp.rideHeightMm > 45) {
    out.push({
      tone: 'info',
      title: 'Voiture haute',
      text: 'Le canal sous la voiture est moins resserré : l’air y accélère moins, l’appui du fond diminue. En contrepartie, la voiture est stable et tolère les bosses et vibreurs.',
    })
  }
  if (a.porpoising > 0.05) {
    out.push({
      tone: 'f1',
      title: 'Marsouinage',
      text: `Intensité estimée : ${fmt(a.porpoising * 100)} %. En 2022, les pilotes subissaient des oscillations de plusieurs hertz dans les lignes droites ; la FIA a introduit une métrique d’oscillation (AOM) et relevé les bords du fond de 15 mm en 2023.`,
    })
  }
  if (inp.followDistance) {
    const f = followEffects(inp.followDistance)
    out.push({
      tone: 'warn',
      title: `Air sale à ${fmt(inp.followDistance)} m`,
      text: `La voiture qui suit perd environ ${fmt(f.lossNow)} % d’appui (contre ${fmt(f.loss2021)} % avec les voitures de 2021), mais profite de l’aspiration : environ ${fmt(f.towPct)} % de traînée en moins. Le sillage en champignon est projeté vers le haut pour épargner son fond plat.`,
    })
  }
  return out
}
