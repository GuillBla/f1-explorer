/** Types partagés du module Histoire. */

export type EventCategory = 'titre' | 'securite' | 'technique' | 'record' | 'controverse' | 'reglement'

export interface HistoryEvent {
  id: string
  /** 'YYYY', 'YYYY-MM' ou 'YYYY-MM-DD' selon la précision connue. */
  date: string
  title: string
  text: string
  category: EventCategory
  /** Lieu (Grand Prix / circuit) si pertinent. */
  place?: string
  /** Fait majeur mis en avant dans la frise. */
  highlight?: boolean
}

export type CarShape =
  | 'cigar' // années 1950, moteur avant
  | 'rear' // moteur arrière, carrosserie fine
  | 'wing' // ailerons hauts, nez en coin
  | 'wedge' // effet de sol, pontons longs
  | 'turbo' // turbo, grands ailerons arrière
  | 'nose' // nez haut années 1990
  | 'modern' // 2000s, nombreux appendices
  | 'hybrid' // nez bas, halo
  | 'groundEffect' // 2022, pontons sculptés
  | 'active2026' // voitures 2026 plus compactes

export interface EmblematicCar {
  name: string
  year: number
  team: string
  /** Couleur dominante de la livrée (stylisée). */
  color: string
  accent?: string
  note: string
}

export interface Era {
  id: string
  start: number
  end: number
  title: string
  subtitle: string
  color: string
  shape: CarShape
  description: string
  innovations: string[]
  cars: EmblematicCar[]
}

/* ---------- Données générées (public/data/history/champions.json) ---------- */

export interface ChampDriverRow { id: string; team: string; teamId: string; points: number; wins: number }
export interface ChampConstructorRow { id: string; name: string; nat: string; points: number; wins: number }

export interface SeasonChampions {
  year: number
  rounds: number
  inProgress: boolean
  drivers: ChampDriverRow[]
  constructors: ChampConstructorRow[]
}

export interface RaceRow { y: number; r: number; race: string; circuit: string; date: string; d: string; team: string }

export interface DriverInfo { name: string; nat: string; dob: string; code?: string }

export interface ChampionsData {
  generatedAt: string
  source: string
  currentYear: number
  champions: SeasonChampions[]
  winners: RaceRow[]
  poles: RaceRow[]
  drivers: Record<string, DriverInfo>
}

export interface CircuitPole { year: number; driver: string; team: string; time: string; seconds: number }
export interface CircuitPolesData {
  generatedAt: string
  circuits: Record<string, { name: string; poles: CircuitPole[] }>
}
