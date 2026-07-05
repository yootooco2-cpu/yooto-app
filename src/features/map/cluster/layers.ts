import { colors } from '@/design/tokens/colors';

/**
 * CategoryClusterLayer — paramètres & spécifications des couches de clustering.
 * Les specs sont des objets simples (castés au type Mapbox au point d'appel).
 */

export const SOURCE_ID = 'merchants';
export const CLUSTERS_LAYER = 'merchants-clusters';
export const CLUSTER_COUNT_LAYER = 'merchants-cluster-count';
export const UNCLUSTERED_HIT_LAYER = 'merchants-unclustered';

/**
 * Réglages clustering — P0 lisibilité (Montpellier centre).
 * Avant : clusterMaxZoom=11 → au zoom 12 (défaut) AUCUN cluster → des dizaines de marqueurs
 * photo empilés au centre. Désormais on garde les clusters PLUS LONGTEMPS pour désempiler,
 * tout en restant une carte de découverte (pas statistique) :
 *  - clusterRadius plus large → regroupe davantage les points proches.
 *  - clusterMaxZoom relevé → les clusters persistent au zoom « quartier » (12) dans les zones
 *    denses, puis se séparent progressivement en zoomant (>= 15 : plus aucun cluster).
 */
export const CLUSTER_RADIUS = 60; // px (était 44) : regroupe davantage → désempile le centre
export const CLUSTER_MAX_ZOOM = 14; // au-delà (>=15) : commerces individuels ; <=14 : clusters possibles

/** Plafond de marqueurs PHOTO simultanés (lisibilité). Au-delà → pin compact / cluster. */
export const PHOTO_MARKER_CAP = 60;

/**
 * Paliers de zoom — logique d'affichage (source unique).
 *  - < ZOOM_SHOW_PHOTO_MARKERS : territoire → clusters uniquement (pas de surcharge).
 *  - >= ZOOM_SHOW_PHOTO_MARKERS : dès la ville, chaque commerce NON clusterisé devient un
 *    marqueur photo (photo + cryptogramme + anneau catégorie) → on voit des commerces, pas des chiffres.
 *  - >= ZOOM_HIDE_CRYPTOGRAMS_CLOSE : très proche → le cryptogramme devient discret (fondu).
 */
export const ZOOM_SHOW_PHOTO_MARKERS = 9; // >= : commerces (photos) visibles dès le niveau ville
// >= : SEULEMENT au zoom extrême le cryptogramme s'efface (laisse respirer la photo). Relevé de
// 16 → 18.5 : le badge catégorie reste visible sur toute la plage utile (ouverture 15.4 + zoom
// d'exploration), au lieu de disparaître dès qu'on s'approche un peu.
export const ZOOM_HIDE_CRYPTOGRAMS_CLOSE = 18.5;

/** Agrégats calculés par cluster (ex. proportion de producteurs → couleur catégorie). */
export const CLUSTER_PROPERTIES = {
  producers: ['+', ['get', 'producer']],
};

/** Spécification de la source GeoJSON clusterisée. */
export function clusterSourceSpec(data: unknown) {
  return {
    type: 'geojson',
    data,
    cluster: true,
    clusterRadius: CLUSTER_RADIUS,
    clusterMaxZoom: CLUSTER_MAX_ZOOM,
    clusterProperties: CLUSTER_PROPERTIES,
  };
}

/**
 * Cercle de cluster : taille par paliers (point_count), couleur catégorie
 * (vert YOOTOO si majorité de producteurs, sinon teinte neutre).
 */
export function clustersLayerSpec() {
  return {
    id: CLUSTERS_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    paint: {
      'circle-color': [
        'case',
        ['>', ['/', ['get', 'producers'], ['max', ['get', 'point_count'], 1]], 0.5],
        colors.primary,
        colors.accent,
      ],
      // Taille continue (pas de saut brusque entre paliers) → clusters « vivants ».
      'circle-radius': ['interpolate', ['linear'], ['get', 'point_count'], 2, 18, 50, 26, 200, 34],
      'circle-stroke-width': 3,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.92,
    },
  };
}

/** Nombre de commerces dans le cluster. */
export function clusterCountLayerSpec() {
  return {
    id: CLUSTER_COUNT_LAYER,
    type: 'symbol',
    source: SOURCE_ID,
    filter: ['has', 'point_count'],
    layout: {
      'text-field': ['get', 'point_count_abbreviated'],
      'text-size': 14,
      'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    },
    paint: {
      'text-color': '#FFFFFF',
    },
  };
}

/**
 * Couche des points non clusterisés — PIN COMPACT visible (P0 lisibilité). Rôles :
 *  1. garantir que CHAQUE commerce non clusterisé reste visible (petit pin), même quand il
 *     n'obtient pas de marqueur photo (non prioritaire / cap atteint) → jamais masqué ;
 *  2. interroger (querySourceFeatures) les commerces visibles → sélection des marqueurs photo ;
 *  3. cible de clic (hit area) pour sélectionner un commerce.
 * Les marqueurs photo (40px) se superposent aux pins prioritaires ; le pin compact reste sous
 * eux (couleur catégorie : vert producteur, sinon teinte neutre).
 */
export function unclusteredHitLayerSpec() {
  return {
    id: UNCLUSTERED_HIT_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 6,
      'circle-color': ['case', ['>', ['get', 'producer'], 0], colors.primary, colors.accent],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': 0.9,
    },
  };
}
