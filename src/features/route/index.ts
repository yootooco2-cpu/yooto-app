/**
 * API publique du domaine « Sur mon trajet » (Lot 1 — domaine pur).
 * Aucune UI, aucun fournisseur concret : uniquement des fonctions pures,
 * des types et des ports.
 */

export type {
  AccessibilityDataSource,
  GeoPoint,
  MerchantCandidate,
  Mission,
  MissionId,
  OpeningAtEta,
  OpeningStatus,
  Recommendation,
  RecommendationNote,
  RouteEvaluation,
  RouteProvenance,
  RouteProviderId,
  RoutingValidationStatus,
  ScoreFactors,
  TransportMode,
  TriState,
} from './domain/types';

export {
  createRouteEngineConfig,
  DEFAULT_ROUTE_ENGINE_CONFIG,
} from './config';
export type { RouteEngineConfig } from './config';

export {
  createMissionCatalog,
  DEFAULT_MISSION_POLICIES,
  MISSION_IDS,
} from './missions';
export type {
  MissionCatalogBindings,
  MissionCategoryBinding,
  MissionPolicy,
} from './missions';

export {
  evaluateEligibility,
  isAccessibilityRequired,
  missionCategoryFit,
} from './domain/eligibility';
export type {
  EligibilityContext,
  EligibilityVerdict,
  ExclusionReason,
  MissionCategoryFit,
} from './domain/eligibility';

export {
  compareRanked,
  computeScoreFactors,
  rankCandidates,
  SCORE_VERSION,
  SCORE_WEIGHTS_V1,
  scoreCandidate,
} from './domain/scoring';
export type { RankedCandidate, ScoreResult, ScoringContext } from './domain/scoring';

export {
  buildRecommendationReason,
  buildWheelchairRouteLabel,
  explainEmptyResult,
  formatDetourMinutes,
  WHEELCHAIR_ROUTE_MAX_LABEL,
} from './domain/reasons';
export type { ReasonInput } from './domain/reasons';

export {
  checkRecommendationUsability,
  recommendOnRoute,
} from './domain/recommend';
export type {
  RecommendationAudit,
  RecommendationInputItem,
  RecommendationInvalidity,
  RecommendationOutcome,
  RecommendationUsability,
} from './domain/recommend';

export { createIdleSession, transition } from './domain/session';
export type {
  CreateSessionInput,
  RouteSessionEvent,
  RouteSessionState,
  RouteSessionStatus,
  TransitionRejection,
  TransitionResult,
} from './domain/session';

export type {
  CandidateQuery,
  CandidateSourcePort,
  ClockPort,
  PlannedRoute,
  RouteProviderPort,
  RouteRequest,
} from './ports';

export {
  boundingBoxContains,
  boundingBoxOfPolyline,
  distanceToPolylineMeters,
  expandBoundingBox,
  isValidGeoPoint,
  METERS_PER_DEGREE_LAT,
  pointToSegmentDistanceMeters,
} from './geo/geometry';
export type { BoundingBox } from './geo/geometry';

export {
  buildCorridor,
  corridorForRoute,
  distanceToCorridorRouteMeters,
  isInCorridor,
} from './geo/corridor';
export type {
  Corridor,
  CorridorBuildFailure,
  CorridorBuildInput,
  CorridorBuildResult,
} from './geo/corridor';

export { buildShortlist } from './domain/shortlist';
export type {
  ShortlistAudit,
  ShortlistEntry,
  ShortlistOptions,
  ShortlistResult,
} from './domain/shortlist';

export { createFakeRouteProvider } from './providers/fakeRouteProvider';
export type {
  FakeRouteProvider,
  FakeRouteProviderCalls,
  FakeRouteProviderScript,
} from './providers/fakeRouteProvider';

export {
  createMapboxRouteProvider,
  MapboxDirectionsError,
  mapboxProfileForMode,
  parseDirectionsGeoJson,
} from './providers/mapboxRouteProvider';
export type {
  DirectionsParseFailure,
  DirectionsParseResult,
  DirectionsTransport,
  MapboxProfileMapping,
  MapboxRouteProviderDeps,
} from './providers/mapboxRouteProvider';

export { createStaticCandidateSource } from './providers/staticCandidateSource';

export {
  createWheelchairRoutingConfig,
  ORS_DOCUMENTED_DEFAULTS_UNVALIDATED,
} from './routingConfig';
export type {
  CreateWheelchairConfigInput,
  WheelchairRoutingConfig,
  WheelchairRoutingParams,
  WheelchairValidationStatus,
} from './routingConfig';

export {
  buildOrsDirectionsRequest,
  createOrsRouteProvider,
  ORS_PROVIDER_ID,
  OrsDirectionsError,
  parseOrsDirectionsGeoJson,
} from './providers/orsRouteProvider';
export type {
  BuildOrsRequestResult,
  OrsDirectionsBody,
  OrsDirectionsRequest,
  OrsParseResult,
  OrsProfile,
  OrsRouteFailure,
  OrsRouteProviderDeps,
  OrsTransport,
  OrsWheelchairRestrictions,
} from './providers/orsRouteProvider';

export {
  ACCESSIBLE_ROUTE_UNVERIFIABLE,
  checkSessionBinding,
  createPilotProviderRegistry,
  createProviderRegistry,
  failureStateForMode,
  routeMatchesBinding,
} from './providers/providerRegistry';
export type {
  BindingCheck,
  BindingMismatch,
  ModeResolution,
  ProviderRegistration,
  RegisterResult,
  RegistrationRejection,
  RouteProviderRegistry,
  SessionRoutingBinding,
} from './providers/providerRegistry';

export type { RouteCachePort } from './ports';
