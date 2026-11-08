import { TYRE_COLORS } from '@/lib/api'

export const tyreColor = (compound: string | null | undefined) => TYRE_COLORS[compound ?? ''] ?? '#8b93a7'

const LABEL: Record<string, string> = { SOFT: 'S', MEDIUM: 'M', HARD: 'H', INTERMEDIATE: 'I', WET: 'W' }
export const TYRE_FR: Record<string, string> = {
  SOFT: 'Tendre', MEDIUM: 'Medium', HARD: 'Dur', INTERMEDIATE: 'Intermédiaire', WET: 'Pluie',
}

export function TyreBadge({ compound, age }: { compound: string; age?: number }) {
  const c = tyreColor(compound)
  return (
    <span className="inline-flex items-center gap-1.5" title={TYRE_FR[compound] ?? compound}>
      <span
        className="grid h-5 w-5 place-items-center rounded-full border-2 bg-bg text-[10px] font-black"
        style={{ borderColor: c, color: c }}
      >
        {LABEL[compound] ?? '?'}
      </span>
      {age != null && <span className="font-mono text-xs text-muted">{age} t.</span>}
    </span>
  )
}
