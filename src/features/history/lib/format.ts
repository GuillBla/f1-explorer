/** Utilitaires de formatage du module Histoire. */

const NATIONALITIES: Record<string, string> = {
  American: 'États-Unis', Argentine: 'Argentine', Argentinian: 'Argentine', Australian: 'Australie', Austrian: 'Autriche',
  Belgian: 'Belgique', Brazilian: 'Brésil', British: 'Royaume-Uni', Canadian: 'Canada', Chilean: 'Chili',
  Chinese: 'Chine', Colombian: 'Colombie', Czech: 'Tchéquie', Danish: 'Danemark', Dutch: 'Pays-Bas',
  Finnish: 'Finlande', French: 'France', German: 'Allemagne', Hungarian: 'Hongrie', Indian: 'Inde',
  Indonesian: 'Indonésie', Irish: 'Irlande', Italian: 'Italie', Japanese: 'Japon', Liechtensteiner: 'Liechtenstein',
  Malaysian: 'Malaisie', Mexican: 'Mexique', Monegasque: 'Monaco', 'New Zealander': 'Nouvelle-Zélande',
  Polish: 'Pologne', Portuguese: 'Portugal', Russian: 'Russie', 'South African': 'Afrique du Sud', Spanish: 'Espagne',
  Swedish: 'Suède', Swiss: 'Suisse', Thai: 'Thaïlande', Uruguayan: 'Uruguay', Venezuelan: 'Venezuela',
  Rhodesian: 'Rhodésie', 'East German': 'RDA',
}

export const natFr = (n: string) => NATIONALITIES[n] ?? n

/** Regroupe les noms de constructeurs Ergast par marque (« Lotus-Climax », « Team Lotus » → « Lotus »). */
export function teamBrand(name: string): string {
  const n = name.replace(/^Team\s+/, '')
  if (/^Brawn/.test(n)) return 'Brawn GP'
  if (/^Red Bull/.test(n)) return 'Red Bull'
  return n.split('-')[0].trim()
}

const DAY = 86_400_000

/** Âge exact en années et jours. */
export function ageAt(dob: string, date: string): { years: number; days: number; totalDays: number } {
  const b = new Date(`${dob}T00:00:00Z`)
  const d = new Date(`${date}T00:00:00Z`)
  let years = d.getUTCFullYear() - b.getUTCFullYear()
  const anniversary = new Date(Date.UTC(d.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()))
  if (anniversary > d) years--
  const lastBirthday = new Date(Date.UTC(b.getUTCFullYear() + years, b.getUTCMonth(), b.getUTCDate()))
  return { years, days: Math.round((d.getTime() - lastBirthday.getTime()) / DAY), totalDays: (d.getTime() - b.getTime()) / DAY }
}

export const formatAge = (a: { years: number; days: number }) => `${a.years} ans et ${a.days} j`
export const formatAgeShort = (a: { years: number; days: number }) => `${a.years} a ${a.days} j`

const MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.']
const MONTHS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre']

/** Formate une date partielle 'YYYY', 'YYYY-MM' ou 'YYYY-MM-DD'. */
export function formatPartialDate(date: string, long = false): string {
  const [y, m, d] = date.split('-')
  const months = long ? MONTHS_LONG : MONTHS
  if (!m) return y
  if (!d) return `${months[Number(m) - 1]} ${y}`
  return `${Number(d)}${d === '01' ? 'er' : ''} ${months[Number(m) - 1]} ${y}`
}

export const yearOf = (date: string) => Number(date.slice(0, 4))

/** Traduit les noms de Grand Prix Ergast (« British Grand Prix » → « GP British »). */
const GP_NAMES: Record<string, string> = {
  British: 'Grande-Bretagne', Monaco: 'Monaco', Italian: 'Italie', French: 'France', German: 'Allemagne', Belgian: 'Belgique',
  Dutch: 'Pays-Bas', Spanish: 'Espagne', Swiss: 'Suisse', Argentine: 'Argentine', 'United States': 'États-Unis',
  Portuguese: 'Portugal', Moroccan: 'Maroc', Mexican: 'Mexique', 'South African': 'Afrique du Sud', Austrian: 'Autriche',
  Canadian: 'Canada', Brazilian: 'Brésil', Swedish: 'Suède', Japanese: 'Japon', Australian: 'Australie',
  Hungarian: 'Hongrie', European: 'Europe', 'San Marino': 'Saint-Marin', Malaysian: 'Malaisie', Bahrain: 'Bahreïn',
  Chinese: 'Chine', Turkish: 'Turquie', Singapore: 'Singapour', 'Abu Dhabi': 'Abu Dhabi', Korean: 'Corée',
  Indian: 'Inde', Russian: 'Russie', Azerbaijan: 'Azerbaïdjan', 'Saudi Arabian': 'Arabie saoudite', Qatar: 'Qatar',
  Miami: 'Miami', 'Las Vegas': 'Las Vegas', 'Emilia Romagna': 'Émilie-Romagne', Styrian: 'Styrie', 'Eifel': 'Eifel',
  Tuscan: 'Toscane', Sakhir: 'Sakhir', '70th Anniversary': '70e anniversaire', Pacific: 'Pacifique', Luxembourg: 'Luxembourg',
  Caesars: 'Caesars Palace', 'Dallas': 'Dallas', 'Detroit': 'Detroit',
  'Mexico City': 'Mexico', 'São Paulo': 'São Paulo', Madrid: 'Madrid', Indianapolis: 'Indianapolis 500',
  Pescara: 'Pescara', 'United States West': 'États-Unis Ouest',
}

export function raceNameFr(name: string): string {
  if (name === 'Indianapolis 500') return 'Indianapolis 500'
  const m = name.match(/^(.*) Grand Prix$/)
  if (!m) return name
  const key = m[1].trim()
  return `GP ${GP_NAMES[key] ?? key}`
}

/** Fichier statique servi depuis public/ (compatible base: './' + HashRouter). */
export const staticUrl = (path: string) => new URL(path, document.baseURI).href
