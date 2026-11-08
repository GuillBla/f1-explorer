import { memo, useMemo } from 'react'
import { geoMercator, geoPath } from 'd3-geo'
import type { TrackFeature } from '../lib/data'

/** Small static SVG outline of a track (used in cards). */
export const TrackSilhouette = memo(function TrackSilhouette({
  feature, width = 160, height = 110, stroke = 'currentColor', strokeWidth = 2.5, className,
}: { feature?: TrackFeature; width?: number; height?: number; stroke?: string; strokeWidth?: number; className?: string }) {
  const d = useMemo(() => {
    if (!feature) return null
    const pad = strokeWidth * 2
    const proj = geoMercator().fitExtent([[pad, pad], [width - pad, height - pad]], feature)
    return geoPath(proj)(feature)
  }, [feature, width, height, strokeWidth])

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} role="img" aria-label="Silhouette du tracé">
      {d ? (
        <path d={d} fill="none" stroke={stroke} strokeWidth={strokeWidth} strokeLinejoin="round" strokeLinecap="round" />
      ) : (
        <text x={width / 2} y={height / 2} textAnchor="middle" className="fill-muted text-[10px]">Tracé indisponible</text>
      )}
    </svg>
  )
})
