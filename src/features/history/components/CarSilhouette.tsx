import { useId } from 'react'
import type { CarShape } from '../data/types'

/**
 * Silhouettes de profil stylisées (pas de reproduction fidèle d'un modèle réel) :
 * chaque forme résume les codes visuels d'une époque. Voiture orientée vers la droite.
 */
interface Props {
  shape: CarShape
  color: string
  accent?: string
  className?: string
  title?: string
}

const GROUND = 72

function Wheel({ x, r, wide = false, rim = 0.45, cover = false }: { x: number; r: number; wide?: boolean; rim?: number; cover?: boolean }) {
  return (
    <g>
      <circle cx={x} cy={GROUND - r} r={r} fill="#0d0f14" stroke="#2c3240" strokeWidth={wide ? 2.5 : 1.5} />
      {cover ? (
        <circle cx={x} cy={GROUND - r} r={r * 0.62} fill="#1f2430" stroke="#3a4152" strokeWidth={1} />
      ) : (
        <circle cx={x} cy={GROUND - r} r={r * rim} fill="none" stroke="#596075" strokeWidth={1.2} />
      )}
      <circle cx={x} cy={GROUND - r} r={1.6} fill="#8b93a7" />
    </g>
  )
}

function Helmet({ x, y, color = '#f2f2f2' }: { x: number; y: number; color?: string }) {
  return (
    <g>
      <circle cx={x} cy={y} r={6.2} fill={color} />
      <path d={`M${x - 1} ${y - 2.5} h7 a6 6 0 0 1 -0.8 4 h-6.2 z`} fill="#11151d" />
    </g>
  )
}

function Halo({ x }: { x: number }) {
  return <path d={`M${x - 14} 44 Q${x - 4} 30 ${x + 14} 34 L${x + 18} 42`} fill="none" stroke="#1a1d24" strokeWidth={3} strokeLinecap="round" />
}

export function CarSilhouette({ shape, color, accent = '#f2f2f2', className, title }: Props) {
  const gid = useId().replace(/:/g, '')
  const shade = `url(#shade-${gid})`
  return (
    <svg viewBox="0 0 240 80" className={className} role="img" aria-label={title ?? 'Silhouette stylisée de monoplace'}>
      <defs>
        <linearGradient id={`shade-${gid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity="0.22" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.35" />
        </linearGradient>
      </defs>
      {/* ombre au sol */}
      <ellipse cx="120" cy={GROUND + 1.5} rx="100" ry="3" fill="#000" opacity="0.35" />
      {renderShape(shape, color, accent, shade)}
    </svg>
  )
}

function renderShape(shape: CarShape, c: string, a: string, shade: string) {
  switch (shape) {
    case 'cigar': {
      const body = 'M28 52 Q30 40 60 38 L150 36 Q205 36 214 46 Q218 52 212 58 Q200 62 150 62 L60 62 Q30 62 28 52 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <ellipse cx="214" cy="51" rx="2.5" ry="6" fill="#11151d" />
          <path d="M92 37 Q100 26 116 31 L118 36 Z" fill="#9fb4c8" opacity="0.7" />
          <Wheel x={58} r={16} rim={0.7} />
          <Wheel x={182} r={16} rim={0.7} />
          <Helmet x={100} y={31} color={a === '#f2f2f2' ? '#d9c79a' : a} />
          <path d="M126 60 L170 60" stroke="#d0d4da" strokeWidth={2} strokeLinecap="round" opacity="0.6" />
          <circle cx="160" cy="49" r="7" fill="#f2f2f2" />
          <text x="160" y="52" textAnchor="middle" fontSize="8" fontWeight="800" fill="#111">1</text>
        </g>
      )
    }
    case 'rear': {
      const body = 'M24 54 Q26 44 50 42 L130 38 Q190 40 218 52 Q220 58 210 60 L50 62 Q26 62 24 54 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <path d="M40 44 L110 41" stroke={a} strokeWidth={3} opacity="0.9" />
          <path d="M130 39 Q138 30 150 34 L150 39 Z" fill="#9fb4c8" opacity="0.7" />
          <Wheel x={52} r={15} rim={0.65} />
          <Wheel x={180} r={14} rim={0.65} />
          <Helmet x={124} y={33} color={a} />
          <path d="M30 50 Q20 48 16 52" stroke="#8b93a7" strokeWidth={2.5} fill="none" />
        </g>
      )
    }
    case 'wing': {
      const body = 'M24 56 L30 44 L120 40 L150 44 L224 56 L224 60 L30 62 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          {/* airbox */}
          <path d="M84 41 L92 22 L108 22 L112 40 Z" fill={c} />
          <path d="M84 41 L92 22 L108 22 L112 40 Z" fill={shade} />
          {/* aileron arrière */}
          <rect x="16" y="22" width="34" height="5" rx="1" fill={a} />
          <path d="M30 27 L34 44" stroke="#2c3240" strokeWidth={2.5} />
          <path d="M120 41 Q128 33 140 36 L142 42 Z" fill="#9fb4c8" opacity="0.7" />
          <Wheel x={52} r={17} wide />
          <Wheel x={184} r={14} wide />
          <Helmet x={118} y={35} color={a} />
          <path d="M150 50 L220 57" stroke={a} strokeWidth={2.5} />
          <path d="M210 60 L232 58" stroke={c} strokeWidth={3} />
        </g>
      )
    }
    case 'wedge': {
      const body = 'M22 58 L28 46 L96 42 L130 42 L150 46 L222 56 L222 62 L22 64 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          {/* ponton effet de sol */}
          <path d="M70 64 L70 52 L160 52 L176 64 Z" fill={a} opacity="0.85" />
          <path d="M70 64 L176 64" stroke="#11151d" strokeWidth={2} />
          <rect x="14" y="30" width="32" height="5" rx="1" fill={c} />
          <path d="M18 35 L20 48 M42 35 L40 48" stroke="#2c3240" strokeWidth={2.5} />
          <path d="M120 43 Q128 34 140 37 L144 44 Z" fill="#9fb4c8" opacity="0.7" />
          <Wheel x={52} r={17} wide />
          <Wheel x={184} r={14} wide />
          <Helmet x={118} y={36} color={a} />
        </g>
      )
    }
    case 'turbo': {
      const body = 'M22 58 L26 44 L100 42 L132 42 L152 46 L222 56 L224 62 L22 64 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <path d="M60 60 L200 58" stroke={a} strokeWidth={4} />
          {/* grand aileron arrière + aileron avant */}
          <rect x="10" y="24" width="38" height="8" rx="1" fill={a} />
          <path d="M14 32 L18 50 M44 32 L40 50" stroke="#2c3240" strokeWidth={3} />
          <path d="M212 62 L234 62" stroke={a} strokeWidth={3} />
          <path d="M122 43 Q130 34 142 37 L146 44 Z" fill="#9fb4c8" opacity="0.7" />
          <Wheel x={52} r={18} wide />
          <Wheel x={184} r={14} wide />
          <Helmet x={120} y={36} color={a} />
          <circle cx="40" cy="54" r="3" fill="#ff8a3d" opacity="0.8" />
        </g>
      )
    }
    case 'nose': {
      const body = 'M22 58 L26 44 L88 40 L112 30 L124 30 L140 40 L206 48 L226 50 L226 54 L208 56 L30 64 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <path d="M60 56 L170 52" stroke={a} strokeWidth={4} />
          <rect x="12" y="24" width="34" height="8" rx="1" fill={c} />
          <path d="M20 32 L24 50" stroke="#2c3240" strokeWidth={3} />
          <path d="M200 60 L236 60 L236 56" stroke={a} strokeWidth={3} fill="none" />
          <path d="M214 52 L214 60" stroke="#2c3240" strokeWidth={2} />
          <Wheel x={50} r={17} wide />
          <Wheel x={184} r={15} wide />
          <Helmet x={134} y={36} color={a} />
        </g>
      )
    }
    case 'modern': {
      const body = 'M20 58 L24 42 L80 38 L104 28 L120 28 L138 38 L200 44 L228 48 L228 52 L206 56 L30 64 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <path d="M50 56 L184 50" stroke={a} strokeWidth={3} />
          <path d="M60 38 L104 28" stroke={a} strokeWidth={2} opacity="0.8" />
          <rect x="10" y="22" width="34" height="9" rx="1" fill={c} />
          <path d="M10 22 L10 52 M44 22 L44 50" stroke="#2c3240" strokeWidth={2} />
          <path d="M198 62 L238 62 L238 55" stroke={a} strokeWidth={3} fill="none" />
          <path d="M150 52 L156 62" stroke="#2c3240" strokeWidth={2} />
          <Wheel x={50} r={16} wide />
          <Wheel x={186} r={15} wide />
          <Helmet x={132} y={35} color={a} />
        </g>
      )
    }
    case 'hybrid': {
      const body = 'M18 58 L22 42 L80 38 L104 30 L122 30 L140 40 L206 50 L230 58 L230 62 L30 64 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <path d="M60 58 L200 56" stroke={a} strokeWidth={3} />
          <path d="M90 36 L104 30" stroke={a} strokeWidth={2.5} />
          <rect x="8" y="20" width="36" height="10" rx="1" fill={c} />
          <path d="M8 20 L8 54 M44 20 L44 52" stroke="#2c3240" strokeWidth={2} />
          <path d="M206 66 L238 66 L238 58" stroke={a} strokeWidth={3} fill="none" />
          <Wheel x={50} r={16} wide />
          <Wheel x={190} r={15} wide />
          <Helmet x={132} y={36} color={a} />
          <Halo x={134} />
        </g>
      )
    }
    case 'groundEffect': {
      const body = 'M18 60 L22 42 L84 38 L106 30 L124 30 L140 40 L196 50 L232 60 L232 64 L28 66 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          {/* ponton sculpté */}
          <path d="M70 62 Q100 48 150 52 L176 62 Z" fill={a} opacity="0.9" />
          <path d="M6 18 Q26 14 46 18 L46 28 L6 28 Z" fill={c} />
          <path d="M6 18 L6 56 M46 18 L46 54" stroke="#2c3240" strokeWidth={2} />
          <path d="M200 68 L238 68 L236 60" stroke={a} strokeWidth={3} fill="none" />
          <Wheel x={50} r={18} wide cover />
          <Wheel x={190} r={17} wide cover />
          <Helmet x={132} y={36} color="#f2f2f2" />
          <Halo x={134} />
        </g>
      )
    }
    case 'active2026': {
      const body = 'M28 60 L32 42 L88 38 L108 31 L124 31 L140 40 L190 50 L222 60 L222 64 L36 66 Z'
      return (
        <g>
          <path d={body} fill={c} />
          <path d={body} fill={shade} />
          <path d="M76 62 Q104 50 146 53 L168 62 Z" fill={a} opacity="0.9" />
          {/* aileron arrière actif : volets écartés */}
          <path d="M14 20 L52 18" stroke={a} strokeWidth={4} strokeLinecap="round" />
          <path d="M14 30 L52 27" stroke={c} strokeWidth={5} strokeLinecap="round" />
          <path d="M18 30 L18 56 M48 28 L48 54" stroke="#2c3240" strokeWidth={2} />
          <path d="M196 68 L230 68 L228 61" stroke={a} strokeWidth={3} fill="none" />
          <Wheel x={58} r={17} wide cover />
          <Wheel x={184} r={16} wide cover />
          <Helmet x={132} y={37} color="#f2f2f2" />
          <Halo x={134} />
        </g>
      )
    }
  }
}
