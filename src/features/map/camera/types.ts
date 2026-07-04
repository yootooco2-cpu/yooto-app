/**
 * Camera Engine — types PURS et agnostiques du provider (aucun Mapbox, aucun DOM).
 * Partagés par les couches Context → Intent → Strategy → Scheduler. Seul l'Adapter traduit une
 * `CameraPose`/`CameraMotion` en appels Mapbox. → docs/map/CAMERA.md · ADR-007.
 */
import type { CameraEasingId, ZoomLevelName } from '@/design/tokens/camera';

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

/** Plan complet produit par la Strategy (pure) et exécuté par le Scheduler → Adapter. */
export interface CameraPlan {
  pose: CameraPose;
  motion: CameraMotion;
}

/** Priorité d'arbitrage : `user` > `explicit` > `navigation` > `auto`. */
export type CameraPriority = 'user' | 'explicit' | 'navigation' | 'auto';

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
