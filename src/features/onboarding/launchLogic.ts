/**
 * FONDATION B — Orchestration du premier lancement (logique PURE).
 *
 * Sépare la DÉCISION (« est-ce le 1er lancement ? l'onboarding est-il fait ? ») de la
 * persistance. Cette couche ne dépend d'AUCUN module natif → testable, réutilisable quelle
 * que soit la stratégie d'entrée retenue (invité+JIT, bienvenue à choix, session anonyme…).
 * Elle n'impose AUCUN parcours : elle expose seulement l'état. Le câblage viendra APRÈS
 * validation de la décision produit.
 */
export type LaunchStatus = 'unknown' | 'first-launch' | 'returning';

/** Clés de persistance (non sensibles) — versionnées pour évoluer sans casser l'existant. */
export const LAUNCH_KEYS = {
  seen: 'yootoo.launch.seen.v1',
  onboarded: 'yootoo.onboarding.done.v1',
} as const;

/** PUR : statut de lancement dérivé du flag « déjà vu ». */
export function deriveLaunchStatus(hasSeen: boolean): LaunchStatus {
  return hasSeen ? 'returning' : 'first-launch';
}

/** PUR : normalise une valeur de flag persistée (string/boolean/null) en booléen. */
export function readBoolFlag(raw: string | boolean | null | undefined): boolean {
  return raw === true || raw === 'true' || raw === '1';
}
