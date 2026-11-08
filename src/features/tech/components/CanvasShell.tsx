import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { Loader } from '@/components/ui'
import type { Vec3 } from '../types'

let webglCache: boolean | null = null

/** Detects WebGL support once (creating a throwaway context). */
export function hasWebGL(): boolean {
  if (webglCache !== null) return webglCache
  try {
    const c = document.createElement('canvas')
    const gl = c.getContext('webgl2') ?? c.getContext('webgl')
    webglCache = !!gl
    const lose = gl?.getExtension('WEBGL_lose_context')
    lose?.loseContext()
  } catch {
    webglCache = false
  }
  return webglCache
}

class GlErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() {
    return { failed: true }
  }
  componentDidCatch(error: unknown) {
    console.error('[tech] 3D scene error', error)
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}

interface Props {
  children: ReactNode
  fallback: ReactNode
  camera: { position: Vec3; fov?: number }
  maxDpr?: number
  className?: string
  onPointerMissed?: () => void
}

/**
 * WebGL canvas with: support detection + error fallback, capped device pixel ratio,
 * and rendering paused when the canvas is scrolled out of view.
 */
export function CanvasShell({ children, fallback, camera, maxDpr = 1.75, className, onPointerMissed }: Props) {
  const [supported] = useState(hasWebGL)
  const [visible, setVisible] = useState(true)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = wrap.current
    if (!el || typeof IntersectionObserver === 'undefined') return
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.01 })
    io.observe(el)
    return () => io.disconnect()
  }, [])

  if (!supported) return <>{fallback}</>

  return (
    <div ref={wrap} className={className}>
      <GlErrorBoundary fallback={fallback}>
        <Suspense fallback={<Loader label="Préparation de la scène 3D…" />}>
          <Canvas
            dpr={[1, Math.min(maxDpr, typeof window !== 'undefined' ? window.devicePixelRatio : 1)]}
            camera={{ position: camera.position, fov: camera.fov ?? 40, near: 0.05, far: 120 }}
            gl={{ antialias: true, powerPreference: 'high-performance' }}
            frameloop={visible ? 'always' : 'never'}
            onPointerMissed={onPointerMissed}
            style={{ touchAction: 'none' }}
          >
            {children}
          </Canvas>
        </Suspense>
      </GlErrorBoundary>
    </div>
  )
}
