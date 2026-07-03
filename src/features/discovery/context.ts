import type { MapCoordinate } from '@/features/map';

import { getRankingV2 } from './flags';
import { resolveIntent } from './intents/intentEngine';
import type { ResolvedIntent } from './intents/types';
import type { PreferenceSnapshot } from './preferences/types';
import type { DiscoveryContext, Season } from './types';

export const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

export function seasonOf(date: Date): Season {
  const month = date.getMonth(); // 0..11
  if (month >= 2 && month <= 4) return 'spring';
  if (month >= 5 && month <= 7) return 'summer';
  if (month >= 8 && month <= 10) return 'autumn';
  return 'winter';
}

export interface DiscoveryContextInput {
  now?: Date;
  userLocation?: MapCoordinate | null;
  favorites?: ReadonlySet<string>;
  history?: ReadonlySet<string>;
  preferredCategories?: ReadonlySet<string>;
  /** Recherche brute (sera résolue en intention) OU intention déjà résolue. */
  query?: string;
  intent?: ResolvedIntent;
  preferences?: PreferenceSnapshot;
  weather?: string;
  trafficLevel?: number;
  budget?: number;
  mobility?: 'walk' | 'bike' | 'car' | 'transit';
  calendarBusy?: boolean;
  extras?: Readonly<Record<string, unknown>>;
}

/**
 * Construit le contexte de découverte. Les signaux utilisateur (favoris,
 * historique, habitudes) ont une architecture prête : vides aujourd'hui,
 * alimentés demain par Supabase / stockage local sans changer le moteur.
 */
export function buildDiscoveryContext(input: DiscoveryContextInput = {}): DiscoveryContext {
  const now = input.now ?? new Date();
  return {
    now,
    hour: now.getHours(),
    weekday: now.getDay(),
    season: seasonOf(now),
    userLocation: input.userLocation ?? null,
    favorites: input.favorites ?? new Set<string>(),
    history: input.history ?? new Set<string>(),
    preferredCategories: input.preferredCategories ?? new Set<string>(),
    intent: input.intent ?? resolveIntent(input.query),
    preferences: input.preferences,
    weather: input.weather,
    trafficLevel: input.trafficLevel,
    budget: input.budget,
    mobility: input.mobility,
    calendarBusy: input.calendarBusy,
    // Feature flag ranking v2 transporté dans `extras` (défaut OFF via `getRankingV2()`).
    // Un appelant (harness A/B, test) peut le forcer via `input.extras.rankingV2`.
    extras: { ...input.extras, rankingV2: input.extras?.rankingV2 ?? getRankingV2() },
  };
}
