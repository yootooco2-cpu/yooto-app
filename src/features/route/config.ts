/**
 * Configuration injectable du moteur « Sur mon trajet ».
 *
 * Tous les seuils (corridor, détour, expiration, confiance) sont des
 * HYPOTHÈSES DE CALIBRAGE à ajuster sur les données pilotes : rien n'est
 * figé dans le moteur. Chaque consommateur peut surcharger n'importe quelle
 * valeur via `createRouteEngineConfig`.
 */

import type { TransportMode } from './domain/types';

/**
 * Capacité déclarée du fournisseur de routage, exprimée en ROUTES/PAIRES
 * CALCULÉES par requête — jamais en nombre de localisations.
 * Valeurs à confirmer empiriquement au Lot 3C (smoke test).
 */
export interface ProviderCapacity {
  /** Limite lorsqu'une requête utilise des arguments dynamiques/flexibles. */
  maxRoutesPerFlexibleRequest: number;
  /** Limite d'une requête Matrix standard (sans arguments dynamiques). */
  maxRoutesPerStandardRequest: number;
}

/** Valeurs documentées par ORS (vérifiées le 15/07/2026). */
export const DEFAULT_ORS_CAPACITY: ProviderCapacity = {
  maxRoutesPerFlexibleRequest: 25,
  maxRoutesPerStandardRequest: 3500,
};

export interface RouteEngineConfig {
  /** Confiance minimale d'ouverture exigée pour une mission essentielle. */
  minOpeningConfidenceEssential: number;
  /**
   * Sous ce seuil de confiance, une ouverture « open » d'une mission non
   * essentielle reste éligible mais porte la mention « horaires à confirmer ».
   */
  openingConfidenceNoteThreshold: number;
  /** Fit de mission accordé à une catégorie compatible (les primaires valent 1). */
  compatibleCategoryFit: number;
  /** Valeur neutre quand la qualité est inconnue — le silence ne punit jamais. */
  neutralQuality: number;
  /** Valeur neutre quand la préférence locale est inconnue. */
  neutralLocalPreference: number;
  /**
   * Qualité minimale exigée — appliquée UNIQUEMENT si la qualité est connue.
   * `null` = gate désactivé. Une qualité inconnue n'exclut jamais.
   */
  minKnownQualityScore: number | null;
  /** Durée de validité d'une évaluation de détour (fraîcheur). */
  evaluationTtlMs: number;
  /** Durée de validité d'une recommandation. */
  recommendationTtlMs: number;
  /** Nombre maximal d'alternatives retournées avec la recommandation principale. */
  maxAlternatives: number;
  /**
   * Borne dure de la shortlist géographique envoyée au classement précis
   * (objectif MVP : ≤ 50 candidats). Jamais de corpus entier en aval.
   */
  maxShortlistCandidates: number;
  /**
   * Candidats maximum envoyés à l'évaluation Matrix (marche). Nettement
   * inférieur à la shortlist : 20 suffit pour 1 reco + 2 alternatives.
   */
  maxMatrixCandidates: number;
  /** K : candidats maximum évalués par Directions-waypoint (fauteuil). */
  wheelchairWaypointCandidates: number;
  /** Capacité déclarée du fournisseur — garde AVANT toute construction. */
  providerCapacity: ProviderCapacity;
  /**
   * Tolérance d'arrondi (secondes) : un détour négatif dans ]-tol, 0[ est
   * ramené à 0 et COMPTÉ dans l'audit ; en deçà → invalid_metrics.
   */
  detourRoundingToleranceSeconds: number;
  /** Même tolérance pour les distances (mètres). */
  detourRoundingToleranceMeters: number;
  /** Tolérance de détour par défaut, par mode (surchargée par session). */
  defaultMaxDetourSecondsByMode: Readonly<Record<TransportMode, number>>;
  /**
   * Largeur de corridor par mode — consommée par les lots suivants
   * (CorridorEngine), injectable dès maintenant pour ne rien figer.
   */
  corridorWidthMetersByMode: Readonly<Record<TransportMode, number>>;
}

/**
 * Valeurs par défaut : points de départ raisonnés, PAS des décisions terrain.
 * Le fauteuil roulant a ses propres seuils — jamais un alias de la marche.
 */
export const DEFAULT_ROUTE_ENGINE_CONFIG: RouteEngineConfig = {
  minOpeningConfidenceEssential: 0.7,
  openingConfidenceNoteThreshold: 0.5,
  compatibleCategoryFit: 0.6,
  neutralQuality: 0.5,
  neutralLocalPreference: 0.5,
  minKnownQualityScore: null,
  evaluationTtlMs: 120_000,
  recommendationTtlMs: 180_000,
  maxAlternatives: 2,
  maxShortlistCandidates: 50,
  maxMatrixCandidates: 20,
  wheelchairWaypointCandidates: 5,
  providerCapacity: DEFAULT_ORS_CAPACITY,
  detourRoundingToleranceSeconds: 1,
  detourRoundingToleranceMeters: 15,
  defaultMaxDetourSecondsByMode: {
    walk: 420,
    wheelchair: 360,
    bike: 300,
    car: 240,
    transit: 480,
  },
  corridorWidthMetersByMode: {
    walk: 200,
    wheelchair: 150,
    bike: 350,
    car: 800,
    transit: 300,
  },
};

export function createRouteEngineConfig(
  overrides: Partial<RouteEngineConfig> = {},
): RouteEngineConfig {
  return {
    ...DEFAULT_ROUTE_ENGINE_CONFIG,
    ...overrides,
    defaultMaxDetourSecondsByMode: {
      ...DEFAULT_ROUTE_ENGINE_CONFIG.defaultMaxDetourSecondsByMode,
      ...overrides.defaultMaxDetourSecondsByMode,
    },
    corridorWidthMetersByMode: {
      ...DEFAULT_ROUTE_ENGINE_CONFIG.corridorWidthMetersByMode,
      ...overrides.corridorWidthMetersByMode,
    },
    providerCapacity: {
      ...DEFAULT_ROUTE_ENGINE_CONFIG.providerCapacity,
      ...overrides.providerCapacity,
    },
  };
}
