/**
 * Camera Engine — types PURS et agnostiques du provider (aucun Mapbox, aucun DOM).
 * Partagés par les couches Context → Intent → Strategy → Scheduler. Seul l'Adapter traduit une
 * `CameraPose`/`CameraMotion` en appels Mapbox. → docs/map/CAMERA.md · ADR-007.
 */
import type { CameraEasingId, TerritoryProfile, ZoomLevelName } from '@/design/tokens/camera';

import type { MapBounds, MapCoordinate } from '../types';

/** Padding de cadrage : soit uniforme, soit par côté (zone réellement visible, « sheet-aware »). */
export type CameraPadding =
  | number
  | { top: number; right: number; bottom: number; left: number };

/** Pose caméra cible (destination d'une transition). */
export interface CameraPose {
  center: MapCoordinate;
  zoom: number;
  /** Inclinaison (°). */
  pitch: number;
  /** Orientation (°) — 0 = nord (aucune rotation automatique). */
  bearing: number;
  padding?: CameraPadding;
}

/** Primitive de mouvement — voir CAMERA.md §6. */
export type MotionPrimitive = 'jump' | 'ease' | 'fly' | 'nudge';

/** Mouvement à appliquer pour atteindre une pose. */
export interface CameraMotion {
  primitive: MotionPrimitive;
  durationMs: number;
  /** Courbe pour `ease`/`nudge`. */
  easing?: CameraEasingId;
  /** Paramètres de vol pour `fly`. */
  fly?: { curve: number; speed: number };
}

/** Priorité d'arbitrage : `user` > `explicit` > `navigation` > `auto`. */
export type CameraPriority = 'user' | 'explicit' | 'navigation' | 'auto';

/**
 * MOOD — intention ÉMOTIONNELLE du mouvement (pas un état technique). La caméra raisonne à ce
 * niveau, jamais en pixels. Chaque mood porte une justification cognitive (voir `mood.ts`).
 * `rest` = la caméra se tait (elle ne lutte jamais contre l'utilisateur).
 */
export type CameraMood =
  | 'discover'
  | 'explore'
  | 'focus'
  | 'follow'
  | 'return'
  | 'browse'
  | 'adjust'
  | 'rest';

/**
 * Plan produit par la Strategy (pure), exécuté par le Scheduler → Adapter. NE CONTIENT AUCUN
 * détail Mapbox : une pose cible, un mouvement, une priorité, l'émotion, et une raison (debug).
 */
export interface CameraPlan {
  pose: CameraPose;
  motion: CameraMotion;
  priority: CameraPriority;
  mood: CameraMood;
  /** Justification lisible (debug/observabilité). Jamais utilisée pour décider. */
  reason?: string;
}

/**
 * Environnement fourni à la Strategy — tout ce dont elle a besoin pour raisonner, SANS Mapbox.
 * Tout est optionnel (défauts sûrs) : la Strategy reste une fonction pure et déterministe.
 */
export interface CameraEnvironment {
  /** Contexte déclencheur (fixe la priorité et nuance le mood). */
  context?: CameraContext;
  /** Pose caméra courante (pour `overview`/`return`/`adjust` qui partent de l'existant). */
  current?: CameraPose;
  /** Type de quartier — défaut `neutral` (aucune détection inventée). */
  territory?: TerritoryProfile;
  /** Préférence d'accessibilité — défaut `false`. */
  reduceMotion?: boolean;
  /** Dimensions du viewport (px) — nécessaires pour cadrer une emprise (`reveal`). */
  viewport?: { width: number; height: number };
  /** Insets masqués par la sheet / le panneau Focus (px) — pour `adjust`. */
  sheetInsets?: SheetInsets;
}

/**
 * Contexte OBSERVÉ — ce que fait l'utilisateur, là, maintenant. C'est un fait dérivé des
 * événements produit, pas un choix d'UI. Chaque contexte se traduit en un `CameraIntent`.
 */
export type CameraContext =
  | 'firstOpen'
  | 'restore'
  | 'aroundMe'
  | 'search'
  | 'manualPan'
  | 'merchantSelected'
  | 'sheetOpen'
  | 'merchantNavigation'
  | 'backToMap'
  | 'autoZoom'
  | 'recenter';

/** Insets (px) de la zone masquée par la bottom sheet / le panneau Focus. */
export interface SheetInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Intent SÉMANTIQUE — le résultat voulu, abstrait et agnostique du provider. La Strategy le
 * résout en `CameraPlan` selon l'environnement (zoom courant, territoire, reduce-motion).
 */
export type CameraIntent =
  | { kind: 'none' }
  | { kind: 'overview' }
  | { kind: 'focus'; target: MapCoordinate; level?: ZoomLevelName }
  | { kind: 'follow'; target: MapCoordinate }
  | { kind: 'reveal'; bounds: MapBounds }
  | { kind: 'frameNeighborhood'; target: MapCoordinate }
  | { kind: 'shiftForSheet'; insets: SheetInsets };
