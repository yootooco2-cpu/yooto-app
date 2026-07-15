/**
 * Tests de la machine d'état de session : activation volontaire et
 * consentie, mémoire de session (refusés/annoncés), invalidation par
 * changement de route, transitions invalides rejetées avec motif.
 */

import { FIXED_NOW_MS, makeContext, makeCandidate, makeEvaluation, TEST_MISSIONS } from '../fixtures';
import { recommendOnRoute } from './recommend';
import type { Recommendation } from './types';
import { createIdleSession, transition } from './session';
import type { RouteSessionState } from './session';

function makeRecommendation(merchantId = 'merchant-001', routeVersion = 1): Recommendation {
  const outcome = recommendOnRoute(
    [
      {
        candidate: makeCandidate({ merchantId }),
        evaluation: makeEvaluation({ merchantId, routeVersion }),
      },
    ],
    makeContext({ routeVersion }),
  );
  if (outcome.kind !== 'recommendation') throw new Error('recommandation attendue');
  return outcome.recommendation;
}

function makeSession(overrides: Partial<Parameters<typeof createIdleSession>[0]> = {}): RouteSessionState {
  return createIdleSession({
    id: 'session-1',
    mode: 'wheelchair',
    mission: TEST_MISSIONS.bread,
    destination: { latitude: 43.6128, longitude: 3.8655 },
    consentGiven: true,
    maxDetourSeconds: 360,
    ...overrides,
  });
}

function activated(): RouteSessionState {
  const result = transition(makeSession(), { type: 'activate', nowMs: FIXED_NOW_MS });
  if (!result.ok) throw new Error('activation attendue');
  return result.session;
}

function suggesting(merchantId = 'merchant-001'): RouteSessionState {
  const result = transition(activated(), {
    type: 'suggest',
    recommendation: makeRecommendation(merchantId),
    nowMs: FIXED_NOW_MS,
  });
  if (!result.ok) throw new Error('suggestion attendue');
  return result.session;
}

describe('activation', () => {
  it('active une session idle consentie et fixe startedAtMs au temps injecté', () => {
    const result = transition(makeSession(), { type: 'activate', nowMs: FIXED_NOW_MS });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.status).toBe('active');
    expect(result.session.startedAtMs).toBe(FIXED_NOW_MS);
  });

  it('refuse toute activation sans consentement explicite', () => {
    const result = transition(makeSession({ consentGiven: false }), {
      type: 'activate',
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toMatchObject({ ok: false, rejection: 'consent_missing' });
  });

  it('rejette une double activation, session inchangée', () => {
    const session = activated();
    const result = transition(session, { type: 'activate', nowMs: FIXED_NOW_MS + 1 });
    expect(result).toMatchObject({ ok: false, rejection: 'invalid_transition' });
    if (!result.ok) expect(result.session).toBe(session);
  });
});

describe('suggestion', () => {
  it('marque le commerce comme annoncé dès la suggestion', () => {
    const session = suggesting();
    expect(session.status).toBe('suggesting');
    expect(session.announcedMerchantIds).toEqual(['merchant-001']);
    expect(session.currentRecommendation?.merchantId).toBe('merchant-001');
  });

  it('rejette une recommandation expirée', () => {
    const rec = makeRecommendation();
    const result = transition(activated(), {
      type: 'suggest',
      recommendation: rec,
      nowMs: rec.expiresAtMs,
    });
    expect(result).toMatchObject({ ok: false, rejection: 'recommendation_expired' });
  });

  it('rejette une recommandation liée à une ancienne version de route', () => {
    const base = activated();
    const moved = transition(base, { type: 'route_changed', newRouteVersion: 2 });
    if (!moved.ok) throw new Error('changement de route attendu');
    const result = transition(moved.session, {
      type: 'suggest',
      recommendation: makeRecommendation('merchant-001', 1),
      nowMs: FIXED_NOW_MS,
    });
    expect(result).toMatchObject({ ok: false, rejection: 'recommendation_route_mismatch' });
  });

  it('ne repropose jamais un commerce refusé pendant la session', () => {
    const afterDismiss = transition(suggesting(), { type: 'dismiss', nowMs: FIXED_NOW_MS });
    if (!afterDismiss.ok) throw new Error('refus attendu');
    expect(afterDismiss.session.refusedMerchantIds).toEqual(['merchant-001']);
    const again = transition(afterDismiss.session, {
      type: 'suggest',
      recommendation: makeRecommendation('merchant-001'),
      nowMs: FIXED_NOW_MS,
    });
    expect(again).toMatchObject({ ok: false, rejection: 'merchant_already_refused' });
  });

  it('ne repropose jamais un commerce déjà annoncé (même non refusé)', () => {
    const moved = transition(suggesting(), { type: 'route_changed', newRouteVersion: 2 });
    if (!moved.ok) throw new Error('changement de route attendu');
    // La suggestion est retombée, mais le commerce reste « annoncé ».
    const again = transition(moved.session, {
      type: 'suggest',
      recommendation: makeRecommendation('merchant-001', 2),
      nowMs: FIXED_NOW_MS,
    });
    expect(again).toMatchObject({ ok: false, rejection: 'merchant_already_announced' });
  });
});

describe('acceptation, refus, changement de route', () => {
  it('accepte une suggestion valide', () => {
    const result = transition(suggesting(), { type: 'accept', nowMs: FIXED_NOW_MS });
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.session.status).toBe('accepted');
  });

  it('rejette l’acceptation d’une suggestion expirée entre-temps', () => {
    const session = suggesting();
    const expiresAt = session.currentRecommendation?.expiresAtMs ?? 0;
    const result = transition(session, { type: 'accept', nowMs: expiresAt });
    expect(result).toMatchObject({ ok: false, rejection: 'recommendation_expired' });
  });

  it('un changement de route pendant la suggestion invalide la suggestion en cours', () => {
    const result = transition(suggesting(), { type: 'route_changed', newRouteVersion: 2 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.session.status).toBe('active');
    expect(result.session.currentRecommendation).toBeNull();
    expect(result.session.routeVersion).toBe(2);
  });

  it('après acceptation, le recalcul de route conserve le statut accepted', () => {
    const accepted = transition(suggesting(), { type: 'accept', nowMs: FIXED_NOW_MS });
    if (!accepted.ok) throw new Error('acceptation attendue');
    const moved = transition(accepted.session, { type: 'route_changed', newRouteVersion: 2 });
    expect(moved.ok).toBe(true);
    if (moved.ok) {
      expect(moved.session.status).toBe('accepted');
      expect(moved.session.routeVersion).toBe(2);
    }
  });

  it('rejette une version de route qui ne progresse pas', () => {
    const result = transition(activated(), { type: 'route_changed', newRouteVersion: 1 });
    expect(result).toMatchObject({ ok: false, rejection: 'route_version_not_newer' });
  });
});

describe('fin de session', () => {
  it('complete depuis accepted conserve la recommandation effectuée', () => {
    const accepted = transition(suggesting(), { type: 'accept', nowMs: FIXED_NOW_MS });
    if (!accepted.ok) throw new Error('acceptation attendue');
    const completed = transition(accepted.session, { type: 'complete', nowMs: FIXED_NOW_MS + 60_000 });
    expect(completed.ok).toBe(true);
    if (completed.ok) {
      expect(completed.session.status).toBe('completed');
      expect(completed.session.currentRecommendation?.merchantId).toBe('merchant-001');
    }
  });

  it('end est possible depuis tout état sauf ended ; ended est terminal', () => {
    const ended = transition(activated(), { type: 'end', nowMs: FIXED_NOW_MS });
    expect(ended.ok).toBe(true);
    if (!ended.ok) return;
    expect(ended.session.status).toBe('ended');
    const again = transition(ended.session, { type: 'end', nowMs: FIXED_NOW_MS });
    expect(again).toMatchObject({ ok: false, rejection: 'invalid_transition' });
    const suggest = transition(ended.session, {
      type: 'suggest',
      recommendation: makeRecommendation('merchant-999'),
      nowMs: FIXED_NOW_MS,
    });
    expect(suggest).toMatchObject({ ok: false, rejection: 'invalid_transition' });
  });

  it('les transitions sont immuables : la session d’origine n’est jamais mutée', () => {
    const session = activated();
    const snapshot = JSON.parse(JSON.stringify(session));
    transition(session, {
      type: 'suggest',
      recommendation: makeRecommendation(),
      nowMs: FIXED_NOW_MS,
    });
    expect(session).toEqual(snapshot);
  });
});
