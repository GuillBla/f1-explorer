export type CircuitType = 'urbain' | 'semi-permanent' | 'permanent'
export type Continent = 'Europe' | 'Asie' | 'Moyen-Orient' | 'Amérique du Nord' | 'Amérique du Sud' | 'Océanie' | 'Afrique'
export type Rating = 1 | 2 | 3 | 4 | 5

export interface LapRecord {
  time: string
  driver: string
  year: number
}

export interface CornerInfo {
  /** position as a fraction of the lap from the start/finish line (0..1), measured on the GeoJSON trace */
  frac: number
  /** official turn number(s), only when known with confidence */
  n?: string
  name: string
  /** editorial description (what happens there) */
  desc?: string
}

/** Editorial ratings (1 = faible, 5 = très élevé). Subjective, based on usual team/Pirelli descriptions. */
export interface CircuitRatings {
  downforce?: Rating
  brakes?: Rating
  tyres?: Rating
  overtaking?: Rating
  safetyCar?: Rating
}

export interface CircuitInfo {
  /** Jolpica / Ergast circuitId — also used as the route id (/circuits/:id) */
  id: string
  /** feature id in bacinger/f1-circuits (f1-circuits.geojson) */
  geoId: string
  name: string
  shortName: string
  locality: string
  country: string
  continent: Continent
  lat: number
  lon: number
  type: CircuitType
  /** circuit present in the 2026 calendar (also detected live via the schedule) */
  calendar2026?: boolean
  /** short "why it matters" line for historical circuits */
  tagline?: string

  // --- technical sheet (leave undefined when not known with confidence) ---
  /** official length in km */
  lengthKm?: number
  turns?: number
  laps?: number
  raceDistanceKm?: number
  lapRecord?: LapRecord
  /** number of DRS zones in 2025, the last season with DRS */
  drsZones2025?: number
  /** first Formula 1 World Championship Grand Prix held on this circuit (current venue) */
  firstGp?: number
  rotation?: 'horaire' | 'antihoraire' | 'en huit'
  /** altitude (m) — from bacinger/f1-circuits metadata (start/finish reference) */
  altitudeM?: number
  ratings?: CircuitRatings
  corners?: CornerInfo[]
  anecdotes?: string[]

  // --- geometry adjustments for the GeoJSON trace ---
  /** the trace is drawn against the race direction */
  reverse?: boolean
  /** lap fraction (source order) of the start/finish line when the trace does not start on it */
  startFrac?: number
}
