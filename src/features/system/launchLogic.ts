/**
 * FONDATION TRANSVERSE B — Orchestration du lancement & des « milestones » (logique PURE).
 *
 * Rôle STRICT : piloter des ÉTATS et des TRANSITIONS de cycle de vie applicatif. AUCUNE
 * logique métier (ni auth, ni onboarding) n'est baked-in : « onboarding » n'est qu'un
 * *milestone* parmi d'autres, choisi par l'appelant. Réutilisable pour : première ouverture,
 * écran « Nouveautés », intro d'une feature, coach-marks, cohortes analytics, etc.
 * Aucun module natif ici → testable et parcours-agnostique.
 */
export type LaunchStatus = 'unknown' | 'first-launch' | 'returning';

/** Clé du drapeau « app déjà lancée » (versionnée). */
export const LAUNCH_SEEN_KEY = 'yootoo.launch.seen.v1';

/** PUR : clé de persistance d'un *milestone* générique (ex. `onboarding`, `whatsnew-2`). */
export function milestoneKey(name: string): string {
  return `yootoo.milestone.${name}.v1`;
}

/** PUR : statut de lancement dérivé du drapeau « déjà vu ». */
export function deriveLaunchStatus(hasSeen: boolean): LaunchStatus {
  return hasSeen ? 'returning' : 'first-launch';
}

/** PUR : normalise une valeur de drapeau persistée (string/boolean/null) en booléen. */
export function readBoolFlag(raw: string | boolean | null | undefined): boolean {
  return raw === true || raw === 'true' || raw === '1';
}
