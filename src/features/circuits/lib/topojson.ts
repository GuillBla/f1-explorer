/**
 * Minimal TopoJSON → GeoJSON decoder (Polygon / MultiPolygon only), enough for world-atlas.
 * Avoids adding the topojson-client dependency.
 */
import type { Feature, FeatureCollection, MultiPolygon, Polygon, Position } from 'geojson'

interface TopoGeometry {
  type: 'Polygon' | 'MultiPolygon' | string
  arcs?: number[][] | number[][][]
  id?: string
  properties?: Record<string, unknown>
}
export interface Topology {
  type: 'Topology'
  transform?: { scale: [number, number]; translate: [number, number] }
  arcs: number[][][]
  objects: Record<string, { type: 'GeometryCollection'; geometries: TopoGeometry[] }>
}

export function topoFeatures(topo: Topology, objectName: string): FeatureCollection<Polygon | MultiPolygon> {
  const t = topo.transform
  // decode delta-encoded, quantized arcs once
  const arcs: Position[][] = topo.arcs.map((arc) => {
    let x = 0, y = 0
    return arc.map((p) => {
      if (t) {
        x += p[0]; y += p[1]
        return [x * t.scale[0] + t.translate[0], y * t.scale[1] + t.translate[1]]
      }
      return [p[0], p[1]]
    })
  })
  const ring = (indices: number[]): Position[] => {
    const out: Position[] = []
    indices.forEach((i, k) => {
      const a = i < 0 ? arcs[~i].slice().reverse() : arcs[i]
      out.push(...(k === 0 ? a : a.slice(1)))
    })
    return out
  }
  const obj = topo.objects[objectName]
  const features: Feature<Polygon | MultiPolygon>[] = []
  for (const g of obj.geometries) {
    if (g.type === 'Polygon' && g.arcs) {
      features.push({ type: 'Feature', id: g.id, properties: g.properties ?? {}, geometry: { type: 'Polygon', coordinates: (g.arcs as number[][]).map(ring) } })
    } else if (g.type === 'MultiPolygon' && g.arcs) {
      features.push({ type: 'Feature', id: g.id, properties: g.properties ?? {}, geometry: { type: 'MultiPolygon', coordinates: (g.arcs as number[][][]).map((p) => p.map(ring)) } })
    }
  }
  return { type: 'FeatureCollection', features }
}
