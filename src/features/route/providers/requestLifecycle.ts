/**
 * Cycle de vie des requêtes — Lot 3A : identifiant déterministe et rejet
 * des réponses obsolètes UNIQUEMENT.
 *
 * Exclu de ce lot (réservé au transport HTTP du Lot 3C) : AbortController,
 * timeout, annulation réseau réelle. Ici, tout est pur et synchrone.
 */

export interface RequestTicket {
  /** Identifiant déterministe : session + version de route + séquence. */
  requestId: string;
  sessionId: string;
  routeVersion: number;
  issuedAtMs: number;
}

export interface IssueTicketInput {
  sessionId: string;
  routeVersion: number;
  /** Séquence croissante fournie par l'appelant — pas d'état interne. */
  sequence: number;
  issuedAtMs: number;
}

export function issueRequestTicket(input: IssueTicketInput): RequestTicket {
  return {
    requestId: `${input.sessionId}#v${input.routeVersion}#${input.sequence}`,
    sessionId: input.sessionId,
    routeVersion: input.routeVersion,
    issuedAtMs: input.issuedAtMs,
  };
}

export type StaleReason = 'route_version_superseded' | 'session_mismatch';

export type ResponseCurrency =
  | { current: true }
  | { current: false; reason: StaleReason };

/**
 * Une réponse n'est exploitable que si elle appartient à la session ET à
 * la version de route COURANTES. Tout vestige d'une ancienne route est
 * rejeté de façon déterministe — jamais réutilisé.
 */
export function checkResponseCurrency(
  ticket: RequestTicket,
  current: { sessionId: string; routeVersion: number },
): ResponseCurrency {
  if (ticket.sessionId !== current.sessionId) {
    return { current: false, reason: 'session_mismatch' };
  }
  if (ticket.routeVersion !== current.routeVersion) {
    return { current: false, reason: 'route_version_superseded' };
  }
  return { current: true };
}
