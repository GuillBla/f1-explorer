/** Shared types of the Technique module. */

export type PartId =
  | 'frontWing'
  | 'wheels'
  | 'suspension'
  | 'brakes'
  | 'halo'
  | 'cockpit'
  | 'sidepods'
  | 'floor'
  | 'plank'
  | 'diffuser'
  | 'rearWing'
  | 'engineCover'
  | 'powerUnit'

export type SheetId = 'effet-de-sol' | 'drs' | 'ers' | 'pneus' | 'freins'

export interface KeyFigure {
  label: string
  value: string
  /** Optional precision shown in small print (source, context). */
  note?: string
}

export interface RegulationStep {
  year: string
  text: string
}

export interface PartInfo {
  id: PartId
  name: string
  short: string
  /** One-sentence role. */
  role: string
  /** How it works, a few paragraphs. */
  how: string[]
  figures: KeyFigure[]
  regulation: RegulationStep[]
  /** What changes with the 2026 regulations. */
  y2026: string
  /** Related pedagogic sheet. */
  sheet?: SheetId
  /** Is the part relevant to the wind tunnel view. */
  aero?: boolean
}

export type Vec3 = [number, number, number]
