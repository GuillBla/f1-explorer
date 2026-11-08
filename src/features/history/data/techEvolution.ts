/**
 * Évolution technique — DONNÉES ÉDITORIALES APPROXIMATIVES.
 * Les puissances sont des ordres de grandeur en configuration course (les constructeurs publient
 * rarement des chiffres officiels). Le poids minimum suit le règlement, mais sa définition a changé :
 * voiture seule jusqu'en 1994, voiture + pilote depuis 1995.
 */

export interface PowerPoint { year: number; hp: number; label: string }
export interface WeightPoint { year: number; kg: number; withDriver: boolean }

export const POWER: PowerPoint[] = [
  { year: 1950, hp: 350, label: '1,5 l compresseur (Alfa Romeo 158)' },
  { year: 1954, hp: 260, label: '2,5 l atmosphérique' },
  { year: 1961, hp: 190, label: 'Formule 1,5 l' },
  { year: 1966, hp: 360, label: '3 l atmosphérique' },
  { year: 1967, hp: 410, label: 'Cosworth DFV' },
  { year: 1975, hp: 490, label: 'Flat-12 Ferrari / DFV' },
  { year: 1980, hp: 520, label: 'Atmosphériques et premiers turbos' },
  { year: 1983, hp: 750, label: 'Turbo 1,5 l (course)' },
  { year: 1986, hp: 950, label: 'Turbo 1,5 l (course, > 1 000 ch en qualif.)' },
  { year: 1989, hp: 650, label: '3,5 l atmosphérique' },
  { year: 1993, hp: 750, label: 'V10 / V12 3,5 l' },
  { year: 1995, hp: 700, label: '3 l atmosphérique' },
  { year: 2000, hp: 800, label: 'V10 3 l' },
  { year: 2005, hp: 900, label: 'V10 3 l, plus de 19 000 tr/min' },
  { year: 2006, hp: 750, label: 'V8 2,4 l' },
  { year: 2013, hp: 750, label: 'V8 2,4 l + KERS' },
  { year: 2014, hp: 800, label: 'V6 1,6 l turbo hybride' },
  { year: 2020, hp: 1000, label: 'V6 turbo hybride' },
  { year: 2026, hp: 1000, label: 'V6 turbo + électrique ~50/50' },
]

export const MIN_WEIGHT: WeightPoint[] = [
  { year: 1961, kg: 450, withDriver: false },
  { year: 1966, kg: 500, withDriver: false },
  { year: 1972, kg: 550, withDriver: false },
  { year: 1973, kg: 575, withDriver: false },
  { year: 1981, kg: 585, withDriver: false },
  { year: 1983, kg: 540, withDriver: false },
  { year: 1987, kg: 500, withDriver: false },
  { year: 1994, kg: 515, withDriver: false },
  { year: 1995, kg: 595, withDriver: true },
  { year: 2004, kg: 605, withDriver: true },
  { year: 2011, kg: 640, withDriver: true },
  { year: 2014, kg: 691, withDriver: true },
  { year: 2017, kg: 728, withDriver: true },
  { year: 2019, kg: 743, withDriver: true },
  { year: 2021, kg: 752, withDriver: true },
  { year: 2022, kg: 798, withDriver: true },
  { year: 2026, kg: 768, withDriver: true },
]

/** Repères de tracé pour lire les temps de pole (les tracés évoluent au fil des ans). */
export const LAYOUT_NOTES: Record<string, string> = {
  monza:
    "Tracé avec chicanes ; la première chicane a été redessinée en 2000. Monza reste le circuit le plus rapide du calendrier.",
  monaco:
    "Tracé urbain retouché à plusieurs reprises (secteur Piscine-Rascasse notamment). Les temps varient aussi fortement selon la météo.",
}
