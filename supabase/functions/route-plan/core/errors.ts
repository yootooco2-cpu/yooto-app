/**
 * Erreurs typées du noyau `route-plan` — union FERMÉE.
 *
 * Aucune coordonnée, URL amont, clé, réponse ORS brute ni détail interne
 * ne figure dans un corps d'erreur : uniquement le code.
 */

import type { RawHttpResponse } from './contracts.ts';

export type RoutePlanErrorCode =
  | 'method_not_allowed'
  | 'unsupported_media_type'
  | 'body_too_large'
  | 'invalid_json'
  | 'unknown_field'
  | 'invalid_input'
  | 'invalid_coordinates'
  | 'out_of_pilot_area'
  | 'too_many_candidates'
  | 'unsupported_profile'
  | 'binding_mismatch'
  | 'matrix_capability_incompatible'
  | 'unauthorized'
  | 'quota_exceeded_user'
  | 'quota_exceeded_global'
  | 'quota_exceeded_minute'
  | 'origin_not_allowed'
  | 'upstream_rate_limited'
  | 'upstream_unavailable'
  | 'upstream_invalid_response';

export const HTTP_STATUS_BY_ERROR: Readonly<Record<RoutePlanErrorCode, number>> = {
  method_not_allowed: 405,
  unsupported_media_type: 415,
  body_too_large: 413,
  invalid_json: 400,
  unknown_field: 400,
  invalid_input: 400,
  invalid_coordinates: 400,
  out_of_pilot_area: 400,
  too_many_candidates: 400,
  unsupported_profile: 400,
  binding_mismatch: 409,
  matrix_capability_incompatible: 422,
  unauthorized: 401,
  quota_exceeded_user: 429,
  quota_exceeded_global: 429,
  quota_exceeded_minute: 429,
  origin_not_allowed: 403,
  upstream_rate_limited: 429,
  upstream_unavailable: 502,
  upstream_invalid_response: 502,
};

export function errorResponse(
  code: RoutePlanErrorCode,
  extraHeaders: Readonly<Record<string, string>> = {},
): RawHttpResponse {
  return {
    status: HTTP_STATUS_BY_ERROR[code],
    headers: { 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify({ ok: false, error: code }),
  };
}
