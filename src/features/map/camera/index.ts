/**
 * Camera Engine — API publique du module (pur, agnostique du provider).
 * Rendu Mapbox = Adapter (PR-C4), arbitrage = Scheduler (PR-C5).
 */
export { resolveCameraPlan } from './strategy';
export { resolveMood, resolvePriority, MOOD_RATIONALE } from './mood';
export { boundsCenter, fitZoom, clamp, haversineMeters } from './geo';
export { CameraScheduler } from './scheduler';
export type { SchedulerConfig, SchedulerState, SchedulerTimer, SubmitOutcome } from './scheduler';
export type { CameraCapabilities, CameraDone, CameraDriver } from './driver';
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
