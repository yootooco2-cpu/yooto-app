/**
 * LIGHT PHASE STORE — source unique de la phase lumineuse EFFECTIVE de la carte.
 *
 * Publiée par le cycle solaire (`solarLightCycle`) et par le light lab (frappe
 * manuelle) ; consommée par tout ce qui doit vivre avec la lumière du monde
 * (ex. la lumière d'ambiance des commerces). Module pur, sans dépendance.
 */

export type LightPhase = 'dawn' | 'day' | 'dusk' | 'night';

let current: LightPhase = 'day';
const listeners = new Set<(phase: LightPhase) => void>();

/** Phase actuellement affichée par la carte. */
export function getLightPhase(): LightPhase {
  return current;
}

/** Publie une phase (no-op si inchangée) — les abonnés sont notifiés, jamais bloquants. */
export function publishLightPhase(phase: LightPhase): void {
  if (phase === current) return;
  current = phase;
  for (const listener of listeners) {
    try {
      listener(phase);
    } catch (err) {
       
      console.error('[YOOTOO/map] light phase listener error', err);
    }
  }
}

/** S'abonne aux changements de phase. Retourne le désabonnement. */
export function subscribeLightPhase(listener: (phase: LightPhase) => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
