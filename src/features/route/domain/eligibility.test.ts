/**
 * Tests des eligibility gates : chaque exclusion est déterministe et
 * auditable ; « unknown » n'est jamais converti en négatif.
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
import {
  evaluateEligibility,
  isAccessibilityRequired,
  missionCategoryFit,
} from './eligibility';

describe('missionCategoryFit', () => {
  it('reconnaît une catégorie primaire, une compatible, et aucune', () => {
    expect(missionCategoryFit(TEST_MISSIONS.bread, makeCandidate())).toBe('primary');
    expect(
      missionCategoryFit(
        TEST_MISSIONS.bread,
        makeCandidate({ categoryIds: [TEST_CATEGORY_IDS.grocery] }),
      ),
    ).toBe('compatible');
    expect(
      missionCategoryFit(
        TEST_MISSIONS.bread,
        makeCandidate({ categoryIds: [TEST_CATEGORY_IDS.bookshop] }),
      ),
    ).toBe('none');
  });
});

describe('isAccessibilityRequired', () => {
  it('le mode fauteuil roulant rend l’accessibilité obligatoire, sans assimiler le mode à la marche', () => {
    expect(isAccessibilityRequired('wheelchair', TEST_MISSIONS.bread)).toBe(true);
    expect(isAccessibilityRequired('walk', TEST_MISSIONS.bread)).toBe(false);
  });

  it('la mission accessible_toilet impose l’accessibilité quel que soit le mode', () => {
    expect(isAccessibilityRequired('walk', TEST_MISSIONS.accessible_toilet)).toBe(true);
  });
});

describe('evaluateEligibility — mission et détour', () => {
  it('accepte un candidat conforme sans exclusion', () => {
    const verdict = evaluateEligibility(makeCandidate(), makeEvaluation(), makeContext());
    expect(verdict.eligible).toBe(true);
    expect(verdict.exclusions).toEqual([]);
  });

  it('exclut un candidat hors mission (mission_mismatch)', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ categoryIds: [TEST_CATEGORY_IDS.bookshop] }),
      makeEvaluation(),
      makeContext(),
    );
    expect(verdict.eligible).toBe(false);
    expect(verdict.exclusions).toContain('mission_mismatch');
  });

  it('détour limite : la tolérance exacte passe, une seconde de plus exclut', () => {
    const ctx = makeContext({ maxDetourSeconds: 300 });
    expect(
      evaluateEligibility(makeCandidate(), makeEvaluation({ detourSeconds: 300 }), ctx).eligible,
    ).toBe(true);
    const over = evaluateEligibility(
      makeCandidate(),
      makeEvaluation({ detourSeconds: 301 }),
      ctx,
    );
    expect(over.eligible).toBe(false);
    expect(over.exclusions).toContain('detour_exceeded');
  });
});

describe('evaluateEligibility — horaires (unknown ≠ closed)', () => {
  it('exclut un candidat fermé à l’ETA', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ opening: { status: 'closed', confidence: 0.9 } }),
      makeEvaluation(),
      makeContext(),
    );
    expect(verdict.exclusions).toContain('closed_at_eta');
  });

  it('horaires inconnus + mission essentielle → exclusion stricte', () => {
    const verdict = evaluateEligibility(
      makeCandidate({
        categoryIds: [TEST_CATEGORY_IDS.pharmacy],
        opening: { status: 'unknown', confidence: 0 },
      }),
      makeEvaluation(),
      makeContext({ mission: TEST_MISSIONS.pharmacy }),
    );
    expect(verdict.eligible).toBe(false);
    expect(verdict.exclusions).toContain('opening_unknown_essential');
    expect(verdict.exclusions).not.toContain('closed_at_eta');
  });

  it('horaires inconnus + mission non essentielle → éligible avec mention « à confirmer »', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ opening: { status: 'unknown', confidence: 0 } }),
      makeEvaluation(),
      makeContext(),
    );
    expect(verdict.eligible).toBe(true);
    expect(verdict.notes).toContain('opening_to_confirm');
  });

  it('mission essentielle : une ouverture peu fiable est exclue (opening_confidence_too_low)', () => {
    const verdict = evaluateEligibility(
      makeCandidate({
        categoryIds: [TEST_CATEGORY_IDS.pharmacy],
        opening: { status: 'open', confidence: 0.4 },
      }),
      makeEvaluation(),
      makeContext({ mission: TEST_MISSIONS.pharmacy }),
    );
    expect(verdict.eligible).toBe(false);
    expect(verdict.exclusions).toContain('opening_confidence_too_low');
  });

  it('le seuil de confiance essentiel est injectable', () => {
    const config = createRouteEngineConfig({ minOpeningConfidenceEssential: 0.3 });
    const verdict = evaluateEligibility(
      makeCandidate({
        categoryIds: [TEST_CATEGORY_IDS.pharmacy],
        opening: { status: 'open', confidence: 0.4 },
      }),
      makeEvaluation(),
      makeContext({ mission: TEST_MISSIONS.pharmacy, config }),
    );
    expect(verdict.eligible).toBe(true);
  });
});

describe('evaluateEligibility — accessibilité (unknown ≠ false, jamais accessible par défaut)', () => {
  it('contrainte obligatoire : accessibilité inconnue → exclusion, motif distinct du refus prouvé', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ accessibility: 'unknown' }),
      makeEvaluation(),
      makeContext({ mode: 'wheelchair' }),
    );
    expect(verdict.eligible).toBe(false);
    expect(verdict.exclusions).toContain('accessibility_unknown_required');
    expect(verdict.exclusions).not.toContain('accessibility_blocked');
  });

  it('contrainte obligatoire : non accessible prouvé → accessibility_blocked', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ accessibility: 'no' }),
      makeEvaluation(),
      makeContext({ mode: 'wheelchair' }),
    );
    expect(verdict.exclusions).toContain('accessibility_blocked');
  });

  it('contrainte obligatoire : accessible vérifié → éligible', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ accessibility: 'yes' }),
      makeEvaluation(),
      makeContext({ mode: 'wheelchair' }),
    );
    expect(verdict.eligible).toBe(true);
  });

  it('sans contrainte : accessibilité inconnue → simple mention « à confirmer »', () => {
    const verdict = evaluateEligibility(
      makeCandidate({ accessibility: 'unknown' }),
      makeEvaluation(),
      makeContext({ mode: 'walk' }),
    );
    expect(verdict.eligible).toBe(true);
    expect(verdict.notes).toContain('accessibility_to_confirm');
  });
});

describe('evaluateEligibility — mémoire de session et fraîcheur', () => {
  it('exclut un commerce déjà refusé pendant la session', () => {
    const verdict = evaluateEligibility(
      makeCandidate(),
      makeEvaluation(),
      makeContext({ refusedMerchantIds: ['merchant-001'] }),
    );
    expect(verdict.exclusions).toContain('already_refused');
  });

  it('exclut un commerce déjà annoncé pendant la session', () => {
    const verdict = evaluateEligibility(
      makeCandidate(),
      makeEvaluation(),
      makeContext({ announcedMerchantIds: ['merchant-001'] }),
    );
    expect(verdict.exclusions).toContain('already_announced');
  });

  it('exclut une évaluation périmée (candidat expiré)', () => {
    const config = createRouteEngineConfig({ evaluationTtlMs: 60_000 });
    const verdict = evaluateEligibility(
      makeCandidate(),
      makeEvaluation({ computedAtMs: FIXED_NOW_MS - 61_000 }),
      makeContext({ config }),
    );
    expect(verdict.exclusions).toContain('evaluation_stale');
  });

  it('exclut une évaluation liée à une ancienne version de route', () => {
    const verdict = evaluateEligibility(
      makeCandidate(),
      makeEvaluation({ routeVersion: 1 }),
      makeContext({ routeVersion: 2 }),
    );
    expect(verdict.exclusions).toContain('route_version_mismatch');
  });
});

describe('evaluateEligibility — qualité minimale (le silence ne punit jamais)', () => {
  it('une qualité connue sous le seuil exclut', () => {
    const config = createRouteEngineConfig({ minKnownQualityScore: 0.4 });
    const verdict = evaluateEligibility(
      makeCandidate({ qualityScore: 0.2 }),
      makeEvaluation(),
      makeContext({ config }),
    );
    expect(verdict.exclusions).toContain('quality_below_minimum');
  });

  it('une qualité inconnue n’exclut jamais, même avec un seuil actif', () => {
    const config = createRouteEngineConfig({ minKnownQualityScore: 0.4 });
    const verdict = evaluateEligibility(
      makeCandidate({ qualityScore: undefined }),
      makeEvaluation(),
      makeContext({ config }),
    );
    expect(verdict.eligible).toBe(true);
  });

  it('cumule tous les motifs d’exclusion pour audit', () => {
    const verdict = evaluateEligibility(
      makeCandidate({
        categoryIds: [TEST_CATEGORY_IDS.bookshop],
        opening: { status: 'closed', confidence: 0.9 },
      }),
      makeEvaluation({ detourSeconds: 10_000 }),
      makeContext(),
    );
    expect(verdict.exclusions).toEqual(
      expect.arrayContaining(['mission_mismatch', 'closed_at_eta', 'detour_exceeded']),
    );
  });
});
