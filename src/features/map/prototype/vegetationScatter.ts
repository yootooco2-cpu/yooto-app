import type { GeoJSONSource, Map as MapboxMap, GeoJSONFeature } from 'mapbox-gl';

import { ensureTreeSprites, removeTreeSprites, treeImageId, type TreeSpecies } from './treeSprites';

/**
 * PROTOTYPE — Végétation NATIONALE (France entière), fidèle au terrain, légère.
 *
 * Principe : on NE TRANSPORTE AUCUNE donnée d'arbres. On dérive des points d'arbres 2.5D
 * au runtime, UNIQUEMENT à l'intérieur des polygones de végétation RÉELS déjà présents dans
 * les tuiles vectorielles Mapbox (landuse / landcover / national-park) — donc partout où la
 * donnée indique une zone verte, quelle que soit la ville. Aucun placement hors zones vertes.
 *
 * Tuilage / chargement progressif : on s'appuie sur le pipeline de tuiles Mapbox (déjà
 * tuilé/cullé/LOD). À chaque `moveend` (débouncé) et seulement à zoom élevé, on interroge les
 * polygones VISIBLES (`queryRenderedFeatures`), on y échantillonne des points (grille jitterée
 * DÉTERMINISTE par id → stable, aucun scintillement), plafonnés pour la performance.
 *
 * Réversible (`removeVegetationScatter`). Web-only (chargé par MapEngine.web.tsx).
 */

export const SCATTER_SOURCE_ID = 'veg-scatter';
export const SCATTER_LAYER_ID = 'veg-scatter-layer';

const MIN_ZOOM = 14.5; // arbres individuels seulement à zoom élevé (parcs lisibles)
const GLOBAL_CAP = 650; // plafond dur de points affichés → protège le GPU/CPU mobile
const PER_FEATURE_CAP = 34; // évite qu'un grand bois sature à lui seul

/** Config par classe de végétation : pas de grille (≈ espacement) + essences plausibles.
 *  Les pelouses nues (`grass`/`pitch`) sont volontairement ÉCARTÉES (une pelouse n'est pas
 *  une forêt) → fidélité : arbres dans parcs/bois/jardins/cimetières, pas sur un gazon. */
interface ClassCfg {
  step: number; // espacement de grille en degrés (~ densité)
  species: TreeSpecies[];
}
const CLASS_CFG: Record<string, ClassCfg> = {
  wood: { step: 0.00028, species: ['pin', 'micocoulier', 'cypres', 'platane'] },
  national_park: { step: 0.00042, species: ['pin', 'micocoulier', 'cypres'] },
  park: { step: 0.00038, species: ['platane', 'micocoulier', 'olivier'] },
  garden: { step: 0.00034, species: ['micocoulier', 'olivier', 'platane'] },
  cemetery: { step: 0.00048, species: ['cypres', 'olivier'] },
  scrub: { step: 0.00062, species: ['olivier', 'pin'] },
};

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
// Polygone = [exterior, ...holes]. Dans l'anneau extérieur ET dans aucun trou.
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

/** Échantillonne des arbres à l'intérieur d'un polygone (grille jitterée déterministe). */
function scatterPolygon(poly: Ring[], cfg: ClassCfg, seed0: number, out: ScatterPoint[]): void {
  // bbox
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
      // saut aléatoire déterministe → grille non mécanique, densité < 100%
      if (rand(s) < 0.38) continue;
      const jx = x + (rand(s + 1) - 0.5) * step * 0.8;
      const jy = y + (rand(s + 2) - 0.5) * step * 0.8;
      if (!pointInPolygon(jx, jy, poly)) continue;
      const species = cfg.species[Math.floor(rand(s + 3) * cfg.species.length)];
      const size = 0.78 + rand(s + 4) * 0.5;
      out.push({ lng: jx, lat: jy, species, size, sort: Math.round((60 - jy) * 10000) });
      n++;
    }
  }
}

function featureSeed(f: GeoJSONFeature): number {
  if (typeof f.id === 'number') return f.id % 1_000_000;
  // fallback stable : 1re coordonnée arrondie
  const g = f.geometry;
  if (g.type === 'Polygon') return Math.round((g.coordinates[0]?.[0]?.[0] ?? 0) * 1e4);
  if (g.type === 'MultiPolygon') return Math.round((g.coordinates[0]?.[0]?.[0]?.[0] ?? 0) * 1e4);
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
  const layers = ['landcover', 'landuse', 'national-park'].filter((l) => map.getLayer(l));
  if (!layers.length) {
    src.setData(empty);
    return;
  }
  let feats: GeoJSONFeature[] = [];
  try {
    feats = map.queryRenderedFeatures(undefined, { layers });
  } catch {
    src.setData(empty);
    return;
  }

  const pts: ScatterPoint[] = [];
  const seen = new Set<string>();
  for (const f of feats) {
    if (pts.length >= GLOBAL_CAP) break;
    const cls = String((f.properties as Record<string, unknown> | null)?.class ?? '');
    const cfg = CLASS_CFG[cls];
    if (!cfg) continue; // classe non arborée (grass/pitch/agriculture/résidentiel…) → ignorée
    const seed = featureSeed(f);
    const key = `${cls}:${seed}`;
    if (seen.has(key)) continue; // même feature morcelée sur plusieurs tuiles → une fois
    seen.add(key);
    const g = f.geometry;
    if (g.type === 'Polygon') scatterPolygon(g.coordinates as Ring[], cfg, seed, pts);
    else if (g.type === 'MultiPolygon') {
      let sub = 0;
      for (const poly of g.coordinates as Ring[][]) {
        scatterPolygon(poly, cfg, seed + sub * 1013, pts);
        sub++;
        if (pts.length >= GLOBAL_CAP) break;
      }
    }
    if (pts.length >= GLOBAL_CAP) break;
  }

  src.setData({
    type: 'FeatureCollection',
    features: pts.slice(0, GLOBAL_CAP).map((p) => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [p.lng, p.lat] },
      properties: { species: p.species, size: p.size, sort: p.sort },
    })),
  });
}

// Débounce simple (évite de recalculer à chaque frame de déplacement).
function debounce(fn: () => void, ms: number): () => void {
  let t: ReturnType<typeof setTimeout> | null = null;
  return () => {
    if (t) clearTimeout(t);
    t = setTimeout(fn, ms);
  };
}

let moveHandler: (() => void) | null = null;
let srcHandler: ((e: { sourceId?: string; isSourceLoaded?: boolean }) => void) | null = null;

/** Installe le moteur de scatter national (sprites + source + couche + recalcul débouncé). */
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
          ['*', ['get', 'size'], 0.32],
          16.5,
          ['*', ['get', 'size'], 0.58],
          17.5,
          ['*', ['get', 'size'], 0.8],
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true,
        'symbol-sort-key': ['get', 'sort'],
        'symbol-z-order': 'source',
      },
      paint: {
        'icon-opacity': ['interpolate', ['linear'], ['zoom'], MIN_ZOOM, 0, 15.2, 0.85, 16, 1],
      },
    });
  }
  const deb = debounce(() => rebuild(map), 220);
  moveHandler = deb;
  map.on('moveend', moveHandler);
  // Tuiles fraîchement chargées (source `composite`) → re-scatter. On IGNORE notre propre
  // source pour éviter toute boucle (setData → sourcedata → rebuild → setData …).
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
