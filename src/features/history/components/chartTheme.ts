/** Réglages visuels communs aux graphiques recharts du module (tokens du thème). */
export const AXIS = { stroke: 'var(--color-muted)', fontSize: 11, tickLine: false, axisLine: false } as const
export const GRID = { stroke: 'var(--color-border)', strokeDasharray: '2 4', vertical: false } as const
export const TOOLTIP = {
  contentStyle: {
    background: 'var(--color-surface-2)',
    border: '1px solid var(--color-border)',
    borderRadius: 8,
    fontSize: 12,
    color: 'var(--color-text)',
  },
  labelStyle: { color: 'var(--color-text)', fontWeight: 700 },
  itemStyle: { color: 'var(--color-text)' },
  cursor: { fill: 'rgba(255,255,255,0.04)' },
} as const

/** Palette catégorielle validée pour fond sombre (ordre fixe, jamais cyclée). */
export const SERIES = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767']
