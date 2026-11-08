#!/usr/bin/env node
/**
 * Génère public/data/history/champions.json depuis l'API Jolpica (Ergast).
 *
 * Usage (depuis la racine du projet) :
 *   node src/features/history/scripts/build-champions.mjs
 *
 * Contenu :
 *  - champions : top 3 pilotes et constructeurs de chaque saison (constructeurs depuis 1958)
 *  - winners   : vainqueur de chaque Grand Prix (pour les records calculés)
 *  - poles     : pilote parti en 1re position sur la grille de chaque GP
 *  - drivers   : dictionnaire des pilotes (nom, nationalité, date de naissance)
 *
 * La saison en cours est marquée `inProgress` ; l'application la rafraîchit à la volée via l'API.
 * Débit : une requête toutes les ~400 ms, avec retries sur HTTP 429.
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.jolpi.ca/ergast/f1'
const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../../public/data/history/champions.json')
const GAP = 400

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(path, params = {}) {
  const q = new URLSearchParams(params).toString()
  const url = `${BASE}/${path}.json${q ? `?${q}` : ''}`
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(GAP)
    const res = await fetch(url)
    if (res.status === 429) {
      const wait = 2000 * (attempt + 1)
      console.warn(`429 sur ${url}, attente ${wait} ms`)
      await sleep(wait)
      continue
    }
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`)
    return (await res.json()).MRData
  }
  throw new Error(`Abandon après plusieurs 429 : ${url}`)
}

async function getAllRaces(path) {
  const races = []
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const d = await get(path, { limit: 100, offset })
    total = Number(d.total)
    // Une course peut être répartie sur deux pages : on fusionne par saison/manche.
    for (const r of d.RaceTable.Races) {
      const last = races[races.length - 1]
      if (last && last.season === r.season && last.round === r.round) last.Results.push(...r.Results)
      else races.push(r)
    }
    offset += 100
  }
  return races
}

const drivers = {}
function addDriver(d) {
  drivers[d.driverId] = {
    name: `${d.givenName} ${d.familyName}`,
    nat: d.nationality,
    dob: d.dateOfBirth,
    code: d.code,
  }
  return d.driverId
}

async function main() {
  const schedule = await get('current', { limit: 100 })
  const currentYear = Number(schedule.RaceTable.season)
  const races = schedule.RaceTable.Races
  const lastRace = races[races.length - 1]
  const seasonOver = lastRace ? new Date(`${lastRace.date}T23:59:00Z`) < new Date() : false

  const champions = []
  for (let year = 1950; year <= currentYear; year++) {
    const ds = await get(`${year}/driverstandings`, { limit: 3 })
    const dList = ds.StandingsTable.StandingsLists[0]
    const drv = (dList?.DriverStandings ?? []).map((s) => ({
      id: addDriver(s.Driver),
      team: s.Constructors.map((c) => c.name).join(' / '),
      teamId: s.Constructors[0]?.constructorId ?? '',
      points: Number(s.points),
      wins: Number(s.wins),
    }))
    let cons = []
    if (year >= 1958) {
      const cs = await get(`${year}/constructorstandings`, { limit: 3 })
      cons = (cs.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? []).map((s) => ({
        id: s.Constructor.constructorId,
        name: s.Constructor.name,
        nat: s.Constructor.nationality,
        points: Number(s.points),
        wins: Number(s.wins),
      }))
    }
    champions.push({
      year,
      rounds: Number(dList?.round ?? 0),
      inProgress: year === currentYear && !seasonOver,
      drivers: drv,
      constructors: cons,
    })
    console.log(`${year} : ${drv[0] ? drivers[drv[0].id].name : '?'} / ${cons[0]?.name ?? '—'}`)
  }

  const toRow = (r) => {
    const res = r.Results[0]
    return {
      y: Number(r.season),
      r: Number(r.round),
      race: r.raceName,
      circuit: r.Circuit.circuitId,
      date: r.date,
      d: addDriver(res.Driver),
      team: res.Constructor.name,
    }
  }
  console.log('Vainqueurs…')
  const winners = (await getAllRaces('results/1')).map(toRow)
  console.log('Poles (grille)…')
  const poles = (await getAllRaces('grid/1/results')).map(toRow)

  const out = {
    generatedAt: new Date().toISOString(),
    source: 'Jolpica-F1 (api.jolpi.ca/ergast)',
    currentYear,
    champions,
    winners,
    poles,
    drivers,
  }
  await mkdir(dirname(OUT), { recursive: true })
  await writeFile(OUT, JSON.stringify(out))
  console.log(`Écrit : ${OUT} (${champions.length} saisons, ${winners.length} vainqueurs, ${poles.length} poles)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
