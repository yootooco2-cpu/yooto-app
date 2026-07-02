/**
 * Cartographic Engine — modèle de données.
 *
 * Ces types sont AGNOSTIQUES du provider (Mapbox GL JS, @rnmapbox/maps,
 * placeholder…) ET du domaine (commerces, producteurs, événements…).
 * Le moteur ne connaît que des `MapMarker` génériques ; chaque domaine fournit
 * ses objets via un adapter (ex. `merchantsToMapMarkers`).
 */

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

/** Région / caméra de la carte (centre + niveau de zoom). */
export interface MapRegion {
  center: MapCoordinate;
  zoom: number;
}

/** Identifiants des implémentations de rendu possibles. */
export type MapProviderId = 'mapbox-gl' | 'rnmapbox' | 'placeholder';

/**
 * Marqueur générique affiché par le moteur.
 * `kind` indique le domaine d'origine (merchant, producer, event…) pour le
 * style/regroupement futur ; `data` transporte l'objet métier d'origine.
 */
export interface MapMarker<TData = unknown> {
  id: string;
  coordinate: MapCoordinate;
  kind: string;
  label?: string;
  /** Vignette à afficher sur le marqueur (cover photo). */
  imageUrl?: string | null;
  /** Attributs d'affichage / clustering (agnostiques du domaine). */
  title?: string;
  category?: string;
  /** Identité visuelle (cryptogramme officiel) — chaîne agnostique fournie par l'adaptateur. */
  cryptogramId?: string;
  rating?: number;
  open?: boolean;
  producer?: boolean;
  /** Position relative en % (0–100) pour le rendu placeholder sans provider. */
  placeholderPosition?: { x: number; y: number };
  data?: TData;
}

/**
 * Couche superposée générique (zones, parcours, géofences).
 * COUTURE S5 — typée ici, non implémentée par le moteur en S4.
 */
export interface MapOverlay {
  id: string;
  kind: 'zone' | 'route' | 'geofence';
  coordinates: MapCoordinate[];
}

/**
 * Contrat commun à TOUTE implémentation du moteur (web / native / placeholder).
 * Implémenté en S4 : `markers`, `selectedId`, `onSelectMarker`, `userLocation`.
 * Coutures S5 (acceptées mais non rendues) : `camera`, `onRegionChange`,
 * `clustering`, `overlays`.
 */
export interface MapEngineProps {
  markers: MapMarker[];
  selectedId?: string | null;
  onSelectMarker?: (id: string) => void;
  userLocation?: MapCoordinate | null;
  /** Remplit la hauteur disponible (flex) au lieu d'une hauteur fixe. */
  fill?: boolean;
  // --- Coutures futures (S5) ---
  camera?: MapRegion;
  onRegionChange?: (region: MapRegion) => void;
  clustering?: boolean;
  overlays?: MapOverlay[];
}
