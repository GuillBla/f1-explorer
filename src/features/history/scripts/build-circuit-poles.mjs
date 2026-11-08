#!/usr/bin/env node
/**
 * Génère public/data/history/circuit-poles.json : meilleur temps de qualification du poleman
 * à Monza et Monaco, d'après Jolpica (`circuits/{id}/qualifying/1`).
 * Les données de qualification Jolpica ne sont complètes qu'à partir de 1994 environ.
 *
 * Usage : node src/features/history/scripts/build-circuit-poles.mjs
 */
import { writeFile, mkdir } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://api.jolpi.ca/ergast/f1'
const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../../public/data/history/circuit-poles.json')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function get(path, params) {
  const url = `${BASE}/${path}.json?${new URLSearchParams(params)}`
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(500)
    const res = await fetch(url)
    if (res.status === 429) { await sleep(3000 * (attempt + 1)); continue }
    if (!res.ok) throw new Error(`HTTP ${res.status} sur ${url}`)
    return (await res.json()).MRData
  }
  throw new Error(`Abandon : ${url}`)
}

const toSeconds = (t) => {
  if (!t) return NaN
  const [m, s] = t.includes(':') ? t.split(':') : ['0', t]
  return Number(m) * 60 + Number(s)
}

async function circuit(id) {
  const poles = []
  let name = id
  let offset = 0
  let total = Infinity
  while (offset < total) {
    const d = await get(`circuits/${id}/qualifying/1`, { limit: 100, offset })
    total = Number(d.total)
    for (const race of d.RaceTable.Races) {
      name = race.Circuit.circuitName
      const q = race.QualifyingResults[0]
      // Meilleur des temps disponibles (Q1/Q2/Q3).
      const times = [q.Q1, q.Q2, q.Q3].filter(Boolean)
      const best = times.map((t) => ({ t, s: toSeconds(t) })).filter((x) => !Number.isNaN(x.s)).sort((a, b) => a.s - b.s)[0]
      if (!best) continue
      poles.push({
        year: Number(race.season),
        driver: `${q.Driver.givenName} ${q.Driver.familyName}`,
        team: q.Constructor.name,
        time: best.t,
        seconds: Math.round(best.s * 1000) / 1000,
      })
    }
    offset += 100
  }
  return { name, poles }
}

const out = { generatedAt: new Date().toISOString(), circuits: {} }
for (const id of ['monza', 'monaco']) {
  out.circuits[id] = await circuit(id)
  console.log(id, out.circuits[id].poles.length)
}
await mkdir(dirname(OUT), { recursive: true })
await writeFile(OUT, JSON.stringify(out))
console.log(`Écrit : ${OUT}`)
