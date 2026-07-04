/**
 * Camera Engine — API publique du module (pur, agnostique du provider).
 * Rendu Mapbox = Adapter (PR-C4), arbitrage = Scheduler (PR-C5).
 */
export { resolveCameraPlan } from './strategy';
export { resolveMood, resolvePriority, MOOD_RATIONALE } from './mood';
export { boundsCenter, fitZoom, clamp } from './geo';
export type {
  CameraContext,
  CameraEnvironment,
  CameraIntent,
  CameraMood,
  CameraMotion,
  CameraPadding,
  CameraPlan,
  CameraPose,
  CameraPriority,
  MotionPrimitive,
  SheetInsets,
} from './types';
