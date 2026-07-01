import type { Signal, SignalKey } from './types';

/**
 * ARCHITECTURE UNIQUEMENT — aucun de ces signaux n'est implémenté ni enregistré.
 *
 * Pour ajouter un futur signal en "plug-in" (sans modifier le moteur) :
 *
 *   // src/features/discovery/signals/weather.ts
 *   import type { Signal } from '@/features/discovery';
 *   export const weatherSignal: Signal = (merchant, ctx) => {
 *     if (ctx.weather !== 'rain') return null;
 *     return { key: 'weather', weight: 0.6, value: 1, reason: 'Idéal par ce temps' };
 *   };
 *
 *   // au démarrage de l'app :
 *   import { registerSignal } from '@/features/discovery';
 *   import { weatherSignal } from './signals/weather';
 *   registerSignal(weatherSignal);
 *
 * Les données nécessaires arrivent via le `DiscoveryContext` (champs dédiés ou
 * `extras`). Aucun changement du cœur du moteur n'est requis.
 */

/** Signaux planifiés (roadmap) — clés réservées dans `SignalKey`. */
export const PLANNED_SIGNALS: SignalKey[] = [
  'weather',
  'traffic',
  'attendance',
  'promotion',
  'cashback',
  'mission',
  'longHabit',
  'budget',
  'calendar',
  'collective',
  'event',
];

/** Gabarit de référence (no-op) — à copier pour créer un vrai signal. */
export const signalTemplate: Signal = () => null;
