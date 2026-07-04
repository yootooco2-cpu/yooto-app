/**
 * Camera Strategy — LE CERVEAU de la caméra. Fonction PURE : `resolveCameraPlan(intent, env)` →
 * `CameraPlan | null`. Ne connaît RIEN de Mapbox, React, Expo, ni du rendu. Elle raisonne en
 * INTENTIONS et ÉMOTIONS (mood), jamais en API. → docs/map/CAMERA.md · ADR-007.
 *
 * `null` = « la caméra ne propose rien » — c'est une réponse pleine et importante (silence : elle
 * ne bouge jamais juste parce qu'elle peut, elle ne lutte jamais contre un geste).
 *
 * Chaque mouvement a une justification cognitive (voir `MOOD_RATIONALE` + `reason` du plan).
 */
import {
  CAMERA_DEFAULT_BEARING,
  CAMERA_DURATION,
  CAMERA_FLY,
  CAMERA_LEVELS,
  TERRITORY_MODIFIER,
  type ZoomLevelName,
} from '@/design/tokens/camera';

import type { MapCoordinate } from '../types';

import { boundsCenter, clamp, fitZoom } from './geo';
import { resolveMood, resolvePriority } from './mood';
import type {
  CameraEnvironment,
  CameraIntent,
  CameraMood,
  CameraMotion,
  CameraPlan,
  CameraPose,
} from './types';

// ── Presets de mouvement ────────────────────────────────────────────────────────────────────
const JUMP: CameraMotion = { primitive: 'jump', durationMs: CAMERA_DURATION.instant };
const fly = (durationMs: number): CameraMotion => ({ primitive: 'fly', durationMs, fly: CAMERA_FLY });
const ease = (durationMs: number, easing: CameraMotion['easing']): CameraMotion => ({
  primitive: 'ease',
  durationMs,
  easing,
});
const nudge = (): CameraMotion => ({ primitive: 'nudge', durationMs: CAMERA_DURATION.nudge, easing: 'gentle' });

/** Pose « posée » sur un niveau de la hiérarchie, centrée sur un point. */
function levelPose(level: ZoomLevelName, center: MapCoordinate): CameraPose {
  const L = CAMERA_LEVELS[level];
  return { center, zoom: L.zoom, pitch: L.pitch, bearing: CAMERA_DEFAULT_BEARING, padding: L.padding };
}

interface Draft {
  pose: CameraPose;
  motion: CameraMotion;
  reason: string;
}

// ── Une stratégie par mood ──────────────────────────────────────────────────────────────────

function strategyFocus(intent: CameraIntent, browse: boolean): Draft | null {
  if (intent.kind !== 'focus') return null;
  const pose = levelPose(intent.level ?? 'merchantSelected', intent.target);
  return browse
    ? { pose, motion: ease(CAMERA_DURATION.short, 'decel'), reason: 'browse: feuilletage entre commerces, même échelle' }
    : { pose, motion: ease(CAMERA_DURATION.base, 'decel'), reason: 'focus: intimité sur le commerce sélectionné' };
}

function strategyFollow(intent: CameraIntent, context?: string): Draft | null {
  const target = intent.kind === 'focus' || intent.kind === 'follow' ? intent.target : null;
  if (!target) return null;
  const level: ZoomLevelName = context === 'aroundMe' ? 'neighborhood' : 'street';
  return {
    pose: levelPose(level, target),
    motion: fly(CAMERA_DURATION.long),
    reason: 'follow: retrouver ma position',
  };
}

function strategyExplore(intent: CameraIntent, env: CameraEnvironment): Draft | null {
  if (intent.kind === 'frameNeighborhood') {
    return {
      pose: levelPose('neighborhood', intent.target),
      motion: ease(CAMERA_DURATION.medium, 'decel'),
      reason: 'explore: cadrer le quartier',
    };
  }
  if (intent.kind === 'reveal' && env.viewport) {
    const center = boundsCenter(intent.bounds);
    const raw = fitZoom(intent.bounds, env.viewport, CAMERA_LEVELS.neighborhood.padding);
    const zoom = clamp(raw, CAMERA_LEVELS.neighborhood.zoom, CAMERA_LEVELS.street.zoom);
    return {
      pose: { center, zoom, pitch: CAMERA_LEVELS.neighborhood.pitch, bearing: CAMERA_DEFAULT_BEARING, padding: CAMERA_LEVELS.neighborhood.padding },
      motion: ease(CAMERA_DURATION.medium, 'decel'),
      reason: 'explore: comprendre la densité du quartier',
    };
  }
  return null;
}

function strategyDiscover(intent: CameraIntent, env: CameraEnvironment): Draft | null {
  // Recherche : cadrer les résultats, à PLAT (on lit une liste sur une carte).
  if (intent.kind === 'reveal' && env.viewport) {
    const center = boundsCenter(intent.bounds);
    const raw = fitZoom(intent.bounds, env.viewport, CAMERA_LEVELS.city.padding);
    const zoom = clamp(raw, CAMERA_LEVELS.city.zoom, CAMERA_LEVELS.neighborhood.zoom);
    return {
      pose: { center, zoom, pitch: 0, bearing: CAMERA_DEFAULT_BEARING, padding: CAMERA_LEVELS.city.padding },
      motion: fly(CAMERA_DURATION.long),
      reason: 'discover: cadrer les résultats de recherche',
    };
  }
  // Vue d'ensemble : recul jusqu'au niveau ville autour du centre courant.
  if (intent.kind === 'overview' && env.current) {
    return {
      pose: levelPose('city', env.current.center),
      motion: fly(CAMERA_DURATION.long),
      reason: 'discover: se situer, ouvrir la ville',
    };
  }
  return null;
}

function strategyReturn(env: CameraEnvironment): Draft | null {
  if (!env.current) return null;
  // Légère prise de recul depuis le commerce : on « ressort », sans se perdre.
  return {
    pose: levelPose('street', env.current.center),
    motion: ease(CAMERA_DURATION.short, 'standard'),
    reason: 'return: retrouver mon contexte après la fiche',
  };
}

function strategyAdjust(intent: CameraIntent, env: CameraEnvironment): Draft | null {
  if (!env.current) return null;
  const insets = intent.kind === 'shiftForSheet' ? intent.insets : env.sheetInsets;
  if (!insets) return null;
  // On ne change QUE le padding : center/zoom/pitch inchangés → mouvement quasi imperceptible.
  return {
    pose: { ...env.current, padding: insets },
    motion: nudge(),
    reason: 'adjust: garder le commerce visible au-dessus de la sheet',
  };
}

// ── Application de l'environnement (territoire + reduce-motion) ────────────────────────────────

/** Modificateur territoire : altitude/pitch ajustés ; le pitch ne s'ajoute jamais à une vue plane. */
function applyTerritory(pose: CameraPose, env: CameraEnvironment): CameraPose {
  const mod = TERRITORY_MODIFIER[env.territory ?? 'neutral'];
  const pitch = pose.pitch > 0 ? Math.max(0, pose.pitch + mod.pitch) : pose.pitch;
  return { ...pose, zoom: clamp(pose.zoom + mod.zoom, 0, 22), pitch };
}

// ── L'entrée unique ───────────────────────────────────────────────────────────────────────────

/**
 * Résout l'intention en plan caméra. PURE et déterministe. Retourne `null` quand la caméra ne
 * doit rien proposer (silence, ou intention incohérente avec l'environnement fourni).
 */
export function resolveCameraPlan(intent: CameraIntent, env: CameraEnvironment = {}): CameraPlan | null {
  const mood: CameraMood = resolveMood(intent, env.context);
  if (mood === 'rest') return null; // la caméra se tait — elle ne lutte jamais

  let draft: Draft | null;
  switch (mood) {
    case 'focus':
      draft = strategyFocus(intent, false);
      break;
    case 'browse':
      draft = strategyFocus(intent, true);
      break;
    case 'follow':
      draft = strategyFollow(intent, env.context);
      break;
    case 'explore':
      draft = strategyExplore(intent, env);
      break;
    case 'discover':
      draft = strategyDiscover(intent, env);
      break;
    case 'return':
      draft = strategyReturn(env);
      break;
    case 'adjust':
      draft = strategyAdjust(intent, env);
      break;
    default:
      draft = null;
  }
  if (!draft) return null;

  const pose = applyTerritory(draft.pose, env);
  // Accessibilité : reduce-motion → aucun mouvement (jump) et vue à plat (aucun basculement).
  if (env.reduceMotion) {
    return {
      pose: { ...pose, pitch: 0 },
      motion: JUMP,
      priority: resolvePriority(env.context),
      mood,
      reason: `${draft.reason} · reduce-motion`,
    };
  }

  return { pose, motion: draft.motion, priority: resolvePriority(env.context), mood, reason: draft.reason };
}
