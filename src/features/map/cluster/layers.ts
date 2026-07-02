import { colors } from '@/design/tokens/colors';

/**
 * CategoryClusterLayer — paramètres & spécifications des couches de clustering.
 * Les specs sont des objets simples (castés au type Mapbox au point d'appel).
 */

export const SOURCE_ID = 'merchants';
export const CLUSTERS_LAYER = 'merchants-clusters';
export const CLUSTER_COUNT_LAYER = 'merchants-cluster-count';
export const UNCLUSTERED_HIT_LAYER = 'merchants-unclustered';

/** Réglages clustering (ajustables). */
export const CLUSTER_RADIUS = 60; // px : espace entre clusters → aucun chevauchement
export const CLUSTER_MAX_ZOOM = 14; // au-delà : plus de cluster, points individuels

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
 * Couche INVISIBLE des points non clusterisés : sert uniquement à interroger
 * (queryRenderedFeatures) les commerces visibles → rendus en marqueurs photo HTML.
 */
export function unclusteredHitLayerSpec() {
  return {
    id: UNCLUSTERED_HIT_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    filter: ['!', ['has', 'point_count']],
    paint: {
      'circle-radius': 1,
      'circle-opacity': 0,
    },
  };
}
