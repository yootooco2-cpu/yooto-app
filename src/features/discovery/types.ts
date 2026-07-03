import type { MapCoordinate } from '@/features/map';
import type { Merchant } from '@/features/merchants';

import type { ResolvedIntent } from './intents/types';
import type { PreferenceSnapshot } from './preferences/types';

export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

/**
 * Contexte de découverte — état du monde au moment du calcul.
 * Champs `weather`/événements prévus (optionnels) pour évolutions futures.
 */
export interface DiscoveryContext {
  // --- Actifs ---
  now: Date;
  hour: number;
  weekday: number; // 0 = dimanche … 6 = samedi
  season: Season;
  userLocation: MapCoordinate | null;
  favorites: ReadonlySet<string>;
  history: ReadonlySet<string>;
  preferredCategories: ReadonlySet<string>;
  /** Intention déduite de la recherche (Intent Engine). */
  intent?: ResolvedIntent;
  /** Préférences apprises localement (Preference Engine). */
  preferences?: PreferenceSnapshot;
  // --- Architecture prévue (optionnels, non alimentés aujourd'hui) ---
  weather?: string;
  trafficLevel?: number;
  budget?: number;
  mobility?: 'walk' | 'bike' | 'car' | 'transit';
  calendarBusy?: boolean;
  /** Sac d'extension pour signaux plug-in (clés libres, sans modifier ce type). */
  extras?: Readonly<Record<string, unknown>>;
}

export type SignalKey =
  // --- Implémentés ---
  | 'distance'
  | 'openNow'
  | 'rating'
  | 'producer'
  | 'eco'
  | 'mealTime'
  | 'season'
  | 'favorite'
  | 'habit'
  | 'history'
  | 'intent'
  | 'preference'
  // --- Prévus (architecture plug-in, non implémentés) ---
  | 'weather'
  | 'traffic'
  | 'attendance'
  | 'promotion'
  | 'cashback'
  | 'mission'
  | 'longHabit'
  | 'budget'
  | 'calendar'
  | 'collective'
  | 'event';

/** Contribution d'un signal au Discovery Score. `value` ∈ [0,1]. */
export interface SignalContribution {
  key: SignalKey;
  weight: number;
  value: number;
  /**
   * Mode d'agrégation (agrégateur v2).
   *  - `'additive'` (défaut) : entre dans la moyenne pondérée (pertinence contextuelle) ;
   *  - `'multiplicative'` : agit comme un gate éditorial (prior de catégorie, qualité…).
   * Défaut `additive` → tous les signaux existants sont inchangés (rétrocompatible).
   * AUCUN signal `multiplicative` n'existe au Sprint 1 : l'ordre reste identique à l'actuel.
   */
  mode?: 'additive' | 'multiplicative';
  /** Explication lisible (vouvoiement) si le signal contribue fortement. */
  reason?: string;
}

/** Un signal est une fonction PURE et indépendante (faible couplage, testable). */
export type Signal = (merchant: Merchant, ctx: DiscoveryContext) => SignalContribution | null;

export interface ScoredMerchant {
  merchant: Merchant;
  /** Score interne [0,1] — JAMAIS affiché à l'utilisateur. */
  score: number;
  contributions: SignalContribution[];
  /** Explications dérivées des signaux les plus contributifs. */
  reasons: string[];
}
