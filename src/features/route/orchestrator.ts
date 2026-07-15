/**
 * Orchestrateur de session « Sur mon trajet » — Lot 2C.
 *
 * Déterministe, sans réseau propre et entièrement contrôlable par injection :
 * les fournisseurs restent des ports asynchrones (le domaine n'exécute aucun
 * effet lui-même, mais ce contrat n'est pas présenté comme mathématiquement
 * pur). Aucun GPS continu, aucun cache, aucune UI ici.
 *
 * Règles câblées :
 * - échecs métier = résultats TYPÉS (union discriminée), jamais des
 *   exceptions pour les cas normaux ; aucun message ne contient de
 *   coordonnées brutes ;
 * - le binding de session (providerId + profileId + routingConfigVersion)
 *   est contrôlé sur la route principale, sur chaque évaluation de détour,
 *   après tout changement de route, avant le scoring final et avant
 *   l'émission — toute incompatibilité ARRÊTE le pipeline ;
 * - fauteuil : jamais de bascule vers un profil piéton ; échec →
 *   'accessible_route_unverifiable' ;
 * - une seule recommandation active ; les alternatives restent un détail
 *   interne borné, conservé pour l'audit et les recalculs futurs ;
 * - trois notions d'accessibilité distinctes dans l'audit : adaptation
 *   estimée de l'itinéraire, validation de la configuration de routage,
 *   donnée d'accessibilité du commerce.
 */

import type { RouteEngineConfig } from './config';
import type { EligibilityContext } from './domain/eligibility';
import { WHEELCHAIR_ROUTE_MAX_LABEL } from './domain/reasons';
import type { RecommendationAudit } from './domain/recommend';
import { checkRecommendationUsability, recommendOnRoute } from './domain/recommend';
import type { RouteSessionState } from './domain/session';
import { createIdleSession, transition } from './domain/session';
import type { ShortlistAudit } from './domain/shortlist';
import { buildShortlist } from './domain/shortlist';
import type {
  GeoPoint,
  MerchantCandidate,
  Mission,
  Recommendation,
  RouteEvaluation,
  RouteProvenance,
  RoutingValidationStatus,
  TransportMode,
  TriState,
} from './domain/types';
import { corridorForRoute } from './geo/corridor';
import type { PlannedRoute, RouteProviderPort } from './ports';
import type {
  RouteProviderRegistry,
  SessionRoutingBinding,
} from './providers/providerRegistry';
import { checkSessionBinding, routeMatchesBinding } from './providers/providerRegistry';

export interface OrchestratorDeps {
  registry: RouteProviderRegistry;
  /** Collection explicite de candidats (client-side, décision GATE 1). */
  candidates: readonly MerchantCandidate[];
  config: RouteEngineConfig;
}

export interface RouteSessionRequest {
  sessionId: string;
  mode: TransportMode;
  mission: Mission;
  origin: GeoPoint;
  destination: GeoPoint;
  consentGiven: boolean;
  /** Tolérance de détour ; défaut = config par mode. */
  maxDetourSeconds?: number;
  /** Temps injecté — jamais Date.now(). */
  nowMs: number;
}

/**
 * Échecs métier attendus — résultats typés, jamais des exceptions.
 * Le cas « aucun candidat » n'est PAS un échec : il a sa propre variante
 * autonome `kind: 'no_candidate'` dans RouteSessionOutcome.
 */
export type SessionFailureReason =
  | 'consent_missing'
  | 'mode_not_enabled'
  | 'accessible_route_unverifiable'
  | 'route_unavailable'
  | 'corridor_unconstructible'
  | 'binding_mismatch';

/**
 * Trois notions d'accessibilité, jamais confondues :
 * - routeAdaptation : l'itinéraire fauteuil est une ADAPTATION ESTIMÉE
 *   d'après les données du graphe (OSM via ORS) — jamais une garantie ;
 * - routingConfigValidation : niveau de validation des RÉGLAGES de routage
 *   (information d'audit interne, pas un message utilisateur automatique) ;
 * - recommendedMerchantAccessibility : donnée d'accessibilité DU COMMERCE
 *   recommandé (donnée marchande, tri-état préservé). Un commerce n'est
 *   jamais « vérifié » parce qu'une route a été calculée jusqu'à lui.
 */
export interface AccessibilityAudit {
  routeAdaptation: 'estimated_from_osm_data' | 'not_estimated';
  routingConfigValidation: RoutingValidationStatus;
  recommendedMerchantAccessibility: TriState | null;
}

export interface SessionPipelineAudit {
  binding: SessionRoutingBinding;
  routeProvenance: RouteProvenance;
  accessibility: AccessibilityAudit;
  shortlist: ShortlistAudit;
  /** Candidats de la shortlist restés sans évaluation de détour. */
  withoutEvaluationCount: number;
  recommendation: RecommendationAudit;
}

export type RouteSessionOutcome =
  | {
      kind: 'suggestion';
      session: RouteSessionState;
      route: PlannedRoute;
      binding: SessionRoutingBinding;
      /** UNE SEULE recommandation active côté produit. */
      activeRecommendation: Recommendation;
      /**
       * Détail INTERNE borné (config.maxAlternatives), conservé avec score,
       * facteurs et notes pour audit et recalcul — jamais présenté comme
       * plusieurs suggestions simultanées.
       */
      internalAlternatives: readonly Recommendation[];
      /** Libellé maximal autorisé pour la route fauteuil, sinon null. */
      routeLabel: string | null;
      audit: SessionPipelineAudit;
    }
  | {
      kind: 'no_candidate';
      session: RouteSessionState;
      route: PlannedRoute;
      binding: SessionRoutingBinding;
      /** Explication honnête et déterministe, sans coordonnées. */
      explanation: string;
      audit: SessionPipelineAudit;
    }
  | {
      kind: 'failure';
      reason: SessionFailureReason;
      /** Précision optionnelle (codes uniquement, jamais de coordonnées). */
      detail?: string;
    };

/** État transportable d'une session orchestrée (pour changeRoute). */
export interface OrchestratedSession {
  session: RouteSessionState;
  binding: SessionRoutingBinding;
  route: PlannedRoute;
}

function failureStateFor(mode: TransportMode): SessionFailureReason {
  return mode === 'wheelchair' ? 'accessible_route_unverifiable' : 'route_unavailable';
}

function missionCategoryIds(mission: Mission): readonly string[] {
  return [...mission.primaryCategoryIds, ...mission.compatibleCategoryIds];
}

function accessibilityAuditFor(
  provenance: RouteProvenance,
  recommendedMerchantAccessibility: TriState | null,
): AccessibilityAudit {
  return {
    routeAdaptation:
      provenance.accessibilityDataSource === 'osm_via_ors'
        ? 'estimated_from_osm_data'
        : 'not_estimated',
    routingConfigValidation: provenance.validationStatus,
    recommendedMerchantAccessibility,
  };
}

/**
 * Pipeline candidats → recommandation pour une route donnée. La session
 * passée doit être 'active' ; en cas de suggestion, la transition 'suggest'
 * est appliquée.
 */
async function runCandidatePipeline(
  provider: RouteProviderPort,
  route: PlannedRoute,
  session: RouteSessionState,
  binding: SessionRoutingBinding,
  deps: OrchestratorDeps,
  nowMs: number,
): Promise<RouteSessionOutcome> {
  const { config } = deps;
  const mode = session.mode;

  // Contrôle de binding sur la route principale.
  const routeCheck = routeMatchesBinding(binding, route);
  if (!routeCheck.ok) {
    return { kind: 'failure', reason: 'binding_mismatch', detail: routeCheck.mismatch };
  }

  // Corridor : construit une fois par version de route.
  const corridorResult = corridorForRoute(route, config.corridorWidthMetersByMode[mode]);
  if (!corridorResult.ok) {
    return { kind: 'failure', reason: 'corridor_unconstructible', detail: corridorResult.reason };
  }

  // Présélection mission (identifiants opaques) puis shortlist bornée.
  const categoryIds = missionCategoryIds(session.mission);
  const missionCandidates = deps.candidates.filter((candidate) =>
    candidate.categoryIds.some((id) => categoryIds.includes(id)),
  );
  const shortlist = buildShortlist(missionCandidates, corridorResult.corridor, {
    limit: config.maxShortlistCandidates,
  });

  // Évaluations de détour : toujours via le port — jamais calculées ici.
  const shortlistCandidates = shortlist.entries.map((entry) => entry.candidate);
  let evaluations: readonly RouteEvaluation[];
  try {
    evaluations = await provider.evaluateDetours(route, shortlistCandidates, nowMs);
  } catch {
    return { kind: 'failure', reason: failureStateFor(mode) };
  }

  // Contrôle de binding sur CHAQUE évaluation : une incompatibilité arrête
  // le pipeline — elle n'est jamais simplement consignée puis ignorée.
  for (const evaluation of evaluations) {
    if (evaluation.routeVersion !== route.routeVersion) {
      return {
        kind: 'failure',
        reason: 'binding_mismatch',
        detail: 'evaluation_route_version_mismatch',
      };
    }
  }

  const evaluationByMerchantId = new Map(
    evaluations.map((evaluation) => [evaluation.merchantId, evaluation]),
  );
  const items = shortlistCandidates
    .filter((candidate) => evaluationByMerchantId.has(candidate.merchantId))
    .map((candidate) => ({
      candidate,
      evaluation: evaluationByMerchantId.get(candidate.merchantId) as RouteEvaluation,
    }));
  const withoutEvaluationCount = shortlistCandidates.length - items.length;

  // Re-contrôle du binding AVANT le scoring final.
  const preScoringCheck = routeMatchesBinding(binding, route);
  if (!preScoringCheck.ok) {
    return { kind: 'failure', reason: 'binding_mismatch', detail: preScoringCheck.mismatch };
  }

  const ctx: EligibilityContext = {
    mission: session.mission,
    mode,
    routeVersion: route.routeVersion,
    maxDetourSeconds: session.maxDetourSeconds,
    refusedMerchantIds: session.refusedMerchantIds,
    announcedMerchantIds: session.announcedMerchantIds,
    nowMs,
    config,
  };
  const outcome = recommendOnRoute(items, ctx);

  const baseAudit = {
    binding,
    routeProvenance: route.provenance,
    shortlist: shortlist.audit,
    withoutEvaluationCount,
    recommendation: outcome.audit,
  };

  if (outcome.kind === 'none') {
    return {
      kind: 'no_candidate',
      session,
      route,
      binding,
      explanation: outcome.explanation,
      audit: {
        ...baseAudit,
        accessibility: accessibilityAuditFor(route.provenance, null),
      },
    };
  }

  // Contrôles AVANT ÉMISSION : la recommandation appartient bien à la route
  // et à la version courantes.
  const usability = checkRecommendationUsability(
    outcome.recommendation,
    route.routeVersion,
    nowMs,
  );
  if (!usability.usable) {
    return {
      kind: 'failure',
      reason: 'binding_mismatch',
      detail: usability.invalidity,
    };
  }

  const suggested = transition(session, {
    type: 'suggest',
    recommendation: outcome.recommendation,
    nowMs,
  });
  if (!suggested.ok) {
    return { kind: 'failure', reason: 'binding_mismatch', detail: suggested.rejection };
  }

  const recommendedCandidate = shortlistCandidates.find(
    (candidate) => candidate.merchantId === outcome.recommendation.merchantId,
  );

  return {
    kind: 'suggestion',
    session: suggested.session,
    route,
    binding,
    activeRecommendation: outcome.recommendation,
    internalAlternatives: outcome.alternatives,
    routeLabel: mode === 'wheelchair' ? WHEELCHAIR_ROUTE_MAX_LABEL : null,
    audit: {
      ...baseAudit,
      accessibility: accessibilityAuditFor(
        route.provenance,
        recommendedCandidate?.accessibility ?? null,
      ),
    },
  };
}

/** Démarre une session : fournisseur → route → pipeline candidats. */
export async function startRouteSession(
  request: RouteSessionRequest,
  deps: OrchestratorDeps,
): Promise<RouteSessionOutcome> {
  const resolution = deps.registry.resolve(request.mode);
  if (resolution.status === 'accessible_route_unverifiable') {
    return { kind: 'failure', reason: 'accessible_route_unverifiable' };
  }
  if (resolution.status === 'mode_not_enabled') {
    return { kind: 'failure', reason: 'mode_not_enabled' };
  }
  const { provider, binding } = resolution;

  const idle = createIdleSession({
    id: request.sessionId,
    mode: request.mode,
    mission: request.mission,
    destination: request.destination,
    consentGiven: request.consentGiven,
    maxDetourSeconds:
      request.maxDetourSeconds ??
      deps.config.defaultMaxDetourSecondsByMode[request.mode],
  });
  const activated = transition(idle, { type: 'activate', nowMs: request.nowMs });
  if (!activated.ok) {
    return { kind: 'failure', reason: 'consent_missing', detail: activated.rejection };
  }

  let route: PlannedRoute;
  try {
    route = await provider.planRoute({
      origin: request.origin,
      destination: request.destination,
      mode: request.mode,
    });
  } catch {
    // Fauteuil : état honnête, JAMAIS de bascule vers un profil piéton.
    return { kind: 'failure', reason: failureStateFor(request.mode) };
  }

  // La machine d'état exige une version de route strictement croissante :
  // on aligne la session sur la version réelle fournie par le provider.
  const session: RouteSessionState = { ...activated.session, routeVersion: route.routeVersion };

  return runCandidatePipeline(provider, route, session, binding, deps, request.nowMs);
}

/**
 * Changement de route : invalide l'ancienne recommandation et TOUTES les
 * évaluations associées (transition 'route_changed' + nouvelle version de
 * route) avant de relancer le pipeline. Aucun résultat de l'ancienne route
 * ne peut être réutilisé : les contrôles de version rejettent tout vestige.
 */
export async function changeRoute(
  current: OrchestratedSession,
  request: { origin: GeoPoint; destination: GeoPoint; nowMs: number },
  deps: OrchestratorDeps,
): Promise<RouteSessionOutcome> {
  const resolution = deps.registry.resolve(current.session.mode);
  if (resolution.status === 'accessible_route_unverifiable') {
    return { kind: 'failure', reason: 'accessible_route_unverifiable' };
  }
  if (resolution.status === 'mode_not_enabled') {
    return { kind: 'failure', reason: 'mode_not_enabled' };
  }

  // Le triplet de session ne change JAMAIS en cours de session.
  const bindingCheck = checkSessionBinding(current.binding, resolution.binding);
  if (!bindingCheck.ok) {
    return { kind: 'failure', reason: 'binding_mismatch', detail: bindingCheck.mismatch };
  }

  let route: PlannedRoute;
  try {
    route = await resolution.provider.planRoute({
      origin: request.origin,
      destination: request.destination,
      mode: current.session.mode,
    });
  } catch {
    return { kind: 'failure', reason: failureStateFor(current.session.mode) };
  }

  const moved = transition(current.session, {
    type: 'route_changed',
    newRouteVersion: route.routeVersion,
  });
  if (!moved.ok) {
    return { kind: 'failure', reason: 'route_unavailable', detail: moved.rejection };
  }

  return runCandidatePipeline(
    resolution.provider,
    route,
    moved.session,
    current.binding,
    deps,
    request.nowMs,
  );
}
