import { createContext, useContext, useEffect, useMemo, useRef, type DependencyList, type ReactNode, type RefObject } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import type * as THREE from 'three'
import { useExplorerStore } from '../store'
import type { PartId, Vec3 } from '../types'
import { applyVisualState, cloneSet, createMatSet, createPuSet, disposeSet, type MatSet, type PuSet } from './materials'

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
/* Part: per-component materials, hover / select, registry             */
/* ------------------------------------------------------------------ */

/** Object3D of each part, used by the camera rig to frame a selection. */
export const partRegistry = new Map<PartId, THREE.Object3D>()

interface PartMats {
  mats: MatSet
  pu: PuSet | null
}
const PartContext = createContext<PartMats | null>(null)

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

export function Part({ id, children }: { id: PartId; children: ReactNode }) {
  const { interactive, base, basePu, ghost: ghostCar } = useCar()
  const isPu = id === 'powerUnit'
  const value = useMemo<PartMats>(
    () => ({ mats: cloneSet(base), pu: isPu ? cloneSet(basePu) : null }),
    [base, basePu, isPu],
  )
  useEffect(
    () => () => {
      disposeSet(value.mats)
      if (value.pu) disposeSet(value.pu)
    },
    [value],
  )

  const hovered = useExplorerStore((s) => interactive && s.hovered === id)
  const selected = useExplorerStore((s) => interactive && s.selected === id)
  const xray = useExplorerStore((s) => interactive && s.xray)
  const setHovered = useExplorerStore((s) => s.setHovered)
  const select = useExplorerStore((s) => s.select)

  useEffect(() => {
    const ghost = (xray && !isPu) || ghostCar
    applyVisualState(value.mats, { hovered, selected, ghost, ghostOpacity: ghostCar ? 0.22 : undefined })
    if (value.pu) applyVisualState(value.pu, { hovered, selected, ghost: false })
  }, [value, hovered, selected, xray, isPu, ghostCar])

  const ref = useRef<THREE.Group>(null)
  useEffect(() => {
    const obj = ref.current
    if (!interactive || !obj) return
    partRegistry.set(id, obj)
    return () => {
      if (partRegistry.get(id) === obj) partRegistry.delete(id)
    }
  }, [id, interactive])

  // In x-ray mode the ghosted bodywork lets the events through to the power unit.
  const passThrough = () => useExplorerStore.getState().xray && !isPu

  const handlers = interactive
    ? {
        onPointerOver: (e: ThreeEvent<PointerEvent>) => {
          if (passThrough()) return
          e.stopPropagation()
          setHovered(id)
          document.body.style.cursor = 'pointer'
        },
        onPointerOut: (e: ThreeEvent<PointerEvent>) => {
          if (passThrough()) return
          e.stopPropagation()
          if (useExplorerStore.getState().hovered === id) setHovered(null)
          document.body.style.cursor = ''
        },
        onClick: (e: ThreeEvent<MouseEvent>) => {
          if (passThrough()) return
          e.stopPropagation()
          select(id)
        },
      }
    : {}

  return (
    <group ref={ref} name={id} {...handlers}>
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
  return <group ref={ref}>{children}</group>
}
