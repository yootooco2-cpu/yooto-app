/**
 * Registre de fournisseurs de routage configurable PAR MODE (décision GATE 2B).
 *
 * Règles non négociables, câblées ici :
 * - AUCUN fallback silencieux : un mode non enregistré n'emprunte jamais le
 *   fournisseur d'un autre mode ;
 * - fauteuil roulant : seul un fournisseur explicitement `wheelchairCapable`
 *   peut être enregistré ; Mapbox est REFUSÉ par construction (son
 *   approximation walking/exact:false reste une primitive géographique
 *   explicitement non accessible, jamais une route de session fauteuil) ;
 * - fauteuil sans fournisseur utilisable → état honnête
 *   'accessible_route_unverifiable', jamais une bascule vers walking ;
 * - une session conserve le même triplet providerId + profileId +
 *   routingConfigVersion : directions, ETA et futurs détours proviennent du
 *   même graphe (vérifications `checkSessionBinding` / `routeMatchesBinding`).
 */

import type { RouteProviderId, TransportMode } from '../domain/types';
import type { PlannedRoute, RouteProviderPort } from '../ports';

export interface ProviderRegistration {
  providerId: RouteProviderId;
  profileId: string;
  provider: RouteProviderPort;
  /**
   * true UNIQUEMENT si le fournisseur produit une route qualifiable pour une
   * session fauteuil (données d'accessibilité réelles dans le graphe).
   */
  wheelchairCapable: boolean;
}

/** Triplet d'identité de graphe conservé pendant TOUTE la session. */
export interface SessionRoutingBinding {
  providerId: RouteProviderId;
  profileId: string;
  routingConfigVersion: number;
}

export type RegistrationRejection =
  | 'mode_already_registered'
  | 'wheelchair_requires_capable_provider'
  | 'mapbox_forbidden_for_wheelchair';

export type RegisterResult = { ok: true } | { ok: false; rejection: RegistrationRejection };

export const ACCESSIBLE_ROUTE_UNVERIFIABLE = 'accessible_route_unverifiable' as const;

export type ModeResolution =
  | { status: 'available'; provider: RouteProviderPort; binding: SessionRoutingBinding }
  | { status: typeof ACCESSIBLE_ROUTE_UNVERIFIABLE }
  | { status: 'mode_not_enabled'; mode: TransportMode };

export interface RouteProviderRegistry {
  register(mode: TransportMode, registration: ProviderRegistration): RegisterResult;
  resolve(mode: TransportMode): ModeResolution;
}

export function createProviderRegistry(options: {
  routingConfigVersion: number;
}): RouteProviderRegistry {
  const registrations = new Map<TransportMode, ProviderRegistration>();

  return {
    register(mode, registration) {
      if (registrations.has(mode)) {
        return { ok: false, rejection: 'mode_already_registered' };
      }
      if (mode === 'wheelchair') {
        // Interdiction spécifique et prioritaire : Mapbox n'est JAMAIS un
        // fournisseur fauteuil, même déclaré capable par erreur.
        if (registration.providerId === 'mapbox') {
          return { ok: false, rejection: 'mapbox_forbidden_for_wheelchair' };
        }
        if (!registration.wheelchairCapable) {
          return { ok: false, rejection: 'wheelchair_requires_capable_provider' };
        }
      }
      registrations.set(mode, registration);
      return { ok: true };
    },

    resolve(mode) {
      const registration = registrations.get(mode);
      if (registration === undefined) {
        // Pas de fallback : fauteuil → état honnête ; autres modes → non activé.
        if (mode === 'wheelchair') {
          return { status: ACCESSIBLE_ROUTE_UNVERIFIABLE };
        }
        return { status: 'mode_not_enabled', mode };
      }
      return {
        status: 'available',
        provider: registration.provider,
        binding: {
          providerId: registration.providerId,
          profileId: registration.profileId,
          routingConfigVersion: options.routingConfigVersion,
        },
      };
    },
  };
}

/**
 * État runtime honnête pour un échec de calcul :
 * fauteuil → 'accessible_route_unverifiable' (jamais un autre graphe) ;
 * autres modes → 'route_unavailable'.
 */
export function failureStateForMode(
  mode: TransportMode,
): typeof ACCESSIBLE_ROUTE_UNVERIFIABLE | 'route_unavailable' {
  return mode === 'wheelchair' ? ACCESSIBLE_ROUTE_UNVERIFIABLE : 'route_unavailable';
}

export type BindingMismatch =
  | 'provider_mismatch'
  | 'profile_mismatch'
  | 'routing_config_version_mismatch';

export type BindingCheck = { ok: true } | { ok: false; mismatch: BindingMismatch };

/** Refus de mélanger deux graphes : le triplet doit être identique. */
export function checkSessionBinding(
  expected: SessionRoutingBinding,
  actual: SessionRoutingBinding,
): BindingCheck {
  if (expected.providerId !== actual.providerId) {
    return { ok: false, mismatch: 'provider_mismatch' };
  }
  if (expected.profileId !== actual.profileId) {
    return { ok: false, mismatch: 'profile_mismatch' };
  }
  if (expected.routingConfigVersion !== actual.routingConfigVersion) {
    return { ok: false, mismatch: 'routing_config_version_mismatch' };
  }
  return { ok: true };
}

/** Vérifie qu'une route appartient bien au graphe de la session. */
export function routeMatchesBinding(
  binding: SessionRoutingBinding,
  route: PlannedRoute,
): BindingCheck {
  return checkSessionBinding(binding, {
    providerId: route.provenance.providerId,
    profileId: route.provenance.profileId,
    routingConfigVersion: route.provenance.routingConfigVersion,
  });
}

/**
 * Registre du pilote Montpellier (décision GATE 2B) :
 * wheelchair → ORS `wheelchair` ; walk → ORS `foot-walking`.
 * bike, car et transit ne sont PAS enregistrés — toute activation devra
 * être explicite, jamais accidentelle.
 */
export function createPilotProviderRegistry(deps: {
  orsProvider: RouteProviderPort;
  routingConfigVersion: number;
}): RouteProviderRegistry {
  const registry = createProviderRegistry({
    routingConfigVersion: deps.routingConfigVersion,
  });
  registry.register('wheelchair', {
    providerId: 'ors',
    profileId: 'wheelchair',
    provider: deps.orsProvider,
    wheelchairCapable: true,
  });
  registry.register('walk', {
    providerId: 'ors',
    profileId: 'foot-walking',
    provider: deps.orsProvider,
    wheelchairCapable: false,
  });
  return registry;
}
