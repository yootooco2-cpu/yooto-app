/**
 * Tests de l'assertion serveur : divergences distinguées précisément,
 * provenance construite depuis l'assertion vérifiée (jamais une valeur
 * client), déterminisme, aucune coordonnée.
 */

import { FIXED_NOW_MS } from '../fixtures';
import type { ServerRoutingAssertion } from './serverProvenance';
import { provenanceFromAssertion, verifyServerAssertion } from './serverProvenance';

const BINDING = {
  providerId: 'ors',
  profileId: 'wheelchair',
  routingConfigVersion: 1,
} as const;

const EXPECTED = { binding: BINDING, expectedParamsHash: 'hash-abc' };

function assertion(overrides: Partial<ServerRoutingAssertion> = {}): ServerRoutingAssertion {
  return {
    providerId: 'ors',
    profileId: 'wheelchair',
    serverConfigVersion: 1,
    paramsHash: 'hash-abc',
    generatedAtMs: FIXED_NOW_MS,
    ...overrides,
  };
}

describe('verifyServerAssertion', () => {
  it('accepte une assertion serveur conforme au binding et à l’empreinte attendus', () => {
    expect(verifyServerAssertion(EXPECTED, assertion())).toEqual({ ok: true });
  });

  it('distingue précisément chaque divergence', () => {
    expect(verifyServerAssertion(EXPECTED, assertion({ providerId: 'mapbox' }))).toEqual({
      ok: false,
      mismatch: 'provider_mismatch',
    });
    expect(verifyServerAssertion(EXPECTED, assertion({ profileId: 'foot-walking' }))).toEqual({
      ok: false,
      mismatch: 'profile_mismatch',
    });
    expect(verifyServerAssertion(EXPECTED, assertion({ serverConfigVersion: 2 }))).toEqual({
      ok: false,
      mismatch: 'config_version_mismatch',
    });
    expect(verifyServerAssertion(EXPECTED, assertion({ paramsHash: 'hash-xyz' }))).toEqual({
      ok: false,
      mismatch: 'params_hash_mismatch',
    });
  });

  it('est déterministe (ordre de vérification fixe)', () => {
    const wrongEverything = assertion({
      providerId: 'mapbox',
      profileId: 'x',
      serverConfigVersion: 9,
      paramsHash: 'z',
    });
    expect(verifyServerAssertion(EXPECTED, wrongEverything)).toEqual({
      ok: false,
      mismatch: 'provider_mismatch',
    });
  });
});

describe('provenanceFromAssertion', () => {
  it('construit la provenance depuis l’assertion serveur vérifiée', () => {
    const provenance = provenanceFromAssertion(assertion(), 'unvalidated');
    expect(provenance).toEqual({
      providerId: 'ors',
      profileId: 'wheelchair',
      routingConfigVersion: 1,
      accessibilityDataSource: 'osm_via_ors',
      validationStatus: 'unvalidated',
      generatedAtMs: FIXED_NOW_MS,
    });
  });

  it('un profil non fauteuil ne porte aucune source d’accessibilité', () => {
    const provenance = provenanceFromAssertion(
      assertion({ profileId: 'foot-walking' }),
      'not_applicable',
    );
    expect(provenance.accessibilityDataSource).toBe('none');
    expect(provenance.validationStatus).toBe('not_applicable');
  });
});
