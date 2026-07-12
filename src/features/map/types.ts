/**
 * Cartographic Engine — modèle de données.
 *
 * Ces types sont AGNOSTIQUES du provider (Mapbox GL JS, @rnmapbox/maps,
 * placeholder…) ET du domaine (commerces, producteurs, événements…).
 * Le moteur ne connaît que des `MapMarker` génériques ; chaque domaine fournit
 * ses objets via un adapter (ex. `merchantsToMapMarkers`).
 */

import type { MarkerImportance } from '@/design/tokens/mapMarkers';

export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

/** Région / caméra de la carte (centre + niveau de zoom). */
export interface MapRegion {
  center: MapCoordinate;
  zoom: number;
  /** Inclinaison d'ouverture (°) — 0 = vue de dessus. Optionnel (défaut 0). */
  pitch?: number;
  /** Orientation d'ouverture (°) — 0 = nord. Optionnel (défaut 0). */
  bearing?: number;
}

/** Emprise géographique (bounding box) du viewport courant. */
export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Viewport courant de la carte : centre + zoom + emprise visible. */
export interface MapViewport {
  center: MapCoordinate;
  zoom: number;
  bounds: MapBounds;
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
  /** Identité vérifiée par une preuve officielle — axe visuel INDÉPENDANT de la photo. */
  verified?: boolean;
  /**
   * État éditorial INTRINSÈQUE (Design System) — pilote l'anneau/halo du marqueur.
   * Fourni par l'adaptateur via `markerState`. La sélection est un état transitoire, à part.
   */
  state?: MarkerImportance;
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
  /** Précision (m) du fix utilisateur → halo de précision (optionnel). */
  userAccuracy?: number | null;
  /** Jeton de recentrage : à chaque incrément, la carte vole vers l'utilisateur. */
  recenterToken?: number;
  /**
   * Caméra initiale (centre + zoom) restaurée pour la session. Si fournie, la carte s'ouvre
   * exactement dessus (pas de Montpellier→restore) et le cadrage auto (`fit`) est neutralisé.
   */
  initialCamera?: MapRegion;
  /** Remplit la hauteur disponible (flex) au lieu d'une hauteur fixe. */
  fill?: boolean;
  /**
   * Notifie le viewport courant à chaque fin de déplacement. `userInitiated` = true si
   * le déplacement vient d'un geste utilisateur (pan/zoom), false si programmatique
   * (cadrage initial, zoom sur cluster) → permet d'auto-valider la zone sans bouton.
   */
  onViewportChange?: (viewport: MapViewport, userInitiated: boolean) => void;
  // --- Coutures futures (S5) ---
  camera?: MapRegion;
  onRegionChange?: (region: MapRegion) => void;
  clustering?: boolean;
  overlays?: MapOverlay[];
}
