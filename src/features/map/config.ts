import type { MapRegion } from './types';

/**
 * Configuration du Cartographic Engine.
 *
 * Source UNIQUE de vérité pour le token et la région par défaut : aucun autre
 * module ne doit lire `process.env` directement.
 *
 * Token : `EXPO_PUBLIC_MAPBOX_TOKEN` est un token PUBLIC Mapbox (`pk.…`),
 * exposé côté client par nature — à restreindre par domaine/scopes dans le
 * dashboard Mapbox. Le token secret `sk.` (téléchargement des SDK natifs) ne
 * passe JAMAIS par ici ni par le bundle.
 */

/**
 * Ouverture par défaut YOOTOO (R3 — caméra cinématique) : atterrissage ÉDITORIAL sur le cœur de
 * Montpellier (Écusson / Comédie), en vue **oblique isométrique** (pitch 55°) à un zoom « quartier
 * proche » (15.55). Objectif : une première impression immersive et premium dès la première seconde — la
 * ville 3D éclairée (lumière R1 + AO R2a + ombres R2b), pas une vue de dessus plate.
 * Sert aussi de repli de pitch : un viewport restauré (center + zoom) rouvre à cette inclinaison
 * plutôt qu'à plat → un peu d'horizon reste toujours visible (meilleur repérage).
 */
const DEFAULT_REGION: MapRegion = {
  center: { latitude: 43.6108, longitude: 3.8767 },
  zoom: 15.55,
  pitch: 55,
  bearing: 0,
};

// RESET DA — base officielle : Mapbox Standard, sans aucune personnalisation graphique.
// L'ancien laboratoire S1 (`./style/yootoo-s1.json`) reste versionné dans le dépôt à titre
// d'archive DA (toits T1, lumière T2…) : voir commits 9b59486 / 9651e02 pour le restaurer.
const MAPBOX_STANDARD_STYLE = 'mapbox://styles/mapbox/standard';

export interface MapConfig {
  /** Token public `pk.` ou `null` si non configuré → fallback placeholder. */
  token: string | null;
  /** URL de style (surcharge `EXPO_PUBLIC_MAPBOX_STYLE_URL`) OU style officiel Standard. */
  mapStyle: string | object;
  defaultRegion: MapRegion;
}

export function getMapConfig(): MapConfig {
  const rawToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  const token = rawToken && rawToken.length > 0 ? rawToken : null;

  // L'env garde la priorité (permet de pointer un style Studio hébergé) ; sinon → Standard officiel.
  const envStyle = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL;
  const mapStyle = envStyle && envStyle.length > 0 ? envStyle : MAPBOX_STANDARD_STYLE;

  return { token, mapStyle, defaultRegion: DEFAULT_REGION };
}
