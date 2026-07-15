/**
 * Fixtures déterministes : trajets simulés et commerces contrôlés.
 *
 * Coordonnées réalistes (zone Montpellier, compatibles avec les bornes de
 * plausibilité France de la carte). Le temps est un epoch FIGÉ — aucune
 * horloge réelle. Les identifiants de catégories sont des identifiants de
 * TEST opaques : ils ne référencent pas la taxonomie v5.
 */

import type { RouteEngineConfig } from '../config';
import { createRouteEngineConfig } from '../config';
import type { EligibilityContext } from '../domain/eligibility';
import type {
  GeoPoint,
  MerchantCandidate,
  Mission,
  RouteEvaluation,
} from '../domain/types';
import type { MissionCatalogBindings } from '../missions';
import { createMissionCatalog } from '../missions';
import type { PlannedRoute } from '../ports';

/** Mercredi 15 juillet 2026, 10:00:00 UTC — instant de référence figé. */
export const FIXED_NOW_MS = Date.UTC(2026, 6, 15, 10, 0, 0);

/** Identifiants de catégories de test — opaques, sans lien avec la taxonomie v5. */
export const TEST_CATEGORY_IDS = {
  bakery: 'test.cat.bakery',
  coffeeShop: 'test.cat.coffee-shop',
  teaRoom: 'test.cat.tea-room',
  grocery: 'test.cat.grocery',
  pharmacy: 'test.cat.pharmacy',
  publicToilet: 'test.cat.public-toilet',
  bookshop: 'test.cat.bookshop',
} as const;

export const TEST_MISSION_BINDINGS: MissionCatalogBindings = {
  bread: { primaryCategoryIds: [TEST_CATEGORY_IDS.bakery], compatibleCategoryIds: [TEST_CATEGORY_IDS.grocery] },
  coffee: { primaryCategoryIds: [TEST_CATEGORY_IDS.coffeeShop], compatibleCategoryIds: [TEST_CATEGORY_IDS.teaRoom] },
  water: { primaryCategoryIds: [TEST_CATEGORY_IDS.grocery] },
  pharmacy: { primaryCategoryIds: [TEST_CATEGORY_IDS.pharmacy] },
  accessible_toilet: { primaryCategoryIds: [TEST_CATEGORY_IDS.publicToilet] },
};

export const TEST_MISSIONS = createMissionCatalog(TEST_MISSION_BINDINGS);

/** Trajet simulé : Place de la Comédie → Les Arceaux (Montpellier), ~1,8 km. */
export const SIMULATED_ROUTE_COMEDIE_ARCEAUX: PlannedRoute = {
  polyline: [
    { latitude: 43.6086, longitude: 3.8797 },
    { latitude: 43.6098, longitude: 3.877 },
    { latitude: 43.6109, longitude: 3.8741 },
    { latitude: 43.6117, longitude: 3.8712 },
    { latitude: 43.6122, longitude: 3.8683 },
    { latitude: 43.6128, longitude: 3.8655 },
  ],
  durationSeconds: 1560,
  distanceMeters: 1820,
  routeVersion: 1,
  departureAtMs: FIXED_NOW_MS,
  provenance: {
    providerId: 'fixture',
    profileId: 'simulated',
    routingConfigVersion: 0,
    accessibilityDataSource: 'none',
    validationStatus: 'unvalidated',
    generatedAtMs: FIXED_NOW_MS,
  },
};

export const DESTINATION_ARCEAUX: GeoPoint = { latitude: 43.6128, longitude: 3.8655 };

export function makeCandidate(overrides: Partial<MerchantCandidate> = {}): MerchantCandidate {
  return {
    merchantId: 'merchant-001',
    position: { latitude: 43.6105, longitude: 3.8748 },
    categoryIds: [TEST_CATEGORY_IDS.bakery],
    opening: { status: 'open', confidence: 0.9, verifiedAtMs: FIXED_NOW_MS - 3_600_000 },
    accessibility: 'unknown',
    ...overrides,
  };
}

export function makeEvaluation(overrides: Partial<RouteEvaluation> = {}): RouteEvaluation {
  return {
    merchantId: 'merchant-001',
    routeVersion: 1,
    exitPoint: { latitude: 43.6109, longitude: 3.8741 },
    rejoinPoint: { latitude: 43.6117, longitude: 3.8712 },
    etaAtMerchantMs: FIXED_NOW_MS + 480_000,
    detourSeconds: 120,
    detourMeters: 150,
    computedAtMs: FIXED_NOW_MS,
    ...overrides,
  };
}

export interface MakeContextOptions {
  mission?: Mission;
  mode?: EligibilityContext['mode'];
  routeVersion?: number;
  maxDetourSeconds?: number;
  refusedMerchantIds?: readonly string[];
  announcedMerchantIds?: readonly string[];
  nowMs?: number;
  config?: RouteEngineConfig;
}

export function makeContext(options: MakeContextOptions = {}): EligibilityContext {
  const config = options.config ?? createRouteEngineConfig();
  const mode = options.mode ?? 'walk';
  return {
    mission: options.mission ?? TEST_MISSIONS.bread,
    mode,
    routeVersion: options.routeVersion ?? 1,
    maxDetourSeconds:
      options.maxDetourSeconds ?? config.defaultMaxDetourSecondsByMode[mode],
    refusedMerchantIds: options.refusedMerchantIds ?? [],
    announcedMerchantIds: options.announcedMerchantIds ?? [],
    nowMs: options.nowMs ?? FIXED_NOW_MS,
    config,
  };
}
