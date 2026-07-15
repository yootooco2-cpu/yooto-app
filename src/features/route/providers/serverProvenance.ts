/**
 * Assertion de provenance SERVEUR — Lot 3A (contrat client uniquement).
 *
 * Modèle : l'application transmet son binding attendu ; l'Edge Function
 * (Lot 3B) sélectionne la configuration canonique détenue côté serveur,
 * construit elle-même la requête ORS, calcule l'empreinte des paramètres
 * réellement transmis et retourne cette assertion. Le client COMPARE ;
 * une valeur contrôlée par le client ne constitue jamais une preuve.
 *
 * `paramsHash` est une EMPREINTE DE COHÉRENCE calculée par le serveur —
 * pas une preuve cryptographique indépendante. Au Lot 3A, l'empreinte
 * attendue est injectée par les tests ; son alimentation réelle
 * (configuration client/serveur) sera branchée aux Lots 3B-3C.
 */

import type {
  AccessibilityDataSource,
  RouteProvenance,
  RouteProviderId,
  RoutingValidationStatus,
} from '../domain/types';
import type { SessionRoutingBinding } from './providerRegistry';

export interface ServerRoutingAssertion {
  providerId: RouteProviderId;
  profileId: string;
  /** Version de configuration canonique DÉTENUE par le serveur. */
  serverConfigVersion: number;
  /** Empreinte serveur des paramètres réellement appliqués. */
  paramsHash: string;
  generatedAtMs: number;
}

/** Attente côté client : binding de session + empreinte attendue, séparés. */
export interface ExpectedServerParams {
  binding: SessionRoutingBinding;
  expectedParamsHash: string;
}

export type AssertionMismatch =
  | 'provider_mismatch'
  | 'profile_mismatch'
  | 'config_version_mismatch'
  | 'params_hash_mismatch';

export type AssertionCheck = { ok: true } | { ok: false; mismatch: AssertionMismatch };

/**
 * Compare l'assertion serveur au binding attendu ET à l'empreinte attendue.
 * Chaque divergence est distinguée précisément ; la première rencontrée
 * (ordre fixe : fournisseur, profil, version, empreinte) arrête la
 * vérification — résultat déterministe.
 */
export function verifyServerAssertion(
  expected: ExpectedServerParams,
  assertion: ServerRoutingAssertion,
): AssertionCheck {
  if (expected.binding.providerId !== assertion.providerId) {
    return { ok: false, mismatch: 'provider_mismatch' };
  }
  if (expected.binding.profileId !== assertion.profileId) {
    return { ok: false, mismatch: 'profile_mismatch' };
  }
  if (expected.binding.routingConfigVersion !== assertion.serverConfigVersion) {
    return { ok: false, mismatch: 'config_version_mismatch' };
  }
  if (expected.expectedParamsHash !== assertion.paramsHash) {
    return { ok: false, mismatch: 'params_hash_mismatch' };
  }
  return { ok: true };
}

/**
 * Construit la provenance d'une route à partir de l'assertion serveur
 * VÉRIFIÉE (jamais à partir de valeurs choisies par le client).
 * `validationStatus` : au Lot 3A il est injecté ; au 3B le serveur
 * l'assertera avec sa configuration canonique.
 */
export function provenanceFromAssertion(
  assertion: ServerRoutingAssertion,
  validationStatus: RoutingValidationStatus,
): RouteProvenance {
  const accessibilityDataSource: AccessibilityDataSource =
    assertion.providerId === 'ors' && assertion.profileId === 'wheelchair'
      ? 'osm_via_ors'
      : 'none';
  return {
    providerId: assertion.providerId,
    profileId: assertion.profileId,
    routingConfigVersion: assertion.serverConfigVersion,
    accessibilityDataSource,
    validationStatus,
    generatedAtMs: assertion.generatedAtMs,
  };
}
