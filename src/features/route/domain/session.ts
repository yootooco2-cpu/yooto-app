/**
 * Machine d'état pure de la session « Sur mon trajet ».
 *
 * - Activation VOLONTAIRE uniquement, et jamais sans consentement explicite.
 * - Session éphémère : l'état ne contient que le nécessaire au trajet en
 *   cours ; aucune position n'est conservée ici, aucun historique GPS.
 * - Transitions déterministes ; une transition invalide est rejetée avec un
 *   motif auditable et laisse la session inchangée.
 * - Un commerce refusé ou déjà annoncé n'est jamais reproposé dans la même
 *   session ; une recommandation expirée ou liée à une ancienne version de
 *   route est rejetée.
 */

import { checkRecommendationUsability } from './recommend';
import type { GeoPoint, Mission, Recommendation, TransportMode } from './types';

export type RouteSessionStatus =
  | 'idle'
  | 'active'
  | 'suggesting'
  | 'accepted'
  | 'completed'
  | 'ended';

export interface RouteSessionState {
  id: string;
  status: RouteSessionStatus;
  mode: TransportMode;
  mission: Mission;
  destination: GeoPoint;
  routeVersion: number;
  consentGiven: boolean;
  maxDetourSeconds: number;
  startedAtMs: number | null;
  currentRecommendation: Recommendation | null;
  refusedMerchantIds: readonly string[];
  announcedMerchantIds: readonly string[];
}

export interface CreateSessionInput {
  id: string;
  mode: TransportMode;
  mission: Mission;
  destination: GeoPoint;
  consentGiven: boolean;
  maxDetourSeconds: number;
  routeVersion?: number;
}

export function createIdleSession(input: CreateSessionInput): RouteSessionState {
  return {
    id: input.id,
    status: 'idle',
    mode: input.mode,
    mission: input.mission,
    destination: input.destination,
    routeVersion: input.routeVersion ?? 1,
    consentGiven: input.consentGiven,
    maxDetourSeconds: input.maxDetourSeconds,
    startedAtMs: null,
    currentRecommendation: null,
    refusedMerchantIds: [],
    announcedMerchantIds: [],
  };
}

export type RouteSessionEvent =
  | { type: 'activate'; nowMs: number }
  | { type: 'suggest'; recommendation: Recommendation; nowMs: number }
  | { type: 'accept'; nowMs: number }
  | { type: 'dismiss'; nowMs: number }
  | { type: 'route_changed'; newRouteVersion: number }
  | { type: 'complete'; nowMs: number }
  | { type: 'end'; nowMs: number };

export type TransitionRejection =
  | 'invalid_transition'
  | 'consent_missing'
  | 'recommendation_expired'
  | 'recommendation_route_mismatch'
  | 'merchant_already_refused'
  | 'merchant_already_announced'
  | 'route_version_not_newer';

export type TransitionResult =
  | { ok: true; session: RouteSessionState }
  | { ok: false; rejection: TransitionRejection; session: RouteSessionState };

function rejected(
  session: RouteSessionState,
  rejection: TransitionRejection,
): TransitionResult {
  return { ok: false, rejection, session };
}

export function transition(
  session: RouteSessionState,
  event: RouteSessionEvent,
): TransitionResult {
  switch (event.type) {
    case 'activate': {
      if (session.status !== 'idle') return rejected(session, 'invalid_transition');
      // Jamais d'activation implicite ni sans consentement explicite.
      if (!session.consentGiven) return rejected(session, 'consent_missing');
      return {
        ok: true,
        session: { ...session, status: 'active', startedAtMs: event.nowMs },
      };
    }

    case 'suggest': {
      if (session.status !== 'active') return rejected(session, 'invalid_transition');
      const { recommendation } = event;
      const usability = checkRecommendationUsability(
        recommendation,
        session.routeVersion,
        event.nowMs,
      );
      if (!usability.usable) {
        return rejected(
          session,
          usability.invalidity === 'route_changed'
            ? 'recommendation_route_mismatch'
            : 'recommendation_expired',
        );
      }
      if (session.refusedMerchantIds.includes(recommendation.merchantId)) {
        return rejected(session, 'merchant_already_refused');
      }
      if (session.announcedMerchantIds.includes(recommendation.merchantId)) {
        return rejected(session, 'merchant_already_announced');
      }
      return {
        ok: true,
        session: {
          ...session,
          status: 'suggesting',
          currentRecommendation: recommendation,
          announcedMerchantIds: [...session.announcedMerchantIds, recommendation.merchantId],
        },
      };
    }

    case 'accept': {
      if (session.status !== 'suggesting' || session.currentRecommendation === null) {
        return rejected(session, 'invalid_transition');
      }
      const usability = checkRecommendationUsability(
        session.currentRecommendation,
        session.routeVersion,
        event.nowMs,
      );
      if (!usability.usable) {
        return rejected(
          session,
          usability.invalidity === 'route_changed'
            ? 'recommendation_route_mismatch'
            : 'recommendation_expired',
        );
      }
      return { ok: true, session: { ...session, status: 'accepted' } };
    }

    case 'dismiss': {
      if (session.status !== 'suggesting' || session.currentRecommendation === null) {
        return rejected(session, 'invalid_transition');
      }
      return {
        ok: true,
        session: {
          ...session,
          status: 'active',
          currentRecommendation: null,
          refusedMerchantIds: [
            ...session.refusedMerchantIds,
            session.currentRecommendation.merchantId,
          ],
        },
      };
    }

    case 'route_changed': {
      if (session.status === 'idle' || session.status === 'completed' || session.status === 'ended') {
        return rejected(session, 'invalid_transition');
      }
      if (event.newRouteVersion <= session.routeVersion) {
        return rejected(session, 'route_version_not_newer');
      }
      if (session.status === 'suggesting') {
        // La suggestion en cours est caduque ; le commerce reste marqué
        // « annoncé » : il ne sera pas reproposé dans cette session.
        return {
          ok: true,
          session: {
            ...session,
            status: 'active',
            routeVersion: event.newRouteVersion,
            currentRecommendation: null,
          },
        };
      }
      // `accepted` conserve son statut : la route est recalculée après
      // confirmation pour inclure l'étape (règle produit du PDF).
      return { ok: true, session: { ...session, routeVersion: event.newRouteVersion } };
    }

    case 'complete': {
      if (
        session.status !== 'active' &&
        session.status !== 'suggesting' &&
        session.status !== 'accepted'
      ) {
        return rejected(session, 'invalid_transition');
      }
      return {
        ok: true,
        session: {
          ...session,
          status: 'completed',
          currentRecommendation:
            session.status === 'accepted' ? session.currentRecommendation : null,
        },
      };
    }

    case 'end': {
      if (session.status === 'ended') return rejected(session, 'invalid_transition');
      return {
        ok: true,
        session: { ...session, status: 'ended', currentRecommendation: null },
      };
    }
  }
}
