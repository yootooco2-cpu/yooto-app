/**
 * Tests du cycle de vie des requêtes : ticket déterministe, rejet des
 * réponses obsolètes (version de route dépassée, session étrangère).
 * Aucun AbortController, aucun timer — tout est pur.
 */

import { FIXED_NOW_MS } from '../fixtures';
import { checkResponseCurrency, issueRequestTicket } from './requestLifecycle';

describe('issueRequestTicket', () => {
  it('produit un identifiant déterministe session + version + séquence', () => {
    const ticket = issueRequestTicket({
      sessionId: 'pilot-1',
      routeVersion: 2,
      sequence: 7,
      issuedAtMs: FIXED_NOW_MS,
    });
    expect(ticket).toEqual({
      requestId: 'pilot-1#v2#7',
      sessionId: 'pilot-1',
      routeVersion: 2,
      issuedAtMs: FIXED_NOW_MS,
    });
    // Déterminisme : mêmes entrées, même ticket.
    expect(
      issueRequestTicket({
        sessionId: 'pilot-1',
        routeVersion: 2,
        sequence: 7,
        issuedAtMs: FIXED_NOW_MS,
      }),
    ).toEqual(ticket);
  });
});

describe('checkResponseCurrency', () => {
  const ticket = issueRequestTicket({
    sessionId: 'pilot-1',
    routeVersion: 1,
    sequence: 1,
    issuedAtMs: FIXED_NOW_MS,
  });

  it('accepte une réponse de la session et de la version courantes', () => {
    expect(
      checkResponseCurrency(ticket, { sessionId: 'pilot-1', routeVersion: 1 }),
    ).toEqual({ current: true });
  });

  it('rejette déterministiquement une réponse d’une version de route dépassée', () => {
    expect(
      checkResponseCurrency(ticket, { sessionId: 'pilot-1', routeVersion: 2 }),
    ).toEqual({ current: false, reason: 'route_version_superseded' });
  });

  it('rejette une réponse appartenant à une autre session', () => {
    expect(
      checkResponseCurrency(ticket, { sessionId: 'other', routeVersion: 1 }),
    ).toEqual({ current: false, reason: 'session_mismatch' });
  });
});
