import { createContext, useContext, useEffect, useMemo, useRef, type DependencyList, type ReactNode, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'
import { useExplorerStore } from '../store'
import type { PartId, Vec3 } from '../types'
import { applyVisualState, cloneSet, createMatSet, createPuSet, disposeSet, MatBank, type MatKey, type MatSet, type PuSet, type VisualState } from './materials'

/* ------------------------------------------------------------------ */
/* Car-wide context                                                    */
/* ------------------------------------------------------------------ */

export interface CarContextValue {
  /** Explorer mode: hover / click / x-ray. False in the wind tunnel. */
  interactive: boolean
  base: MatSet
  basePu: PuSet
  /** Exploded factor 0..1 (animated). */
  explode: RefObject<number>
  /** Active aero flaps opening 0..1 (animated). */
  wingsOpen: RefObject<number>
  /** Wheel angular speed (rad/s). */
  wheelSpin: RefObject<number>
  /** Front wheel steering angle, radians (animated, + = left). */
  steer?: RefObject<number>
  /** Whole car rendered as a translucent ghost (following car in the wind tunnel). */
  ghost: boolean
}

const CarContext = createContext<CarContextValue | null>(null)

export function CarProvider({ value, children }: { value: CarContextValue; children: ReactNode }) {
  return <CarContext.Provider value={value}>{children}</CarContext.Provider>
}

export function useCar(): CarContextValue {
  const c = useContext(CarContext)
  if (!c) throw new Error('useCar must be used inside <CarProvider>')
  return c
}

/** Creates the shared base materials once per car and disposes them on unmount. */
export function useBaseMaterials() {
  const value = useMemo(() => ({ base: createMatSet(), basePu: createPuSet() }), [])
  useEffect(
    () => () => {
      disposeSet(value.base)
      disposeSet(value.basePu)
    },
    [value],
  )
  return value
}

/* ------------------------------------------------------------------ */
/* Disposable geometry helper                                          */
/* ------------------------------------------------------------------ */

type Disposable = { dispose: () => void }

/** useMemo for a record of geometries, disposed on unmount / when deps change. */
export function useGeometries<T extends Record<string, Disposable>>(factory: () => T, deps: DependencyList = []): T {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const v = useMemo(factory, deps)
  useEffect(
    () => () => {
      for (const g of Object.values(v)) g.dispose()
    },
    [v],
  )
  return v
}

/* ------------------------------------------------------------------ */
/* Registries (camera framing)                                         */
/* ------------------------------------------------------------------ */

/** Object3D of each part, used by the camera rig to frame a selection. */
export const partRegistry = new Map<PartId, THREE.Object3D>()
/** "Primary" instances of each sub-component (e.g. the right front tyre for 'wh.tyre'). */
export const subRegistry = new Map<string, Set<THREE.Object3D>>()

/* ------------------------------------------------------------------ */
/* Visual state (hover / selection / x-ray / isolation)                */
/* ------------------------------------------------------------------ */

const NONE: VisualState = { hovered: false, selected: false, ghost: false }

/**
 * Visual state of a part (sub = null) or of one of its sub-components. Encoded as a short string in
 * the store selector so components only re-render when their own state changes.
 */
function useVisual(partId: PartId, sub: string | null, interactive: boolean, ghostCar: boolean): VisualState {
  const code = useExplorerStore((s) => {
    if (!interactive) return ghostCar ? 'g' : ''
    const isPu = partId === 'powerUnit'
    const hov = s.hovered === partId && (sub === null || s.hoveredSub === sub)
    const sel = s.selected === partId && (sub === null || s.sub === null || s.sub === sub)
    const inFocus = s.sub ? sub === s.sub || (sub === null && s.selected === partId) : s.selected === partId
    const iso = s.isolate && s.selected !== null && !inFocus
    const xr = s.xray && !isPu && !(s.isolate && inFocus && s.selected !== null)
    return `${hov ? 'h' : ''}${sel ? 's' : ''}${iso ? 'i' : ''}${xr ? 'x' : ''}`
  })
  return useMemo<VisualState>(() => {
    if (code === '') return NONE
    if (code === 'g') return { hovered: false, selected: false, ghost: true, ghostOpacity: 0.22 }
    const iso = code.includes('i')
    return {
      hovered: code.includes('h'),
      selected: code.includes('s'),
      ghost: iso || code.includes('x'),
      ghostOpacity: iso ? 0.06 : undefined,
    }
  }, [code])
}

/* ------------------------------------------------------------------ */
/* Part: per-component materials, hover / select, registry             */
/* ------------------------------------------------------------------ */

interface PartCtx {
  partId: PartId
  mats: MatSet
  pu: PuSet | null
}
const PartContext = createContext<PartCtx | null>(null)

export function useMats(): MatSet {
  const c = useContext(PartContext)
  if (!c) throw new Error('useMats must be used inside <Part>')
  return c.mats
}

export function usePuMats(): PuSet {
  const c = useContext(PartContext)
  if (!c?.pu) throw new Error('usePuMats must be used inside <Part id="powerUnit">')
  return c.pu
}

/** Nearest sub-component id of an intersected object (walks up to the part group). */
function findSub(o: THREE.Object3D | null, stop: THREE.Object3D | null): string | null {
  while (o && o !== stop) {
    const s = o.userData?.sub as string | undefined
    if (s) return s
    o = o.parent
  }
  return null
}

/** Ghosted objects (x-ray bodywork, isolation) let pointer events through to what is behind. */
function isGhosted(o: THREE.Object3D) {
  const mat = (o as THREE.Mesh).material as THREE.Material | THREE.Material[] | undefined
  const m = Array.isArray(mat) ? mat[0] : mat
  return !!m?.userData?.ghost
}

export function Part({ id, children }: { id: PartId; children: ReactNode }) {
  const { interactive, base, basePu, ghost: ghostCar } = useCar()
  const isPu = id === 'powerUnit'
  const bank = useMemo(() => new MatBank<MatKey>(base), [base])
  const pu = useMemo(() => (isPu ? cloneSet(basePu) : null), [basePu, isPu])
  useEffect(
    () => () => {
      bank.dispose()
      if (pu) disposeSet(pu)
    },
    [bank, pu],
  )
  const value = useMemo<PartCtx>(() => ({ partId: id, mats: bank.set, pu }), [id, bank, pu])

  const vis = useVisual(id, null, interactive, ghostCar)
  useEffect(() => {
    bank.apply(vis)
    // PU internals never ghost with x-ray (useVisual excludes them), only in isolation
    if (pu) applyVisualState(pu, vis)
  }, [bank, pu, vis])

  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    const obj = ref.current
    if (!interactive || !obj) return
    partRegistry.set(id, obj)
    return () => {
      if (partRegistry.get(id) === obj) partRegistry.delete(id)
    }
  }, [id, interactive])

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          if (isGhosted(e.object)) return
          e.stopPropagation()
          useExplorerStore.getState().setHovered(id, findSub(e.object, ref.current))
          document.body.style.cursor = 'pointer'
        },
        onPointerOut: (e: ThreeEvent<PointerEvent>) => {
          if (isGhosted(e.object)) return
          e.stopPropagation()
          const st = useExplorerStore.getState()
          if (st.hovered === id && st.hoveredSub === findSub(e.object, ref.current)) st.setHovered(null)
          document.body.style.cursor = ''
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (isGhosted(e.object)) return
          e.stopPropagation()
          const sub = findSub(e.object, ref.current)
          const st = useExplorerStore.getState()
          if (sub) st.selectSub(id, sub)
          else st.select(id)
        },
      }
    : {}

  return (
    <group ref={ref} name={id} {...handlers}>
      <PartContext.Provider value={value}>{children}</PartContext.Provider>
    </group>
  )
}

/**
 * Clickable sub-component of a part (e.g. the front wing flap). Owns its materials so it can be
 * highlighted, isolated or ghosted on its own. `primary` instances are used to frame the camera
 * (e.g. only the right front tyre among the four).
 */
export function Sub({ id, children, primary = true }: { id: string; children: ReactNode; primary?: boolean }) {
  const parent = useContext(PartContext)
  if (!parent) throw new Error('<Sub> must be used inside <Part>')
  const { interactive, base, ghost: ghostCar } = useCar()
  const bank = useMemo(() => new MatBank<MatKey>(base), [base])
  useEffect(() => () => bank.dispose(), [bank])
  const vis = useVisual(parent.partId, id, interactive, ghostCar)
  useEffect(() => bank.apply(vis), [bank, vis])
  const value = useMemo<PartCtx>(() => ({ ...parent, mats: bank.set }), [parent, bank])

  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    const obj = ref.current
    if (!interactive || !primary || !obj) return
    let set = subRegistry.get(id)
    if (!set) subRegistry.set(id, (set = new Set()))
    set.add(obj)
    return () => {
      set.delete(obj)
    }
  }, [id, interactive, primary])

  return (
    <group ref={ref} userData={{ sub: id }}>
      <PartContext.Provider value={value}>{children}</PartContext.Provider>
    </group>
  )
}

/* ------------------------------------------------------------------ */
/* Exploded view offset                                                */
/* ------------------------------------------------------------------ */

/** Offsets its children along `dir` proportionally to the car's explode factor. */
export function Explode({ dir, children, position }: { dir: Vec3; children: ReactNode; position?: Vec3 }) {
  const { explode } = useCar()
  const ref = useRef<THREE.Group>(null)
  const p0 = position ?? [0, 0, 0]
  useFrame(() => {
    const g = ref.current
    if (!g) return
    const e = explode.current ?? 0
    g.position.set(p0[0] + dir[0] * e, p0[1] + dir[1] * e, p0[2] + dir[2] * e)
  })
  return (
    <group ref={ref} position={p0}>
      {children}
    </group>
  )
}
