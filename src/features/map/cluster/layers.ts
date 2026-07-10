import { colors } from '@/design/tokens/colors';
import type { LightPhase } from '@/features/map/lightPhaseStore';

/**
 * CategoryClusterLayer — paramètres & spécifications des couches de clustering.
 * Les specs sont des objets simples (castés au type Mapbox au point d'appel).
 */

export const SOURCE_ID = 'merchants';
export const CLUSTERS_LAYER = 'merchants-clusters';
export const CLUSTER_COUNT_LAYER = 'merchants-cluster-count';
export const UNCLUSTERED_HIT_LAYER = 'merchants-unclustered';
export const MERCHANT_LIGHT_LAYER = 'merchants-light';

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

/* ------------------------------------------------------------------------------------------------
 * LUMIÈRE D'AMBIANCE DES COMMERCES (Concept 3 — validé)
 *
 * Les commerces diffusent une présence chaleureuse dans leur environnement immédiat — une
 * vitrine éclairée, une terrasse animée — JAMAIS un effet graphique identifiable :
 *  - `circle-blur: 1`  → dégradé sur 100 % du rayon, aucun bord, donc aucun « halo » ;
 *  - `pitch-alignment: map` → la lumière est couchée SUR le sol (ellipse en perspective) ;
 *  - opacités au seuil de perception (on ressent l'absence plus que la présence) ;
 *  - `emissive-strength: 1` → la lumière ÉMET : jamais assombrie par la nuit de Standard ;
 *  - aucune animation — l'intensité ne change qu'aux 4 phases solaires (transition fondue).
 * ------------------------------------------------------------------------------------------------ */

/**
 * Intensité par phase solaire — calibrage validé à l'écran (9/7/2026) : la v1 était
 * imperceptible même en comparaison off. Règle produit maintenue : discret en journée
 * (perceptible seulement en comparaison), clairement lisible et doux au crépuscule,
 * vraies vitrines vivantes la nuit — jamais un néon, jamais un bord.
 */
export const MERCHANT_LIGHT_OPACITY: Record<LightPhase, number> = {
  dawn: 0.05,
  day: 0.03,
  dusk: 0.11,
  night: 0.15,
};

/** Mode de calibration (dev) : `?merchantLight=off|low|high`. `normal` en production. */
export type MerchantLightMode = 'off' | 'low' | 'normal' | 'high';

export const MERCHANT_LIGHT_MODE_FACTOR: Record<MerchantLightMode, number> = {
  off: 0,
  low: 0.5,
  normal: 1,
  high: 2.5, // calibration uniquement : rendre l'effet VISIBLE pour le régler, jamais shippé
};

/** Lit le mode depuis l'URL (dev uniquement) — production : toujours `normal`. */
export function merchantLightModeFromUrl(): MerchantLightMode {
  if (process.env.NODE_ENV === 'production' || typeof window === 'undefined') return 'normal';
  try {
    const value = new URLSearchParams(window.location.search).get('merchantLight');
    return value === 'off' || value === 'low' || value === 'high' ? value : 'normal';
  } catch {
    return 'normal';
  }
}

/** Opacité effective (phase × mode), bornée — même `high` reste une ambiance, pas un spot. */
export function merchantLightOpacity(phase: LightPhase, mode: MerchantLightMode): number {
  return Math.min(MERCHANT_LIGHT_OPACITY[phase] * MERCHANT_LIGHT_MODE_FACTOR[mode], 0.3);
}

/**
 * Couche de lumière d'ambiance — 1 circle-layer sur la source clustering existante.
 * Cinq familles de température (différences quasi invisibles : même luminosité, seule
 * la chaleur varie). Slot `middle` : la lumière vit au sol, DERRIÈRE les bâtiments 3D.
 */
export function merchantLightLayerSpec() {
  return {
    id: MERCHANT_LIGHT_LAYER,
    type: 'circle',
    source: SOURCE_ID,
    slot: 'middle',
    minzoom: 13,
    paint: {
      'circle-color': [
        'match',
        ['get', 'cryptogramId'],
        ['restaurant', 'cafe', 'traiteur', 'marche'],
        '#FFD9A8', // ambrée — restauration
        ['boulangerie', 'patisserie', 'fromagerie', 'epicerie', 'primeur', 'producteur'],
        '#FFE7C2', // crème chaude — fournil & producteurs
        ['fleuriste', 'nature', 'bienetre'],
        '#F2EBD4', // naturelle très douce
        ['librairie', 'culture', 'artisanat'],
        '#EFEAE0', // neutre — culture
        '#F7F1E6', // blanc chaud discret — services & repli
      ],
      // Un cluster (plusieurs commerces) rayonne un peu plus large qu'un commerce seul.
      'circle-radius': [
        'interpolate',
        ['linear'],
        ['zoom'],
        13,
        ['case', ['has', 'point_count'], 14, 6],
        15.5,
        ['case', ['has', 'point_count'], 26, 12],
        17.5,
        ['case', ['has', 'point_count'], 44, 24],
      ],
      'circle-blur': 1,
      'circle-pitch-alignment': 'map',
      'circle-pitch-scale': 'map',
      'circle-opacity': MERCHANT_LIGHT_OPACITY.day,
      // Bascule de phase FONDUE (2,5 s) : un glissement, jamais un événement.
      'circle-opacity-transition': { duration: 2500, delay: 0 },
      'circle-emissive-strength': 1,
    },
  };
}
