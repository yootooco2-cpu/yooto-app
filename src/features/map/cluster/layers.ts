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
 * Réglages clustering — VOLONTAIREMENT PEU AGRESSIFS : YOOTOO est une carte de découverte,
 * pas une carte statistique. On privilégie les commerces individuels le plus tôt possible.
 *  - clusterRadius faible → les points se séparent vite.
 *  - clusterMaxZoom bas → AUCUN cluster au-delà du niveau ville : dès le quartier (zoom 12),
 *    tous les commerces sont individuels (photo + cryptogramme).
 */
export const CLUSTER_RADIUS = 44; // px (était 60) : regroupe beaucoup moins
export const CLUSTER_MAX_ZOOM = 11; // au-delà (>=12) : plus AUCUN cluster, commerces individuels

/**
 * Paliers de zoom — logique d'affichage (source unique).
 *  - < ZOOM_SHOW_PHOTO_MARKERS : territoire → clusters uniquement (pas de surcharge).
 *  - >= ZOOM_SHOW_PHOTO_MARKERS : dès la ville, chaque commerce NON clusterisé devient un
 *    marqueur photo (photo + cryptogramme + anneau catégorie) → on voit des commerces, pas des chiffres.
 *  - >= ZOOM_HIDE_CRYPTOGRAMS_CLOSE : très proche → le cryptogramme devient discret (fondu).
 */
export const ZOOM_SHOW_PHOTO_MARKERS = 9; // >= : commerces (photos) visibles dès le niveau ville
export const ZOOM_HIDE_CRYPTOGRAMS_CLOSE = 16; // >= : très proche → cryptogramme discret/masqué

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
 * Couche INVISIBLE des points non clusterisés. Rôles :
 *  1. interroger (querySourceFeatures) les commerces visibles → marqueurs photo HTML ;
 *  2. cible de clic (hit area) pour sélectionner un commerce là où, exceptionnellement,
 *     aucun marqueur photo n'est encore rendu.
 * Le rendu visible des commerces est porté par les marqueurs photo (photo + cryptogramme),
 * jamais par cette couche → aucun double marqueur, aucune pastille « statistique ».
 */
export function unclusteredHitLayerSpec() {
  return {
    id: UNCLUSTERED_HIT_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 10,
      'circle-opacity': 0,
    },
  };
}
