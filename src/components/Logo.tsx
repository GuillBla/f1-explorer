import clsx from 'clsx'

/**
 * "Damier" logo: chequered-flag tile + F1 (heavy) EXPLORER (light, tracked).
 * Takes currentColor, so it works on the red band, on white and on carbon.
 */
export default function Logo({ className, size = 18 }: { className?: string; size?: number }) {
  const cell = (size * 0.84) / 2
  return (
    <span className={clsx('inline-flex items-center gap-2.5 leading-none whitespace-nowrap', className)} style={{ fontSize: size }}>
      <span
        aria-hidden
        className="inline-block shrink-0"
        style={{
          width: size * 0.95,
          height: size * 0.95,
          border: '1.5px solid currentColor',
          background: `conic-gradient(currentColor 25%, transparent 0 50%, currentColor 0 75%, transparent 0) 0 0 / ${cell}px ${cell}px`,
        }}
      />
      <span className="font-wide">
        <span className="font-extrabold tracking-tight">F1</span>{' '}
        <span className="font-normal tracking-[0.08em]">EXPLORER</span>
      </span>
    </span>
  )
}
