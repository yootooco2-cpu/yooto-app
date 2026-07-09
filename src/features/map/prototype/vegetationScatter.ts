import type { GeoJSONSource, Map as MapboxMap, GeoJSONFeature } from 'mapbox-gl';

import { ensureTreeSprites, removeTreeSprites, type TreeSpecies } from './treeSprites';

/**
 * PROTOTYPE — Végétation NATIONALE (France entière), fidèle au terrain, légère.
 *
 * Principe : on NE TRANSPORTE AUCUNE donnée d'arbres. On dérive des points d'arbres 2.5D au
 * runtime, à partir des géométries RÉELLES des tuiles vectorielles Mapbox :
 *  1) DANS les polygones de végétation (landuse / landcover / national-park) → bois, parcs,
 *     jardins, prairies, cultures ;
 *  2) LE LONG des rues (`road-simple`) → alignements d'arbres (avenues plantées) : c'est ce qui
 *     fait « respirer » un centre-ville dense où les polygones verts sont rares.
 *
 * Tuilage / chargement progressif via le pipeline Mapbox. Recalcul débouncé à `moveend`, plafonné
 * pour la performance (caps durs). Déterministe (jitter par id) → stable, aucun scintillement.
 * Réversible (`removeVegetationScatter`). Web-only (chargé par MapEngine.web.tsx).
 */

export const SCATTER_SOURCE_ID = 'veg-scatter';
export const SCATTER_LAYER_ID = 'veg-scatter-layer';

const MIN_ZOOM = 14.2; // arbres individuels à zoom élevé (parcs & rues lisibles)
const GLOBAL_CAP = 1100; // plafond dur total → protège le GPU/CPU mobile
const PER_FEATURE_CAP = 55; // évite qu'un grand bois sature à lui seul
const STREET_CAP = 460; // budget dédié aux alignements de rue (sous le cap global)

interface ClassCfg {
  step: number; // espacement de grille en degrés (~ densité ; plus petit = plus dense)
  species: TreeSpecies[];
}
/** Végétation SURFACIQUE : arbres dans bois/parcs/jardins/cimetières/prairies/cultures. */
const CLASS_CFG: Record<string, ClassCfg> = {
  wood: { step: 0.0002, species: ['pin', 'micocoulier', 'cypres', 'platane'] },
  national_park: { step: 0.0003, species: ['pin', 'micocoulier', 'cypres'] },
  park: { step: 0.00026, species: ['platane', 'micocoulier', 'olivier'] },
  garden: { step: 0.00024, species: ['micocoulier', 'olivier', 'platane'] },
  cemetery: { step: 0.00038, species: ['cypres', 'olivier'] },
  scrub: { step: 0.0005, species: ['olivier', 'pin'] },
  grass: { step: 0.00058, species: ['platane', 'olivier'] }, // pelouses arborées (bords, squares)
  agriculture: { step: 0.00066, species: ['olivier', 'micocoulier'] },
};

/** Végétation LINÉAIRE : arbres d'alignement le long des rues (avenues/boulevards/rues). */
interface StreetCfg {
  step: number; // espacement entre arbres le long de la rue (degrés)
  offset: number; // décalage perpendiculaire de chaque côté (degrés)
  skip: number; // proba de sauter un arbre (irrégularité naturelle)
  species: TreeSpecies[];
}
const STREET_CFG: StreetCfg = { step: 0.00024, offset: 0.00006, skip: 0.3, species: ['platane', 'micocoulier'] };
const STREET_CLASSES = new Set(['primary', 'secondary', 'tertiary', 'street', 'street_limited', 'trunk']);

const frac = (x: number): number => x - Math.floor(x);
const rand = (seed: number): number => frac(Math.sin(seed * 127.1 + 11.7) * 43758.5453);

type Ring = number[][];
function pointInRing(lng: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];
    const intersect = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}
function pointInPolygon(lng: number, lat: number, poly: Ring[]): boolean {
  if (!poly.length || !pointInRing(lng, lat, poly[0])) return false;
  for (let h = 1; h < poly.length; h++) if (pointInRing(lng, lat, poly[h])) return false;
  return true;
}

interface ScatterPoint {
  lng: number;
  lat: number;
  species: TreeSpecies;
  size: number;
  sort: number;
}
const mkPoint = (lng: number, lat: number, species: TreeSpecies, size: number): ScatterPoint => ({
  lng,
  lat,
  species,
  size,
  sort: Math.round((60 - lat) * 10000),
});

/** Échantillonne des arbres à l'intérieur d'un polygone (grille jitterée déterministe). */
function scatterPolygon(poly: Ring[], cfg: ClassCfg, seed0: number, out: ScatterPoint[]): void {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of poly[0]) {
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  const step = cfg.step;
  let n = 0;
  let k = 0;
  for (let y = minY + step * 0.5; y <= maxY; y += step) {
    for (let x = minX + step * 0.5; x <= maxX; x += step) {
      if (n >= PER_FEATURE_CAP) return;
      k++;
      const s = seed0 + k;
      if (rand(s) < 0.14) continue; // densité un peu < 100 %, non mécanique
      const jx = x + (rand(s + 1) - 0.5) * step * 0.8;
      const jy = y + (rand(s + 2) - 0.5) * step * 0.8;
      if (!pointInPolygon(jx, jy, poly)) continue;
      const species = cfg.species[Math.floor(rand(s + 3) * cfg.species.length)];
      out.push(mkPoint(jx, jy, species, 0.85 + rand(s + 4) * 0.55));
      n++;
    }
  }
}

/** Plante des arbres le long d'une polyligne (rue), des deux côtés, à intervalle régulier. */
function scatterLine(coords: number[][], seed0: number, out: ScatterPoint[]): void {
  const { step, offset, skip, species } = STREET_CFG;
  let k = 0;
  let carry = 0;
  for (let i = 1; i < coords.length; i++) {
    const x0 = coords[i - 1][0];
    const y0 = coords[i - 1][1];
    const dx = coords[i][0] - x0;
    const dy = coords[i][1] - y0;
    const len = Math.hypot(dx, dy);
    if (len === 0) continue;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy; // perpendiculaire unitaire
    const py = ux;
    for (let d = step - carry; d <= len; d += step) {
      if (out.length >= STREET_CAP) return;
      k++;
      const s = seed0 + k;
      const bx = x0 + ux * d;
      const by = y0 + uy * d;
      for (const sign of [-1, 1] as const) {
        if (rand(s + (sign > 0 ? 7 : 3)) < skip) continue;
        const jx = bx + px * offset * sign;
        const jy = by + py * offset * sign;
        const sp = species[Math.floor(rand(s + sign * 2 + 2) * species.length)];
        out.push(mkPoint(jx, jy, sp, 0.82 + rand(s + 5) * 0.5));
      }
    }
    carry = (carry + len) % step;
  }
}

function featureSeed(f: GeoJSONFeature): number {
  if (typeof f.id === 'number') return f.id % 1_000_000;
  const g = f.geometry;
  if (g.type === 'Polygon') return Math.round((g.coordinates[0]?.[0]?.[0] ?? 0) * 1e4);
  if (g.type === 'MultiPolygon') return Math.round((g.coordinates[0]?.[0]?.[0]?.[0] ?? 0) * 1e4);
  if (g.type === 'LineString') return Math.round((g.coordinates[0]?.[0] ?? 0) * 1e4);
  if (g.type === 'MultiLineString') return Math.round((g.coordinates[0]?.[0]?.[0] ?? 0) * 1e4);
  return 1;
}

function rebuild(map: MapboxMap): void {
  const src = map.getSource(SCATTER_SOURCE_ID) as GeoJSONSource | undefined;
  if (!src) return;
  const empty = { type: 'FeatureCollection' as const, features: [] };
  if (map.getZoom() < MIN_ZOOM) {
    src.setData(empty);
    return;
  }

  const pts: ScatterPoint[] = [];
  const seen = new Set<string>();

  // 1) Végétation surfacique (polygones verts).
  const vegLayers = ['landcover', 'landuse', 'national-park'].filter((l) => map.getLayer(l));
  if (vegLayers.length) {
    let feats: GeoJSONFeature[] = [];
    try {
      feats = map.queryRenderedFeatures(undefined, { layers: vegLayers });
    } catch {
      feats = [];
    }
    for (const f of feats) {
      if (pts.length >= GLOBAL_CAP - STREET_CAP) break;
      const cls = String((f.properties as Record<string, unknown> | null)?.class ?? '');
      const cfg = CLASS_CFG[cls];
      if (!cfg) continue;
      const seed = featureSeed(f);
      const key = `p:${cls}:${seed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const g = f.geometry;
      if (g.type === 'Polygon') scatterPolygon(g.coordinates as Ring[], cfg, seed, pts);
      else if (g.type === 'MultiPolygon') {
        let sub = 0;
        for (const poly of g.coordinates as Ring[][]) {
          scatterPolygon(poly, cfg, seed + sub * 1013, pts);
          sub++;
          if (pts.length >= GLOBAL_CAP - STREET_CAP) break;
        }
      }
    }
  }

  // 2) Alignements d'arbres le long des rues (avenues plantées) — budget dédié.
  const streetPts: ScatterPoint[] = [];
  if (map.getLayer('road-simple')) {
    let roads: GeoJSONFeature[] = [];
    try {
      roads = map.queryRenderedFeatures(undefined, { layers: ['road-simple'] });
    } catch {
      roads = [];
    }
    for (const f of roads) {
      if (streetPts.length >= STREET_CAP) break;
      const cls = String((f.properties as Record<string, unknown> | null)?.class ?? '');
      if (!STREET_CLASSES.has(cls)) continue;
      const seed = featureSeed(f);
      const key = `s:${seed}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const g = f.geometry;
      if (g.type === 'LineString') scatterLine(g.coordinates as number[][], seed, streetPts);
      else if (g.type === 'MultiLineString') {
        let sub = 0;
        for (const line of g.coordinates as number[][][]) {
          scatterLine(line, seed + sub * 1013, streetPts);
          sub++;
          if (streetPts.length >= STREET_CAP) break;
        }
      }
    }
  }

  const all = pts.concat(streetPts).slice(0, GLOBAL_CAP);
  src.setData({
    type: 'FeatureCollection',
    features: all.map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { species: p.species, size: p.size, sort: p.sort },
    })),
  });
}

function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

let moveHandler: (() => void) | null = null;
let srcHandler: ((e: { sourceId?: string; isSourceLoaded?: boolean }) => void) | null = null;

/** Installe le moteur de scatter (sprites + source + couche + recalcul débouncé). */
export function installVegetationScatter(map: MapboxMap): void {
  ensureTreeSprites(map);
  if (!map.getSource(SCATTER_SOURCE_ID)) {
    map.addSource(SCATTER_SOURCE_ID, { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
  }
  if (!map.getLayer(SCATTER_LAYER_ID)) {
    map.addLayer({
      id: SCATTER_LAYER_ID,
      type: 'symbol',
      source: SCATTER_SOURCE_ID,
      minzoom: MIN_ZOOM,
      layout: {
        'icon-image': ['concat', 'tree-', ['get', 'species']],
        'icon-anchor': 'bottom',
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          MIN_ZOOM,
          ['*', ['get', 'size'], 0.42],
          16.5,
          ['*', ['get', 'size'], 0.78],
          17.5,
          ['*', ['get', 'size'], 1.02],
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'symbol-sort-key': ['get', 'sort'],
        'symbol-z-order': 'source',
      },
      paint: {
        'icon-opacity': ['interpolate', ['linear'], ['zoom'], MIN_ZOOM, 0, 14.8, 0.9, 16, 1],
      },
    });
  }
  const deb = debounce(() => rebuild(map), 220);
  moveHandler = deb;
  map.on('moveend', moveHandler);
  srcHandler = (e) => {
    if (e.sourceId && e.sourceId !== SCATTER_SOURCE_ID && e.isSourceLoaded) deb();
  };
  map.on('sourcedata', srcHandler as never);
  rebuild(map);
}

/** Réversibilité totale. */
export function removeVegetationScatter(map: MapboxMap): void {
  if (moveHandler) {
    map.off('moveend', moveHandler);
    moveHandler = null;
  }
  if (srcHandler) {
    map.off('sourcedata', srcHandler as never);
    srcHandler = null;
  }
  if (map.getLayer(SCATTER_LAYER_ID)) map.removeLayer(SCATTER_LAYER_ID);
  if (map.getSource(SCATTER_SOURCE_ID)) map.removeSource(SCATTER_SOURCE_ID);
  removeTreeSprites(map);
}
