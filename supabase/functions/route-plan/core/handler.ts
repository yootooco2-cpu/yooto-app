/**
 * Pipeline complet `route-plan` — LOT 3B.1 : pur, toutes dépendances
 * injectées, aucune E/S propre.
 *
 * Ordre : CORS/préflight → méthode/validation stricte → JWT → pseudonyme →
 * quotas atomiques → empreinte de configuration → appels amont (injectés) →
 * contrôle de forme → enveloppe + assertion → log sûr.
 */

import type { RawHttpRequest, RawHttpResponse, ServerAssertion } from './contracts.ts';
import type { RoutePlanErrorCode } from './errors.ts';
import { errorResponse } from './errors.ts';
import type { HashFn, ServerRoutingConfig } from './canonicalConfig.ts';
import { computeParamsHash } from './canonicalConfig.ts';
import type { HmacFn, JwtVerifier } from './auth.ts';
import { pseudonymFromSub } from './auth.ts';
import type { QuotaLimits, QuotaStore } from './quota.ts';
import { buildStandardBuckets } from './quota.ts';
import type { PilotZone } from './geofence.ts';
import type { ValidationLimits } from './validate.ts';
import { validateRoutePlanRequest } from './validate.ts';
import type { UpstreamDeps } from './orsAdapter.ts';
import {
  buildDirectionsBody,
  buildMatrixBodies,
  callUpstream,
  directionsPayloadShapeOk,
  matrixPayloadShapeOk,
  orsDirectionsPath,
  orsMatrixPath,
} from './orsAdapter.ts';
import type { LogSink } from './logging.ts';
import { buildSafeLogEntry } from './logging.ts';

export interface HandlerDeps {
  jwtVerifier: JwtVerifier;
  hmacFn: HmacFn;
  /** Secret serveur du pseudonyme — `pepper`, jamais une valeur publique. */
  pepper: string;
  quotaStore: QuotaStore;
  quotaLimits: QuotaLimits;
  upstream: UpstreamDeps;
  hashFn: HashFn;
  nowMs: () => number;
  /** Identifiant de requête GÉNÉRÉ SERVEUR — jamais accepté du client. */
  requestIdProvider: () => string;
  logSink: LogSink;
  /** Liste blanche d'origines — valeurs réelles branchées au Lot 3B.3. */
  allowedOrigins: readonly string[];
  config: ServerRoutingConfig;
  limits: ValidationLimits;
  pilotZone: PilotZone;
}

const CORS_ALLOW_HEADERS = 'authorization, content-type';
const CORS_ALLOW_METHODS = 'POST, OPTIONS';

function corsHeadersFor(origin: string | null, allowed: readonly string[]): Record<string, string> {
  // Un Origin reçu n'est JAMAIS recopié sans validation ; jamais '*'.
  if (origin !== null && allowed.includes(origin)) {
    return { 'access-control-allow-origin': origin, vary: 'Origin' };
  }
  return {};
}

export async function handleRoutePlan(
  raw: RawHttpRequest,
  deps: HandlerDeps,
): Promise<RawHttpResponse> {
  const requestId = deps.requestIdProvider();
  const startedAtMs = deps.nowMs();
  let action: 'directions' | 'matrix' | null = null;
  let mode: 'wheelchair' | 'walk' | null = null;
  let upstreamCalls = 0;

  const finish = (response: RawHttpResponse, errorCode: RoutePlanErrorCode | null): RawHttpResponse => {
    deps.logSink(
      buildSafeLogEntry({
        requestId,
        action,
        mode,
        statusCode: response.status,
        errorCode,
        latencyMs: deps.nowMs() - startedAtMs,
        upstreamCalls,
      }),
    );
    return response;
  };

  // Préflight CORS : sans JWT, en-têtes limités, jamais '*'.
  if (raw.method === 'OPTIONS') {
    if (raw.origin !== null && !deps.allowedOrigins.includes(raw.origin)) {
      return finish(errorResponse('origin_not_allowed'), 'origin_not_allowed');
    }
    return finish(
      {
        status: 204,
        headers: {
          ...corsHeadersFor(raw.origin, deps.allowedOrigins),
          'access-control-allow-methods': CORS_ALLOW_METHODS,
          'access-control-allow-headers': CORS_ALLOW_HEADERS,
        },
        body: '',
      },
      null,
    );
  }

  // POST : une origine PRÉSENTE doit être en liste blanche ; son absence
  // reste acceptée (application native Expo sans en-tête Origin).
  if (raw.origin !== null && !deps.allowedOrigins.includes(raw.origin)) {
    return finish(errorResponse('origin_not_allowed'), 'origin_not_allowed');
  }
  const cors = corsHeadersFor(raw.origin, deps.allowedOrigins);

  // Validation stricte (méthode, type, taille, schéma, zone, binding).
  const validation = validateRoutePlanRequest(raw, deps.config, deps.pilotZone, deps.limits);
  if (!validation.ok) {
    return finish(errorResponse(validation.code, cors), validation.code);
  }
  const { input } = validation;
  action = input.action;
  mode = input.mode;

  // Authentification (vérificateur injecté).
  const auth = await deps.jwtVerifier(raw.headers['authorization'] ?? null);
  if (!auth.ok) {
    return finish(errorResponse('unauthorized', cors), 'unauthorized');
  }

  // Pseudonyme de quota (HMAC ≥ 128 bits) — le sub brut s'arrête ici.
  const pseudonymResult = await pseudonymFromSub(auth.sub, deps.hmacFn, deps.pepper);
  if (!pseudonymResult.ok) {
    return finish(errorResponse('unauthorized', cors), 'unauthorized');
  }

  // Quotas atomiques : tous les compteurs acceptent, ou aucun n'est modifié.
  const quota = await deps.quotaStore.consume({
    subjectKey: pseudonymResult.pseudonym,
    nowMs: deps.nowMs(),
    buckets: buildStandardBuckets(pseudonymResult.pseudonym, deps.nowMs(), deps.quotaLimits),
  });
  if (!quota.allowed) {
    const code: RoutePlanErrorCode =
      quota.exceededBucket === 'global_daily'
        ? 'quota_exceeded_global'
        : quota.exceededBucket === 'user_minute'
          ? 'quota_exceeded_minute'
          : 'quota_exceeded_user';
    return finish(errorResponse(code, cors), code);
  }

  // Empreinte de la configuration réellement appliquée (serveur) —
  // matériau sans coordonnée ni identité, par construction.
  const paramsHash = await computeParamsHash(deps.config, input.mode, deps.hashFn);
  const assertion: ServerAssertion = {
    providerId: 'ors',
    profileId: deps.config.profiles[input.mode],
    serverConfigVersion: deps.config.version,
    paramsHash,
    generatedAtMs: deps.nowMs(),
  };

  // Appels amont via fetch injecté — corps construits côté serveur.
  if (input.action === 'directions') {
    upstreamCalls = 1;
    const result = await callUpstream(
      deps.upstream,
      orsDirectionsPath(deps.config.profiles[input.mode]),
      buildDirectionsBody(input, deps.config),
      directionsPayloadShapeOk,
    );
    if (!result.ok) return finish(errorResponse(result.code, cors), result.code);
    return finish(
      {
        status: 200,
        headers: { 'content-type': 'application/json', ...cors },
        body: JSON.stringify({ ok: true, assertion, payload: result.payload }),
      },
      null,
    );
  }

  const { bodyA, bodyB } = buildMatrixBodies(input);
  upstreamCalls = 2;
  const matrixPath = orsMatrixPath(deps.config.profiles.walk);
  const [resultA, resultB] = await Promise.all([
    callUpstream(deps.upstream, matrixPath, bodyA, matrixPayloadShapeOk),
    callUpstream(deps.upstream, matrixPath, bodyB, matrixPayloadShapeOk),
  ]);
  if (!resultA.ok) return finish(errorResponse(resultA.code, cors), resultA.code);
  if (!resultB.ok) return finish(errorResponse(resultB.code, cors), resultB.code);

  return finish(
    {
      status: 200,
      headers: { 'content-type': 'application/json', ...cors },
      body: JSON.stringify({
        ok: true,
        assertion,
        payloadA: resultA.payload,
        payloadB: resultB.payload,
      }),
    },
    null,
  );
}
