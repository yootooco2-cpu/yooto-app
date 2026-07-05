import type { Map as MapboxMap } from 'mapbox-gl';

/**
 * PROTOTYPE — Infill végétal ancré sur l'Écusson (centre de Montpellier).
 *
 * But : donner une présence végétale VERTICALE crédible et légère au centre-ville, sans
 * attendre un dataset parfait. Non destiné à la prod telle quelle → isolé, réversible,
 * web-only (chargé depuis `MapEngine.web.tsx`, cible S1). Un seul point d'entrée :
 * `installEcussonTrees(map)` ajoute des sprites 2.5D + une source + une couche `symbol`.
 * `removeEcussonTrees(map)` défait tout (réversibilité totale).
 *
 * MÉTHODE D'ANCRAGE (procédural ANCRÉ, pas aléatoire) :
 *  - les arbres sont posés sur des LIEUX RÉELS ouverts et arborés de l'Écusson (Esplanade
 *    Charles-de-Gaulle, Promenade du Peyrou, Jardin des plantes, places, boulevards) —
 *    jamais au milieu d'une route, jamais sur une empreinte de bâtiment ;
 *  - alignements = polylignes réelles échantillonnées à pas régulier (~alignement d'avenue) ;
 *  - bosquets = petits amas autour d'un centre (jardins/squares) ;
 *  - un jitter DÉTERMINISTE (seed par index) casse tout effet « copier-coller »
 *    (position, taille, essence, rotation) → aucune forêt, aucun clone.
 */

export const TREE_SOURCE_ID = 'ecusson-trees';
export const TREE_LAYER_ID = 'ecusson-trees-layer';

type TreeSpecies = 'platane' | 'micocoulier' | 'pin' | 'olivier' | 'cypres';

interface TreeFeatureProps {
  species: TreeSpecies;
  size: number; // facteur de taille 0.75..1.35
  sort: number; // clé de tri en profondeur (sud/proche au-dessus)
}

// --- Jitter déterministe (pas de Math.random → placement reproductible) ---
const frac = (x: number): number => x - Math.floor(x);
const rand = (seed: number): number => frac(Math.sin(seed * 127.1 + 11.7) * 43758.5453);

// Essences plausibles à Montpellier (méditerranéennes).
const SPECIES_POOL: TreeSpecies[] = ['platane', 'micocoulier', 'pin', 'olivier', 'cypres'];

/**
 * Ancrages RÉELS (approximés) de l'Écusson — coordonnées [lon, lat].
 * `line` = alignement (avenue/boulevard/esplanade) ; `grove` = bosquet (jardin/square).
 */
type Anchor =
  | { kind: 'line'; species: TreeSpecies; from: [number, number]; to: [number, number]; count: number; jitter?: number }
  | { kind: 'grove'; species: TreeSpecies | 'mix'; center: [number, number]; radius: number; count: number };

const ANCHORS: Anchor[] = [
  // Esplanade Charles-de-Gaulle — double alignement de platanes (axe NNE)
  { kind: 'line', species: 'platane', from: [3.8792, 43.6108], to: [3.8808, 43.6122], count: 12 },
  { kind: 'line', species: 'platane', from: [3.8798, 43.61055], to: [3.8814, 43.61195], count: 12 },
  // Champ de Mars / esplanade basse (parking & allées arborées)
  { kind: 'grove', species: 'platane', center: [3.8786, 43.6100], radius: 0.0006, count: 9 },
  // Promenade du Peyrou (abords arborés)
  { kind: 'line', species: 'micocoulier', from: [3.8708, 43.6108], to: [3.8722, 43.6116], count: 8 },
  { kind: 'grove', species: 'mix', center: [3.8715, 43.6112], radius: 0.0007, count: 8 },
  // Jardin des plantes (bosquet dense, essences mêlées)
  { kind: 'grove', species: 'mix', center: [3.8722, 43.6141], radius: 0.0009, count: 15 },
  // Place de la Canourgue (petit square planté d'oliviers)
  { kind: 'grove', species: 'olivier', center: [3.8767, 43.6106], radius: 0.00035, count: 5 },
  // Boulevard du Jeu de Paume (alignement de trottoir)
  { kind: 'line', species: 'platane', from: [3.8735, 43.6083], to: [3.8765, 43.6092], count: 8 },
  // Boulevard Henri IV (vers le Peyrou / jardin des plantes)
  { kind: 'line', species: 'platane', from: [3.8712, 43.6120], to: [3.8720, 43.6138], count: 8 },
  // Accents de cyprès (verticales sombres) près des places
  { kind: 'grove', species: 'cypres', center: [3.8760, 43.6098], radius: 0.0004, count: 4 },
];

const LAT_REF = 43.616; // pour la clé de tri en profondeur (plus au sud = plus proche = au-dessus)

function buildTreeData(): GeoJSON.FeatureCollection<GeoJSON.Point, TreeFeatureProps> {
  const features: GeoJSON.Feature<GeoJSON.Point, TreeFeatureProps>[] = [];
  let seed = 1;

  const push = (lon: number, lat: number, species: TreeSpecies, s: number) => {
    features.push({
      type: 'Feature',
      geometry: { type: 'Point', coordinates: [lon, lat] },
      properties: { species, size: s, sort: Math.round((LAT_REF - lat) * 1e5) },
    });
  };

  for (const a of ANCHORS) {
    if (a.kind === 'line') {
      const jit = a.jitter ?? 0.00006;
      for (let i = 0; i < a.count; i++) {
        seed += 1;
        const t = a.count > 1 ? i / (a.count - 1) : 0.5;
        const lon = a.from[0] + (a.to[0] - a.from[0]) * t + (rand(seed) - 0.5) * jit;
        const lat = a.from[1] + (a.to[1] - a.from[1]) * t + (rand(seed + 51) - 0.5) * jit;
        const size = 0.85 + rand(seed + 7) * 0.5;
        push(lon, lat, a.species, size);
      }
    } else {
      for (let i = 0; i < a.count; i++) {
        seed += 1;
        // disque à densité décroissante (sqrt) → amas naturel
        const ang = rand(seed) * Math.PI * 2;
        const rr = Math.sqrt(rand(seed + 33)) * a.radius;
        const lon = a.center[0] + Math.cos(ang) * rr * 1.4;
        const lat = a.center[1] + Math.sin(ang) * rr;
        const species = a.species === 'mix' ? SPECIES_POOL[Math.floor(rand(seed + 5) * SPECIES_POOL.length)] : a.species;
        const size = 0.8 + rand(seed + 9) * 0.55;
        push(lon, lat, species, size);
      }
    }
  }
  return { type: 'FeatureCollection', features };
}

// --- Sprites 2.5D dessinés au runtime (aucune dépendance externe, aucun asset lourd) ---
interface SpeciesStyle {
  crown: string;
  crownLight: string;
  trunk: string;
  shape: 'round' | 'umbrella' | 'spire' | 'soft';
}
const SPECIES_STYLE: Record<TreeSpecies, SpeciesStyle> = {
  platane: { crown: '#6E8A46', crownLight: '#8CA862', trunk: '#9A7B54', shape: 'round' },
  micocoulier: { crown: '#54703F', crownLight: '#6E8C52', trunk: '#8A6E4C', shape: 'round' },
  pin: { crown: '#3F5C34', crownLight: '#5C7A46', trunk: '#8A6A44', shape: 'umbrella' },
  olivier: { crown: '#6E8352', crownLight: '#8A9A6E', trunk: '#9A8560', shape: 'soft' },
  cypres: { crown: '#33502E', crownLight: '#4A6640', trunk: '#7E6242', shape: 'spire' },
};

const SPRITE_W = 64;
const SPRITE_H = 84;
const SPRITE_RATIO = 2; // dessiné en 2x pour la netteté

function drawSprite(species: TreeSpecies): ImageData | null {
  const st = SPECIES_STYLE[species];
  const w = SPRITE_W * SPRITE_RATIO;
  const h = SPRITE_H * SPRITE_RATIO;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(SPRITE_RATIO, SPRITE_RATIO);
  const cx = SPRITE_W / 2;
  const groundY = SPRITE_H - 6;

  // Ombre portée douce (ancrage au sol)
  ctx.save();
  ctx.globalAlpha = 0.22;
  ctx.fillStyle = '#1E2416';
  ctx.beginPath();
  ctx.ellipse(cx + 3, groundY, 15, 4.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Tronc
  ctx.fillStyle = st.trunk;
  ctx.fillRect(cx - 1.6, groundY - 20, 3.2, 20);

  const crownCY = groundY - 32;
  const blob = (bx: number, by: number, r: number, color: string) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(bx, by, r, r, 0, 0, Math.PI * 2);
    ctx.fill();
  };

  if (st.shape === 'spire') {
    ctx.fillStyle = st.crown;
    ctx.beginPath();
    ctx.ellipse(cx, crownCY - 4, 9, 26, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = st.crownLight;
    ctx.beginPath();
    ctx.ellipse(cx - 2, crownCY - 8, 5.5, 20, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (st.shape === 'umbrella') {
    ctx.fillStyle = st.crown;
    ctx.beginPath();
    ctx.ellipse(cx, crownCY - 2, 24, 11, 0, 0, Math.PI * 2);
    ctx.fill();
    blob(cx - 4, crownCY - 8, 15, st.crownLight);
  } else {
    // round / soft : houppier arrondi multi-blobs + reflet lumière haut-gauche
    const r = st.shape === 'soft' ? 15 : 18;
    blob(cx, crownCY, r, st.crown);
    blob(cx - r * 0.55, crownCY + 3, r * 0.62, st.crown);
    blob(cx + r * 0.55, crownCY + 3, r * 0.62, st.crown);
    blob(cx - r * 0.2, crownCY - r * 0.45, r * 0.66, st.crownLight);
  }
  return ctx.getImageData(0, 0, w, h);
}

/** Ajoute les sprites d'arbres au style (idempotent). */
function ensureSprites(map: MapboxMap): void {
  (Object.keys(SPECIES_STYLE) as TreeSpecies[]).forEach((sp) => {
    const id = `tree-${sp}`;
    if (map.hasImage(id)) return;
    const data = drawSprite(sp);
    if (data) map.addImage(id, data, { pixelRatio: SPRITE_RATIO });
  });
}

/**
 * Installe le prototype : sprites + source + couche `symbol`.
 * `beforeId` (optionnel) : place la couche SOUS une couche existante (ex. premier layer
 * de marqueurs) pour garantir que les commerces restent au-dessus. À défaut, ajoutée au
 * sommet du style (les marqueurs runtime, ajoutés après, resteront au-dessus).
 */
export function installEcussonTrees(map: MapboxMap, beforeId?: string): void {
  ensureSprites(map);
  if (!map.getSource(TREE_SOURCE_ID)) {
    map.addSource(TREE_SOURCE_ID, { type: 'geojson', data: buildTreeData() });
  }
  if (map.getLayer(TREE_LAYER_ID)) return;
  map.addLayer(
    {
      id: TREE_LAYER_ID,
      type: 'symbol',
      source: TREE_SOURCE_ID,
      minzoom: 15.3, // ZOOM ÉLEVÉ UNIQUEMENT (centre-ville de près)
      layout: {
        'icon-image': ['concat', 'tree-', ['get', 'species']],
        'icon-anchor': 'bottom', // ancré au sol → ne flotte pas
        // apparition & croissance progressives ; taille modulée par feature (`size`)
        'icon-size': [
          'interpolate',
          ['linear'],
          ['zoom'],
          15.3,
          ['*', ['get', 'size'], 0.34],
          16.5,
          ['*', ['get', 'size'], 0.6],
          17.5,
          ['*', ['get', 'size'], 0.82],
        ],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true, // pas de calcul de collision → coût CPU minimal
        'symbol-sort-key': ['get', 'sort'], // sud/proche dessiné au-dessus (profondeur)
        'symbol-z-order': 'source',
      },
      paint: {
        // apparition progressive (rien avant ~15.4, plein vers 16.2)
        'icon-opacity': ['interpolate', ['linear'], ['zoom'], 15.3, 0, 15.9, 0.9, 16.4, 1],
      },
    },
    beforeId,
  );
}

/** Réversibilité totale : retire couche, source et sprites. */
export function removeEcussonTrees(map: MapboxMap): void {
  if (map.getLayer(TREE_LAYER_ID)) map.removeLayer(TREE_LAYER_ID);
  if (map.getSource(TREE_SOURCE_ID)) map.removeSource(TREE_SOURCE_ID);
  (Object.keys(SPECIES_STYLE) as TreeSpecies[]).forEach((sp) => {
    const id = `tree-${sp}`;
    if (map.hasImage(id)) map.removeImage(id);
  });
}
