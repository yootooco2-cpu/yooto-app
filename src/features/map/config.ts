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
 * Région par défaut YOOTOO — centrée sur MONTPELLIER à un zoom « quartier » (12). À ce zoom,
 * les zones denses restent regroupées en clusters (cf. clusterMaxZoom=14) puis se séparent en
 * zoomant. C'est aussi le repli de cadrage quand la bbox des commerces est trop large.
 */
const DEFAULT_REGION: MapRegion = {
  center: { latitude: 43.6108, longitude: 3.8767 },
  zoom: 12,
};

const DEFAULT_STYLE_URL = 'mapbox://styles/mapbox/streets-v12';

export interface MapConfig {
  /** Token public `pk.` ou `null` si non configuré → fallback placeholder. */
  token: string | null;
  styleUrl: string;
  defaultRegion: MapRegion;
}

export function getMapConfig(): MapConfig {
  const rawToken = process.env.EXPO_PUBLIC_MAPBOX_TOKEN;
  const token = rawToken && rawToken.length > 0 ? rawToken : null;

  return {
    token,
    styleUrl: process.env.EXPO_PUBLIC_MAPBOX_STYLE_URL || DEFAULT_STYLE_URL,
    defaultRegion: DEFAULT_REGION,
  };
}
