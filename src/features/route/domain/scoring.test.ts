/**
 * Tests du RankingEngine v1 : score versionné, normalisé, explicable,
 * et départage des égalités par une règle stable.
 */

import { createRouteEngineConfig } from '../config';
import {
  makeCandidate,
  makeEvaluation,
  TEST_CATEGORY_IDS,
  TEST_MISSIONS,
} from '../fixtures';
import type { RankedCandidate, ScoringContext } from './scoring';
import {
  compareRanked,
  computeScoreFactors,
  rankCandidates,
  SCORE_VERSION,
  SCORE_WEIGHTS_V1,
  scoreCandidate,
} from './scoring';

function makeScoringContext(overrides: Partial<ScoringContext> = {}): ScoringContext {
  return {
    mission: TEST_MISSIONS.bread,
    maxDetourSeconds: 420,
    config: createRouteEngineConfig(),
    ...overrides,
  };
}

describe('SCORE_WEIGHTS_V1', () => {
  it('les poids v1 valent exactement 0,35/0,25/0,15/0,15/0,10 et somment à 1', () => {
    expect(SCORE_WEIGHTS_V1).toEqual({
      mission: 0.35,
      detour: 0.25,
      openingConfidence: 0.15,
      quality: 0.15,
      localPreference: 0.1,
    });
    const sum =
      SCORE_WEIGHTS_V1.mission +
      SCORE_WEIGHTS_V1.detour +
      SCORE_WEIGHTS_V1.openingConfidence +
      SCORE_WEIGHTS_V1.quality +
      SCORE_WEIGHTS_V1.localPreference;
    expect(sum).toBeCloseTo(1, 10);
  });
});

describe('computeScoreFactors', () => {
  it('normalise chaque facteur dans [0,1]', () => {
    const factors = computeScoreFactors(
      makeCandidate({ qualityScore: 1.7, localScore: -0.3 }),
      makeEvaluation({ detourSeconds: 0 }),
      makeScoringContext(),
    );
    for (const value of Object.values(factors)) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it('détour nul → facteur 1 ; détour à la tolérance → facteur 0', () => {
    const ctx = makeScoringContext({ maxDetourSeconds: 300 });
    expect(computeScoreFactors(makeCandidate(), makeEvaluation({ detourSeconds: 0 }), ctx).detour).toBe(1);
    expect(computeScoreFactors(makeCandidate(), makeEvaluation({ detourSeconds: 300 }), ctx).detour).toBe(0);
  });

  it('catégorie primaire → fit 1 ; compatible → fit configurable', () => {
    const ctx = makeScoringContext();
    expect(computeScoreFactors(makeCandidate(), makeEvaluation(), ctx).mission).toBe(1);
    expect(
      computeScoreFactors(
        makeCandidate({ categoryIds: [TEST_CATEGORY_IDS.grocery] }),
        makeEvaluation(),
        ctx,
      ).mission,
    ).toBe(0.6);
  });

  it('ouverture inconnue → confiance 0, sans jamais être traitée comme fermée', () => {
    const factors = computeScoreFactors(
      makeCandidate({ opening: { status: 'unknown', confidence: 0 } }),
      makeEvaluation(),
      makeScoringContext(),
    );
    expect(factors.openingConfidence).toBe(0);
  });

  it('qualité et préférence locale inconnues → valeurs neutres injectables (jamais 0)', () => {
    const config = createRouteEngineConfig({ neutralQuality: 0.5, neutralLocalPreference: 0.4 });
    const factors = computeScoreFactors(
      makeCandidate({ qualityScore: undefined, localScore: undefined }),
      makeEvaluation(),
      makeScoringContext({ config }),
    );
    expect(factors.quality).toBe(0.5);
    expect(factors.localPreference).toBe(0.4);
  });
});

describe('scoreCandidate', () => {
  it('produit un score versionné, borné [0,1], avec facteurs et poids auditables', () => {
    const result = scoreCandidate(makeCandidate(), makeEvaluation(), makeScoringContext());
    expect(result.version).toBe(SCORE_VERSION);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(1);
    expect(result.weights).toBe(SCORE_WEIGHTS_V1);
    expect(Object.keys(result.factors).sort()).toEqual(
      ['detour', 'localPreference', 'mission', 'openingConfidence', 'quality'].sort(),
    );
  });

  it('est déterministe : mêmes entrées, même score', () => {
    const a = scoreCandidate(makeCandidate(), makeEvaluation(), makeScoringContext());
    const b = scoreCandidate(makeCandidate(), makeEvaluation(), makeScoringContext());
    expect(a).toEqual(b);
  });
});

describe('départage des égalités (règle stable)', () => {
  function ranked(
    merchantId: string,
    detourSeconds: number,
    openingConfidence = 0.9,
  ): RankedCandidate {
    const candidate = makeCandidate({
      merchantId,
      opening: { status: 'open', confidence: openingConfidence },
    });
    const evaluation = makeEvaluation({ merchantId, detourSeconds });
    return {
      candidate,
      evaluation,
      result: {
        version: SCORE_VERSION,
        score: 0.75,
        factors: {
          mission: 1,
          detour: 0.5,
          openingConfidence,
          quality: 0.5,
          localPreference: 0.5,
        },
        weights: SCORE_WEIGHTS_V1,
      },
    };
  }

  it('à score égal, le détour le plus court gagne', () => {
    expect(compareRanked(ranked('a', 60), ranked('b', 120))).toBeLessThan(0);
    expect(compareRanked(ranked('a', 120), ranked('b', 60))).toBeGreaterThan(0);
  });

  it('à score et détour égaux, la meilleure confiance d’ouverture gagne', () => {
    expect(compareRanked(ranked('a', 60, 0.9), ranked('b', 60, 0.5))).toBeLessThan(0);
  });

  it('arbitre final : merchantId croissant — ordre total et reproductible', () => {
    expect(compareRanked(ranked('a', 60), ranked('b', 60))).toBeLessThan(0);
    expect(compareRanked(ranked('b', 60), ranked('a', 60))).toBeGreaterThan(0);
    expect(compareRanked(ranked('a', 60), ranked('a', 60))).toBe(0);
  });

  it('rankCandidates trie sans muter l’entrée et reste stable sur mélange', () => {
    const items = [ranked('c', 60), ranked('a', 60), ranked('b', 30)];
    const sorted = rankCandidates(items);
    expect(sorted.map((r) => r.candidate.merchantId)).toEqual(['b', 'a', 'c']);
    expect(items.map((r) => r.candidate.merchantId)).toEqual(['c', 'a', 'b']);
    const reshuffled = rankCandidates([items[1], items[2], items[0]]);
    expect(reshuffled.map((r) => r.candidate.merchantId)).toEqual(['b', 'a', 'c']);
  });
});
