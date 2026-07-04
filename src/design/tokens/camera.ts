/**
 * Tokens du Cinematic Camera Engine — SOURCE UNIQUE des valeurs de caméra (durées, easing, zoom,
 * pitch, padding, seuils). Le Design System ne dépend de rien. Consommé par la Strategy (pure) et
 * le Scheduler. Règle : AUCUNE valeur caméra en dur ailleurs.
 * → docs/map/CAMERA.md · [ADR-007](../../../docs/map/adr/README.md).
 *
 * ⚠️ Valeurs de départ CALIBRÉES, à affiner sur la vraie carte (Montpellier, zoom Mapbox 0–22).
 */

/** Durées de transition (ms). Reduce-motion → `instant` (jump). */
export const CAMERA_DURATION = {
  instant: 0,
  nudge: 350,
  short: 550,
  base: 650,
  medium: 800,
  long: 1000,
  epic: 1200,
} as const;
export type CameraDurationId = keyof typeof CAMERA_DURATION;

/**
 * Courbes d'accélération (option `easing` d'`easeTo`). `cinematic` (vol large) s'exprime en
 * `curve`/`speed` pour `flyTo` — voir `CAMERA_FLY`.
 */
export const CAMERA_EASING = {
  standard: 'cubic-bezier(0.4, 0, 0.2, 1)', // in-out neutre (retour)
  decel: 'cubic-bezier(0.16, 1, 0.3, 1)', // ease-out marqué : arrivées « posées »
  gentle: 'cubic-bezier(0.25, 0.1, 0.25, 1)', // nudge quasi imperceptible
} as const;
export type CameraEasingId = keyof typeof CAMERA_EASING;

/** Paramètres du vol cinématographique (`flyTo`). */
export const CAMERA_FLY = { curve: 1.42, speed: 1.2 } as const;

/** Niveaux de la hiérarchie de zoom (du plus large au plus intime). */
export type ZoomLevelName =
  | 'territory'
  | 'city'
  | 'neighborhood'
  | 'street'
  | 'merchant'
  | 'merchantSelected';

/** Ordre canonique (large → intime) — sert aux invariants et à la navigation entre niveaux. */
export const ZOOM_LEVEL_ORDER: readonly ZoomLevelName[] = [
  'territory',
  'city',
  'neighborhood',
  'street',
  'merchant',
  'merchantSelected',
] as const;

export interface CameraLevel {
  /** Niveau de zoom Mapbox. */
  zoom: number;
  /** Inclinaison (°) — 0 en vue large (lisibilité), augmente avec l'intimité. */
  pitch: number;
  /** Padding par défaut (px) — surchargé par le padding « sheet-aware » au câblage. */
  padding: number;
}

export const CAMERA_LEVELS: Record<ZoomLevelName, CameraLevel> = {
  territory: { zoom: 9.5, pitch: 0, padding: 48 },
  city: { zoom: 12.5, pitch: 0, padding: 40 },
  neighborhood: { zoom: 14.5, pitch: 25, padding: 40 },
  street: { zoom: 16, pitch: 35, padding: 32 },
  merchant: { zoom: 16.5, pitch: 40, padding: 32 },
  merchantSelected: { zoom: 17.5, pitch: 45, padding: 32 },
};

/**
 * Modificateur d'altitude selon le type de quartier. **Défaut `neutral` (0)** tant que la source
 * de données du « type de quartier » n'est pas tranchée (Phase Terrain) — aucune détection inventée.
 */
export type TerritoryProfile = 'neutral' | 'historic' | 'open';
export const TERRITORY_MODIFIER: Record<TerritoryProfile, { zoom: number; pitch: number }> = {
  neutral: { zoom: 0, pitch: 0 },
  historic: { zoom: 0.3, pitch: 3 }, // centre dense → caméra un peu plus basse
  open: { zoom: -0.4, pitch: -5 }, // grand espace → caméra un peu plus haute
};

/**
 * Seuils du Scheduler (anti-tremblement) : si la pose cible diffère de la pose courante de MOINS
 * que ces seuils, on n'émet AUCUN mouvement caméra.
 */
export const CAMERA_DEAD_ZONE = { centerMeters: 15, zoom: 0.05, pitch: 1, bearing: 1 } as const;

/** Fenêtre de regroupement (trailing debounce) des intents rapides (ms). */
export const CAMERA_COALESCE_MS = 120;

/** Bearing par défaut — aucune rotation automatique (désorientant). */
export const CAMERA_DEFAULT_BEARING = 0;
