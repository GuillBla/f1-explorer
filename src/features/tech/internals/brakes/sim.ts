import { create } from 'zustand'

/**
 * Simplified physics of a rear brake corner over a repeating "straight → heavy braking → corner →
 * exit" sequence. Orders of magnitude are plausible for a 2026 car, not team data.
 */

export type BrakeMode = 'cycle' | 'manuel'
export type BrakePhase = 'relance' | 'ligne' | 'freinage' | 'virage'

interface BrakeSettings {
  mode: BrakeMode
  /** Manual pedal 0..1 (manual mode). */
  pedal: number
  /** Forces a full battery: the MGU-K can no longer harvest. */
  batteryFull: boolean
  set: (p: Partial<Omit<BrakeSettings, 'set'>>) => void
}

export const useBrakeStore = create<BrakeSettings>((set) => ({
  mode: 'cycle',
  pedal: 0.6,
  batteryFull: false,
  set: (p) => set(p),
}))

const G = 9.81
/** Car + driver + some fuel, kg. */
const MASS = 800
/** Share of braking done by the rear axle (balance ≈ 58 % front). */
export const REAR_SHARE = 0.42
/** MGU-K max power, W (2026). */
export const MGUK_MAX = 350_000
/** Usable battery window, J (uncertain). */
const ES_CAP = 4_000_000
const TYRE_R = 0.36
const T_AMB = 120
/**
 * Effective heat capacity of one rear disc, J/K. A disc weighs ≈ 1 kg and carbon stores ≈ 1 300 J/(kg·K)
 * when hot, but during a stop only the rubbing surfaces heat up: a smaller effective mass is used.
 */
const DISC_HEAT_CAP = 450

export const brakeSim = {
  /** Phase clock (s) inside the corner phase. */
  tPhase: 0,
  phase: 'ligne' as BrakePhase,
  /** Vehicle speed, m/s. */
  v: 300 / 3.6,
  pedal: 0,
  /** Longitudinal acceleration, g (negative = braking). */
  accelG: 0,
  /** Disc temperature, °C. */
  temp: 420,
  /** Wheel / disc angle, rad. */
  wheelAngle: 0,
  /** Battery state of charge 0..1. */
  soc: 0.55,
  /** Total braking power of the car, W. */
  pTotal: 0,
  /** Rear axle braking power, W. */
  pRear: 0,
  /** MGU-K harvesting power, W. */
  pMguk: 0,
  /** Rear hydraulic braking power (both discs), W. */
  pHydRear: 0,
  /** Hydraulic line pressure (bar, indicative). */
  pressure: 0,
  /** Smoothed caliper clamp 0..1 (pads travel). */
  clamp: 0,
  /** MGU-K deploying power during acceleration, W. */
  pDeploy: 0,
  peakTemp: 0,
}

/** Braking deceleration available at full pedal, in g (grip grows with downforce ∝ v²). */
export const maxDecelG = (v: number) => 1.8 + 3.6 * (v / 92) ** 2
/** Acceleration on full throttle, in g (drag grows with v²). */
const accelG = (v: number) => Math.max(0.08, 1.35 - 1.15 * (v / 95) ** 2)

export function stepBrakes(dtTotal: number) {
  const s = brakeSim
  const ui = useBrakeStore.getState()
  // sub-steps for stability at x1
  const n = Math.max(1, Math.ceil(dtTotal / 0.01))
  const dt = dtTotal / n
  for (let i = 0; i < n; i++) {
    let pedal = 0
    let throttle = 0
    if (ui.mode === 'cycle') {
      s.tPhase += dt
      const kmh = s.v * 3.6
      switch (s.phase) {
        case 'relance':
          throttle = 1
          if (kmh >= 200) setPhase('ligne')
          break
        case 'ligne':
          throttle = 1
          if (kmh >= 325) setPhase('freinage')
          break
        case 'freinage':
          // fast pedal application, then slight release as downforce drops
          pedal = Math.min(1, s.tPhase / 0.08) * (kmh > 140 ? 1 : 0.9)
          if (kmh <= 95) setPhase('virage')
          break
        case 'virage':
          // trail braking that fades into the apex
          pedal = Math.max(0, 0.25 - s.tPhase * 0.4)
          if (s.tPhase > 1.4) setPhase('relance')
          break
      }
    } else {
      pedal = ui.pedal
      throttle = pedal > 0.02 ? 0 : 1
      if (s.v * 3.6 < 60 && pedal > 0) pedal = 0 // the car would stop: hold a minimum speed
      s.phase = pedal > 0.02 ? 'freinage' : s.v * 3.6 < 200 ? 'relance' : 'ligne'
    }

    // longitudinal dynamics
    const decel = pedal * maxDecelG(s.v)
    const acc = throttle * accelG(s.v)
    s.accelG = acc - decel
    s.v = Math.max(15, Math.min(95, s.v + s.accelG * G * dt))
    s.pedal = pedal

    // power split (brake-by-wire on the rear axle)
    s.pTotal = MASS * decel * G * s.v
    s.pRear = s.pTotal * REAR_SHARE
    if (ui.batteryFull) s.soc = 1
    const room = ui.batteryFull ? 0 : Math.min(1, (1 - s.soc) / 0.05)
    s.pMguk = Math.min(s.pRear, MGUK_MAX * room)
    s.pHydRear = s.pRear - s.pMguk
    s.soc = Math.min(1, s.soc + (s.pMguk * dt) / ES_CAP)
    // deployment on exits (taper at high speed)
    const deploying = throttle > 0 && s.soc > 0.08 && !ui.batteryFull && (ui.mode === 'manuel' || s.phase === 'relance')
    s.pDeploy = deploying ? 250_000 * Math.max(0, Math.min(1, (300 - s.v * 3.6) / 120)) : 0
    if (!ui.batteryFull) s.soc = Math.max(0, s.soc - (s.pDeploy * dt) / ES_CAP)

    // pressure for the rear caliper ∝ hydraulic torque (indicative scale, ≈ 0-100 bar)
    const torqueHyd = s.pHydRear / 2 / Math.max(1, s.v / TYRE_R)
    const targetPressure = Math.min(120, torqueHyd / 45)
    s.pressure += (targetPressure - s.pressure) * Math.min(1, dt * 40)
    const targetClamp = s.pHydRear > 500 ? 1 : 0
    s.clamp += (targetClamp - s.clamp) * Math.min(1, dt * 25)

    // disc temperature: heating from hydraulic braking, convective cooling ∝ air speed
    const pDisc = s.pHydRear / 2
    const h = 0.03 + 0.0018 * s.v
    s.temp += (pDisc / DISC_HEAT_CAP - h * (s.temp - T_AMB)) * dt
    s.peakTemp = Math.max(s.peakTemp * (1 - dt * 0.05), s.temp)

    s.wheelAngle = (s.wheelAngle + (s.v / TYRE_R) * dt) % (Math.PI * 2000)
  }
}

function setPhase(p: BrakePhase) {
  brakeSim.phase = p
  brakeSim.tPhase = 0
}

export const kmh = () => brakeSim.v * 3.6
