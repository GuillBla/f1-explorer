import { Link } from 'react-router-dom'
import { motion } from 'motion/react'
import type { Duel } from '../../data/duels'
import type { ChampionsData } from '../../data/types'
import { completed } from '../../lib/stats'
import { natFr } from '../../lib/format'

const A_COLOR = '#3987e5'
const B_COLOR = '#d95926'

interface Row { label: string; a: number; b: number }

/** Comparaison tête-à-tête entre deux pilotes, statistiques calculées depuis les données. */
export function DuelCard({ duel, data, index }: { duel: Duel; data: ChampionsData; index: number }) {
  const A = data.drivers[duel.a]
  const B = data.drivers[duel.b]
  if (!A || !B) return null

  const count = (rows: ChampionsData['winners'], id: string, from = 0, to = 9999) =>
    rows.filter((r) => r.d === id && r.y >= from && r.y <= to).length
  const titles = (id: string) => completed(data).filter((c) => c.drivers[0]?.id === id).length
  const season = data.champions.find((c) => c.year === duel.decisive)
  const pts = (id: string) => season?.drivers.find((x) => x.id === id)?.points

  const period = duel.from === duel.to ? `${duel.from}` : `${duel.from}-${duel.to}`
  const rows: Row[] = [
    { label: 'Titres (carrière)', a: titles(duel.a), b: titles(duel.b) },
    { label: 'Victoires (carrière)', a: count(data.winners, duel.a), b: count(data.winners, duel.b) },
    { label: 'Départs en pole (carrière)', a: count(data.poles, duel.a), b: count(data.poles, duel.b) },
    { label: `Victoires ${period}`, a: count(data.winners, duel.a, duel.from, duel.to), b: count(data.winners, duel.b, duel.from, duel.to) },
  ]
  const pa = pts(duel.a)
  const pb = pts(duel.b)
  if (pa !== undefined && pb !== undefined) rows.push({ label: `Points ${duel.decisive}`, a: pa, b: pb })

  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ delay: (index % 2) * 0.08, duration: 0.5 }}
      className="overflow-hidden rounded-2xl border border-border bg-surface"
    >
      <div className="relative flex items-stretch">
        <Side name={A.name} nat={natFr(A.nat)} color={A_COLOR} align="left" />
        <div className="absolute left-1/2 top-1/2 z-10 grid h-11 w-11 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-bg bg-text text-sm font-black text-bg">
          VS
        </div>
        <Side name={B.name} nat={natFr(B.nat)} color={B_COLOR} align="right" />
      </div>
      <div className="p-5">
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="text-xl font-black">{duel.title}</h3>
          <Link to={`/history/season/${duel.decisive}`} className="font-mono text-xs text-muted hover:text-f1">
            saison {duel.decisive} →
          </Link>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-text/85">{duel.text}</p>
        <div className="mt-4 space-y-2.5">
          {rows.map((r) => (
            <HeadToHead key={r.label} row={r} />
          ))}
        </div>
      </div>
    </motion.article>
  )
}

function Side({ name, nat, color, align }: { name: string; nat: string; color: string; align: 'left' | 'right' }) {
  const parts = name.split(' ')
  const last = parts.pop()
  return (
    <div
      className={`flex-1 px-5 py-5 ${align === 'right' ? 'text-right' : ''}`}
      style={{
        background: `linear-gradient(${align === 'left' ? '110deg' : '250deg'}, ${color}40, transparent 85%)`,
      }}
    >
      <p className="text-xs text-muted">{parts.join(' ')}</p>
      <p className="text-2xl font-black uppercase leading-none tracking-tight md:text-3xl">{last}</p>
      <p className="mt-1 text-xs font-semibold" style={{ color }}>
        {nat}
      </p>
    </div>
  )
}

function HeadToHead({ row }: { row: Row }) {
  const total = row.a + row.b || 1
  const fmt = (n: number) => (Number.isInteger(n) ? n : n.toFixed(1))
  return (
    <div>
      <div className="flex justify-between text-xs">
        <span className={`font-mono ${row.a >= row.b ? 'font-bold text-text' : 'text-muted'}`}>{fmt(row.a)}</span>
        <span className="text-muted">{row.label}</span>
        <span className={`font-mono ${row.b >= row.a ? 'font-bold text-text' : 'text-muted'}`}>{fmt(row.b)}</span>
      </div>
      <div className="mt-1 flex h-1.5 gap-0.5 overflow-hidden rounded-full">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${(row.a / total) * 100}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="rounded-l-full"
          style={{ background: A_COLOR }}
        />
        <div className="flex-1 rounded-r-full" style={{ background: B_COLOR }} />
      </div>
    </div>
  )
}
