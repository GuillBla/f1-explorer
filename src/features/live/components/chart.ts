/** Shared recharts styling (theme tokens). */
export const axisProps = {
  stroke: 'var(--color-muted)',
  tick: { fill: 'var(--color-muted)', fontSize: 11 },
  tickLine: false,
} as const

export const gridProps = { stroke: 'var(--color-border)', strokeDasharray: '3 3', vertical: false } as const

export const tooltipProps = {
  contentStyle: {
    background: 'var(--color-surface-2)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12,
  },
  labelStyle: { color: 'var(--color-text)', fontWeight: 700 },
  itemStyle: { padding: 0 },
} as const
