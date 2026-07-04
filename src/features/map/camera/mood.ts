/**
 * Camera Mood — l'intention ÉMOTIONNELLE d'un mouvement. La caméra raisonne ICI, jamais en pixels.
 * PUR (aucun Mapbox/React). `intent + contexte → mood`, et `contexte → priorité`.
 *
 * Taxonomie (8) — proposée à partir de DISCOVER/EXPLORE/FOCUS/FOLLOW/RETURN/BROWSE, enrichie de
 * deux moods indispensables au naturel : `adjust` (micro-cadrage imperceptible) et surtout `rest`
 * (la caméra se tait — elle ne lutte JAMAIS contre l'utilisateur). Chaque mood a une justification.
 */
import type { CameraContext, CameraIntent, CameraMood, CameraPriority } from './types';

/**
 * Pour chaque mood : *pourquoi il existe · quelle émotion il produit · quel problème UX il résout.*
 * Sert la documentation et le `reason` de debug — jamais à décider.
 */
export const MOOD_RATIONALE: Record<CameraMood, string> = {
  discover:
    "Se situer / se réorienter sur une zone nouvelle (ouverture, recherche, changement de ville). " +
    'Émotion : ouverture, invitation. Problème UX : « où suis-je, qu\'y a-t-il ici ? ».',
  explore:
    'Parcourir un quartier ou une rue (éclatement d\'un cluster). Émotion : curiosité. ' +
    'Problème UX : comprendre la densité locale sans se perdre.',
  focus:
    'Se concentrer sur un commerce sélectionné. Émotion : attention, désir, intimité. ' +
    'Problème UX : isoler un lieu et donner envie d\'y aller.',
  follow:
    'Retrouver / suivre la position de l\'utilisateur. Émotion : réassurance (« je suis là »). ' +
    'Problème UX : me localiser instantanément.',
  return:
    'Retrouver son contexte après avoir fermé une fiche. Émotion : prise de recul douce. ' +
    'Problème UX : ne pas perdre le fil de l\'exploration.',
  browse:
    'Feuilleter d\'un commerce à l\'autre. Émotion : continuité fluide. ' +
    'Problème UX : comparer sans re-vol spectaculaire à chaque fois.',
  adjust:
    'Micro-ajustement de cadrage (la sheet monte). Émotion : aucune (imperceptible). ' +
    'Problème UX : garder le commerce visible au-dessus de la sheet.',
  rest:
    'La caméra se tait. Émotion : respect. Problème UX : ne JAMAIS lutter contre un geste — ' +
    'l\'utilisateur reste maître, la caméra ne bouge pas « juste parce qu\'elle peut ».',
};

/**
 * Résout l'intention émotionnelle. Le contexte prime (il porte la nuance) ; à défaut, on déduit
 * du type d'intent. Un geste manuel ou une intention vide → `rest` (silence).
 */
export function resolveMood(intent: CameraIntent, context?: CameraContext): CameraMood {
  if (context === 'manualPan' || intent.kind === 'none') return 'rest';
  if (intent.kind === 'shiftForSheet' || context === 'sheetOpen') return 'adjust';

  switch (context) {
    case 'merchantSelected':
      return 'focus';
    case 'merchantNavigation':
      return 'browse';
    case 'aroundMe':
    case 'recenter':
      return 'follow';
    case 'backToMap':
      return 'return';
    case 'autoZoom':
      return 'explore';
    case 'firstOpen':
    case 'restore':
    case 'search':
      return 'discover';
    default:
      break;
  }

  // Repli sur le type d'intent (contexte absent).
  switch (intent.kind) {
    case 'focus':
      return 'focus';
    case 'follow':
      return 'follow';
    case 'frameNeighborhood':
      return 'explore';
    case 'reveal':
    case 'overview':
      return 'discover';
    default:
      return 'rest';
  }
}

/**
 * Priorité d'arbitrage du plan — dépend de QUI déclenche, pas de l'émotion. Un geste utilisateur
 * est absolu ; un tap/une recherche est explicite ; la navigation entre fiches est intermédiaire ;
 * l'automatique (ouverture, éclatement) est le plus faible.
 */
export function resolvePriority(context?: CameraContext): CameraPriority {
  switch (context) {
    case 'manualPan':
      return 'user';
    case 'merchantSelected':
    case 'search':
    case 'recenter':
    case 'aroundMe':
      return 'explicit';
    case 'merchantNavigation':
    case 'backToMap':
    case 'sheetOpen':
      return 'navigation';
    case 'firstOpen':
    case 'restore':
    case 'autoZoom':
      return 'auto';
    default:
      return 'auto';
  }
}
