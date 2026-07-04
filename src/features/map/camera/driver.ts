/**
 * CameraDriver — LE PORT d'exécution caméra. La SEULE frontière entre notre architecture et un SDK
 * cartographique. Volontairement idiot : il traduit un `CameraPlan` en appels SDK, rien d'autre.
 *
 * Le Scheduler dépend de CE type — JAMAIS de Mapbox. Demain (Apple Maps, Vision Pro, un autre
 * moteur), on réécrit uniquement l'implémentation (le Rendering Bridge) ; Discovery / Strategy /
 * Scheduler ne bougent pas. → docs/map/CAMERA.md · ADR-009.
 */
import type { CameraPlan, CameraPose } from './types';

/**
 * Capacités d'un moteur de rendu. Permet de brancher demain un SDK différent sans toucher l'amont
 * (l'amont peut interroger ce qui est supporté). Toutes ne sont pas exploitées aujourd'hui.
 */
export interface CameraCapabilities {
  supportsPitch: boolean;
  supportsBearing: boolean;
  supportsTerrain: boolean;
  supportsGlobe: boolean;
  supportsFreeCamera: boolean;
}

/** Callback de fin d'animation (fin naturelle du mouvement). */
export type CameraDone = () => void;

/**
 * Port d'exécution : une méthode par primitive de mouvement (traduction pure vers le SDK) + lecture
 * de la pose (dead-zone) + `stop`. AUCUNE décision, AUCune logique métier. L'intelligence est ailleurs.
 */
export interface CameraDriver {
  readonly capabilities: CameraCapabilities;
  /** Pose caméra actuelle (pour la dead-zone du Scheduler). */
  getPose(): CameraPose;
  /** Saut instantané (aucune animation). */
  jump(plan: CameraPlan, onDone?: CameraDone): void;
  /** Transition courte/moyenne (même échelle). */
  ease(plan: CameraPlan, onDone?: CameraDone): void;
  /** Vol (grand changement d'échelle). */
  fly(plan: CameraPlan, onDone?: CameraDone): void;
  /** Interrompt immédiatement toute animation en cours. */
  stop(): void;
}
