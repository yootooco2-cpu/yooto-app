/**
 * Ports (interfaces) vers les fournisseurs externes.
 *
 * Le Lot 1 ne fournit AUCUNE implémentation : Mapbox, Supabase et tout LLM
 * arrivent aux lots suivants derrière ces contrats. Le domaine ne dépend
 * jamais d'un fournisseur concret.
 */

import type {
  GeoPoint,
  MerchantCandidate,
  RouteEvaluation,
  RouteProvenance,
  TransportMode,
} from './domain/types';

/** Horloge injectable — la seule source de temps autorisée hors du domaine pur. */
export interface ClockPort {
  nowMs(): number;
}

export interface RouteRequest {
  origin: GeoPoint;
  destination: GeoPoint;
  mode: TransportMode;
}

export interface PlannedRoute {
  /** Géométrie de l'itinéraire (échantillonnée). */
  polyline: readonly GeoPoint[];
  durationSeconds: number;
  distanceMeters: number;
  /** Version incrémentée à chaque recalcul — invalide les évaluations passées. */
  routeVersion: number;
  /** Départ prévu (epoch ms), base des ETA. */
  departureAtMs: number;
  /** Provenance obligatoire : fournisseur, profil, version de config, confiance. */
  provenance: RouteProvenance;
}

/** Adaptateur vers le service de directions (Mapbox aux lots suivants). */
export interface RouteProviderPort {
  planRoute(request: RouteRequest): Promise<PlannedRoute>;
  /**
   * Évalue les détours réels (sortie → commerce → retour) par lots.
   * Le détour affiché provient toujours de ce port, jamais d'une estimation
   * du domaine ni d'un LLM.
   */
  evaluateDetours(
    route: PlannedRoute,
    candidates: readonly MerchantCandidate[],
    nowMs: number,
  ): Promise<readonly RouteEvaluation[]>;
}

export interface CandidateQuery {
  /** Géométrie du corridor de recherche. */
  corridor: readonly GeoPoint[];
  corridorWidthMeters: number;
  /** Identifiants de catégories opaques issus de la mission. */
  categoryIds: readonly string[];
  /** Borne dure du nombre de candidats retournés — jamais de corpus entier. */
  limit: number;
}

/** Source de candidats (filtrage client-side au MVP, décision produit GATE 1). */
export interface CandidateSourcePort {
  findCandidates(query: CandidateQuery): Promise<readonly MerchantCandidate[]>;
}

/**
 * Interface FACULTATIVE de cache de routes — AUCUNE IMPLÉMENTATION au
 * Lot 2B (décision GATE 2B). La licence CC-BY d'ORS n'est PAS une
 * autorisation produit ni RGPD de conserver des coordonnées : toute
 * implémentation future exigera une décision explicite (clé anonyme,
 * TTL, minimisation). Ce contrat existe uniquement pour que le futur
 * orchestrateur puisse en dépendre sans couplage.
 */
export interface RouteCachePort {
  get(key: string): Promise<PlannedRoute | null>;
  set(key: string, route: PlannedRoute): Promise<void>;
}
