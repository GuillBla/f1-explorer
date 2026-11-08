import type { ChampionsData, RaceRow } from '../data/types'
import { ageAt, natFr, raceNameFr, teamBrand } from './format'

export interface Tally { key: string; label: string; value: number; years?: number[]; sub?: string }

const sortTally = (t: Tally[]) => t.sort((a, b) => b.value - a.value || a.label.localeCompare(b.label))

export function completed(d: ChampionsData) {
  return d.champions.filter((c) => !c.inProgress && c.drivers.length)
}

export function driverTitles(d: ChampionsData): Tally[] {
  const m = new Map<string, Tally>()
  for (const c of completed(d)) {
    const id = c.drivers[0].id
    const t = m.get(id) ?? { key: id, label: d.drivers[id]?.name ?? id, value: 0, years: [], sub: natFr(d.drivers[id]?.nat ?? '') }
    t.value++
    t.years!.push(c.year)
    m.set(id, t)
  }
  return sortTally([...m.values()])
}

export function constructorTitles(d: ChampionsData): Tally[] {
  const m = new Map<string, Tally>()
  for (const c of completed(d)) {
    const con = c.constructors[0]
    if (!con) continue
    const brand = teamBrand(con.name)
    const t = m.get(brand) ?? { key: brand, label: brand, value: 0, years: [], sub: natFr(con.nat) }
    t.value++
    t.years!.push(c.year)
    m.set(brand, t)
  }
  return sortTally([...m.values()])
}

export function nationalityTitles(d: ChampionsData): Tally[] {
  const m = new Map<string, Tally & { champs: Set<string> }>()
  for (const c of completed(d)) {
    const id = c.drivers[0].id
    const nat = natFr(d.drivers[id]?.nat ?? '?')
    const t = m.get(nat) ?? { key: nat, label: nat, value: 0, years: [], champs: new Set<string>() }
    t.value++
    t.years!.push(c.year)
    t.champs.add(d.drivers[id]?.name ?? id)
    m.set(nat, t)
  }
  return sortTally(
    [...m.values()].map(({ champs, ...t }) => ({ ...t, sub: `${champs.size} pilote${champs.size > 1 ? 's' : ''}` })),
  )
}

/** Compte par pilote (victoires ou départs en pole). */
export function countByDriver(d: ChampionsData, rows: RaceRow[]): Tally[] {
  const m = new Map<string, Tally>()
  for (const r of rows) {
    const t = m.get(r.d) ?? { key: r.d, label: d.drivers[r.d]?.name ?? r.d, value: 0 }
    t.value++
    m.set(r.d, t)
  }
  return sortTally([...m.values()])
}

export function countByTeam(rows: RaceRow[]): Tally[] {
  const m = new Map<string, Tally>()
  for (const r of rows) {
    const b = teamBrand(r.team)
    const t = m.get(b) ?? { key: b, label: b, value: 0 }
    t.value++
    m.set(b, t)
  }
  return sortTally([...m.values()])
}

/** Vainqueurs classés par âge le jour de la course (première victoire seulement). */
export function winnersByAge(d: ChampionsData, order: 'young' | 'old') {
  const seen = new Map<string, { id: string; name: string; race: string; year: number; date: string; age: ReturnType<typeof ageAt> }>()
  const rows = order === 'young' ? d.winners : [...d.winners].reverse()
  for (const w of rows) {
    const info = d.drivers[w.d]
    if (!info?.dob || seen.has(w.d)) continue
    // Pour le plus âgé, on garde la DERNIÈRE victoire (parcours inversé).
    seen.set(w.d, { id: w.d, name: info.name, race: w.race, year: w.y, date: w.date, age: ageAt(info.dob, w.date) })
  }
  return [...seen.values()].sort((a, b) => (order === 'young' ? a.age.totalDays - b.age.totalDays : b.age.totalDays - a.age.totalDays))
}

/** Âge des champions à la date de la dernière course de la saison (approximation). */
export function championsByAge(d: ChampionsData) {
  const lastRace = new Map<number, string>()
  for (const w of d.winners) if ((lastRace.get(w.y) ?? '') < w.date) lastRace.set(w.y, w.date)
  return completed(d)
    .map((c) => {
      const id = c.drivers[0].id
      const info = d.drivers[id]
      const date = lastRace.get(c.year)
      if (!info?.dob || !date) return null
      return { id, name: info.name, year: c.year, age: ageAt(info.dob, date) }
    })
    .filter((x): x is NonNullable<typeof x> => !!x)
}

/** Plus grand nombre de victoires sur une saison. */
export function winsInSeason(d: ChampionsData): Tally[] {
  const m = new Map<string, Tally>()
  for (const w of d.winners) {
    const k = `${w.d}-${w.y}`
    const t = m.get(k) ?? { key: k, label: d.drivers[w.d]?.name ?? w.d, value: 0, years: [w.y] }
    t.value++
    m.set(k, t)
  }
  return sortTally([...m.values()])
}

/** Plus longue série de victoires consécutives (Grands Prix du championnat, Indy 500 exclu). */
export function winStreaks(d: ChampionsData): { id: string; name: string; length: number; from: string; to: string }[] {
  const races = d.winners.filter((w) => w.circuit !== 'indianapolis')
  const out: { id: string; name: string; length: number; from: string; to: string }[] = []
  let i = 0
  while (i < races.length) {
    let j = i
    while (j + 1 < races.length && races[j + 1].d === races[i].d) j++
    out.push({
      id: races[i].d,
      name: d.drivers[races[i].d]?.name ?? races[i].d,
      length: j - i + 1,
      from: `${raceNameFr(races[i].race)} ${races[i].y}`,
      to: `${raceNameFr(races[j].race)} ${races[j].y}`,
    })
    i = j + 1
  }
  return out.sort((a, b) => b.length - a.length)
}

export function distinctWinners(d: ChampionsData) {
  return new Set(d.winners.map((w) => w.d)).size
}
