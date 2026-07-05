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
 * Montpellier (Écusson / Comédie), en vue **oblique** (pitch 58°) à un zoom « quartier proche »
 * (15.4). Objectif : une première impression immersive et premium dès la première seconde — la
 * ville 3D éclairée (lumière R1 + AO R2a + ombres R2b), pas une vue de dessus plate.
 * Sert aussi de repli de pitch : un viewport restauré (center + zoom) rouvre à cette inclinaison
 * plutôt qu'à plat → un peu d'horizon reste toujours visible (meilleur repérage).
 */
const DEFAULT_REGION: MapRegion = {
  center: { latitude: 43.6108, longitude: 3.8767 },
  zoom: 15.4,
  pitch: 58,
  bearing: 0,
};

// Style de TRAVAIL versionné (le « laboratoire » S1) — construit couche par couche dans le dépôt.
// C'est désormais le style par défaut : l'app itère sur le rendu réel sans manipulation manuelle.
// Plus tard, il sera reproduit/exporté dans Mapbox Studio. → docs/map/STYLE_S1_STUDIO.md.
import yootooS1Style from './style/yootoo-s1.json';

export interface MapConfig {
  /** Token public `pk.` ou `null` si non configuré → fallback placeholder. */
  token: string | null;
  /** URL de style (surcharge `EXPO_PUBLIC_MAPBOX_STYLE_URL`) OU objet style de travail versionné. */
  mapStyle: string | object;
  defaultRegion: MapRegion;
}

export function getMapConfig(): MapConfig {
  const rawToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  const token = rawToken && rawToken.length > 0 ? rawToken : null;

  // L'env garde la priorité (permet de pointer un style Studio hébergé) ; sinon → style de travail.
  const envStyle = process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL;
  const mapStyle = envStyle && envStyle.length > 0 ? envStyle : (yootooS1Style as object);

  return { token, mapStyle, defaultRegion: DEFAULT_REGION };
}
