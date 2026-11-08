import type { ComponentType } from 'react'
import { NavLink, Navigate, useParams } from 'react-router-dom'
import clsx from 'clsx'
import { SHEETS } from '../content/sheets'
import type { SheetId } from '../types'
import { BrakesSheet } from './sheets/BrakesSheet'
import { DrsSheet } from './sheets/DrsSheet'
import { ErsSheet } from './sheets/ErsSheet'
import { GroundEffectSheet } from './sheets/GroundEffectSheet'
import { TyresSheet } from './sheets/TyresSheet'

const COMPONENTS: Record<SheetId, ComponentType> = {
  'effet-de-sol': GroundEffectSheet,
  drs: DrsSheet,
  ers: ErsSheet,
  pneus: TyresSheet,
  freins: BrakesSheet,
}

/** Pedagogic 2D sheets (no WebGL needed). */
export default function SheetsPage() {
  const { sheetId } = useParams()
  const current = SHEETS.find((s) => s.id === sheetId)
  if (!current) return <Navigate to={`/tech/fiches/${SHEETS[0].id}`} replace />
  const Sheet = COMPONENTS[current.id]
  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <nav aria-label="Fiches" className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {SHEETS.map((s) => (
          <NavLink
            key={s.id}
            to={`/tech/fiches/${s.id}`}
            className={({ isActive }) =>
              clsx(
                'shrink-0 rounded-lg border px-3 py-2 transition-colors lg:shrink',
                isActive ? 'border-f1 bg-f1/10' : 'border-border bg-surface hover:bg-surface-2',
              )
            }
          >
            <div className="text-sm font-bold">{s.title}</div>
            <div className="hidden text-xs text-muted lg:block">{s.summary}</div>
          </NavLink>
        ))}
      </nav>
      <article key={current.id}>
        <h2 className="mb-4 text-2xl font-black">{current.title}</h2>
        <Sheet />
      </article>
    </div>
  )
}
