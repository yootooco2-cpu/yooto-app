/**
 * Tests de l'orchestrateur pur : pipeline complet, alternatives bornées,
 * audit des exclusions, absence honnête de résultat, validité des
 * recommandations (expiration, changement de route).
 */

import { createRouteEngineConfig } from '../config';
import {
  FIXED_NOW_MS,
  makeCandidate,
  makeContext,
  makeEvaluation,
  TEST_CATEGORY_IDS,
  TEST_MISSIONS,
} from '../fixtures';
import type { RecommendationInputItem } from './recommend';
import { checkRecommendationUsability, recommendOnRoute } from './recommend';
import type { MerchantCandidate, RouteEvaluation } from './types';

function item(
  merchantId: string,
  overrides: {
    candidate?: Partial<MerchantCandidate>;
    evaluation?: Partial<RouteEvaluation>;
  } = {},
): RecommendationInputItem {
  return {
    candidate: makeCandidate({ merchantId, ...overrides.candidate }),
    evaluation: makeEvaluation({ merchantId, ...overrides.evaluation }),
  };
}

describe('recommendOnRoute — pipeline complet', () => {
  it('choisit le meilleur candidat et explique la recommandation', () => {
    const outcome = recommendOnRoute(
      [
        item('far', { candidate: { accessibility: 'yes' }, evaluation: { detourSeconds: 300 } }),
        item('near', { candidate: { accessibility: 'yes' }, evaluation: { detourSeconds: 60 } }),
      ],
      makeContext(),
    );
    expect(outcome.kind).toBe('recommendation');
    if (outcome.kind !== 'recommendation') return;
    expect(outcome.recommendation.merchantId).toBe('near');
    expect(outcome.recommendation.reason).toBe('Ouvert à votre passage, détour 1 min');
    expect(outcome.recommendation.scoreVersion).toBe(1);
    expect(outcome.recommendation.routeVersion).toBe(1);
    expect(outcome.recommendation.createdAtMs).toBe(FIXED_NOW_MS);
    expect(outcome.audit.evaluatedCount).toBe(2);
    expect(outcome.audit.eligibleCount).toBe(2);
  });

  it('borne les alternatives à config.maxAlternatives, dans l’ordre du classement', () => {
    const outcome = recommendOnRoute(
      [
        item('a', { evaluation: { detourSeconds: 60 } }),
        item('b', { evaluation: { detourSeconds: 120 } }),
        item('c', { evaluation: { detourSeconds: 180 } }),
        item('d', { evaluation: { detourSeconds: 240 } }),
      ],
      makeContext({ config: createRouteEngineConfig({ maxAlternatives: 2 }) }),
    );
    if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
    expect(outcome.recommendation.merchantId).toBe('a');
    expect(outcome.alternatives.map((r) => r.merchantId)).toEqual(['b', 'c']);
  });

  it('un candidat inéligible n’est jamais recommandé, et l’audit compte chaque motif', () => {
    const outcome = recommendOnRoute(
      [
        item('closed', { candidate: { opening: { status: 'closed', confidence: 0.9 } } }),
        item('ok', { evaluation: { detourSeconds: 90 } }),
      ],
      makeContext(),
    );
    if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
    expect(outcome.recommendation.merchantId).toBe('ok');
    expect(outcome.audit.exclusionCounts.closed_at_eta).toBe(1);
    expect(outcome.audit.eligibleCount).toBe(1);
  });

  it('la recommandation porte les mentions honnêtes du candidat (horaires à confirmer)', () => {
    const outcome = recommendOnRoute(
      [item('m', { candidate: { opening: { status: 'unknown', confidence: 0 } } })],
      makeContext(),
    );
    if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
    expect(outcome.recommendation.notes).toContain('opening_to_confirm');
    expect(outcome.recommendation.reason).toContain('Horaires à confirmer');
  });

  it('aucun candidat → état vide honnête, jamais de recommandation forcée', () => {
    const outcome = recommendOnRoute([], makeContext());
    expect(outcome.kind).toBe('none');
    if (outcome.kind !== 'none') return;
    expect(outcome.explanation).toBe('Aucun commerce compatible sur ce trajet.');
    expect(outcome.audit.evaluatedCount).toBe(0);
  });

  it('tous exclus → explication du motif dominant + audit complet', () => {
    const outcome = recommendOnRoute(
      [
        item('a', { candidate: { opening: { status: 'closed', confidence: 0.9 } } }),
        item('b', { candidate: { opening: { status: 'closed', confidence: 0.8 } } }),
        item('c', { evaluation: { detourSeconds: 10_000 } }),
      ],
      makeContext(),
    );
    expect(outcome.kind).toBe('none');
    if (outcome.kind !== 'none') return;
    expect(outcome.explanation).toBe(
      'Aucune étape proposée : les commerces seraient fermés à votre passage.',
    );
    expect(outcome.audit.exclusionCounts).toEqual({ closed_at_eta: 2, detour_exceeded: 1 });
  });

  it('mission fauteuil/accessibilité : seul un lieu vérifié accessible est recommandé', () => {
    const outcome = recommendOnRoute(
      [
        item('unknown-access', {
          candidate: {
            categoryIds: [TEST_CATEGORY_IDS.publicToilet],
            accessibility: 'unknown',
          },
        }),
        item('verified-access', {
          candidate: {
            categoryIds: [TEST_CATEGORY_IDS.publicToilet],
            accessibility: 'yes',
          },
          evaluation: { detourSeconds: 240 },
        }),
      ],
      makeContext({ mission: TEST_MISSIONS.accessible_toilet, mode: 'wheelchair' }),
    );
    if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
    expect(outcome.recommendation.merchantId).toBe('verified-access');
    expect(outcome.recommendation.reason).toContain('Accès fauteuil indiqué');
    expect(outcome.audit.exclusionCounts.accessibility_unknown_required).toBe(1);
  });
});

describe('checkRecommendationUsability', () => {
  it('rejette une recommandation expirée', () => {
    const outcome = recommendOnRoute([item('m')], makeContext());
    if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
    const { recommendation } = outcome;
    expect(checkRecommendationUsability(recommendation, 1, recommendation.expiresAtMs)).toEqual({
      usable: false,
      invalidity: 'expired',
    });
    expect(
      checkRecommendationUsability(recommendation, 1, recommendation.expiresAtMs - 1).usable,
    ).toBe(true);
  });

  it('rejette une recommandation liée à une ancienne version de route', () => {
    const outcome = recommendOnRoute([item('m')], makeContext({ routeVersion: 1 }));
    if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
    expect(checkRecommendationUsability(outcome.recommendation, 2, FIXED_NOW_MS)).toEqual({
      usable: false,
      invalidity: 'route_changed',
    });
  });
});
