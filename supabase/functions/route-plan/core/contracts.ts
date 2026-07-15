/**
 * Contrats du noyau `route-plan` — LOT 3B.1 : logique pure hors ligne.
 *
 * Aucun entrypoint, aucun secret réel, aucun appel réseau : toutes les
 * dépendances externes (JWT, HMAC, quotas, fetch amont, horloge, hash,
 * identifiant de requête) sont injectées. Le noyau reçoit une requête HTTP
 * ABSTRAITE contrôlable en test (méthode, en-têtes, corps texte brut,
 * origine CORS éventuelle) et retourne une réponse abstraite.
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export type RoutePlanAction = 'directions' | 'matrix';
export type RoutePlanMode = 'wheelchair' | 'walk';

/** Binding attendu transmis par l'application — comparé, jamais cru. */
export interface ExpectedBinding {
  providerId: string;
  profileId: string;
  routingConfigVersion: number;
}

export interface DirectionsInput {
  action: 'directions';
  mode: RoutePlanMode;
  expectedBinding: ExpectedBinding;
  origin: GeoPoint;
  destination: GeoPoint;
  /** Candidat intermédiaire (évaluation fauteuil) — trajet à 3 points. */
  waypoint?: GeoPoint;
}

export interface MatrixInput {
  action: 'matrix';
  mode: 'walk';
  expectedBinding: ExpectedBinding;
  origin: GeoPoint;
  destination: GeoPoint;
  candidates: readonly GeoPoint[];
}

export type RoutePlanInput = DirectionsInput | MatrixInput;

/**
 * Requête HTTP abstraite : représentation brute contrôlable en test.
 * Les clés d'en-têtes sont normalisées en minuscules par l'appelant.
 */
export interface RawHttpRequest {
  method: string;
  headers: Readonly<Record<string, string>>;
  /** Corps TEXTE BRUT — la taille est mesurée en octets UTF-8 réels. */
  bodyText: string;
  /** En-tête Origin éventuel (null = absent, ex. application native). */
  origin: string | null;
}

export interface RawHttpResponse {
  status: number;
  headers: Readonly<Record<string, string>>;
  body: string;
}

/**
 * Assertion de provenance retournée par le serveur — structurellement
 * identique au `ServerRoutingAssertion` du client (src/features/route).
 */
export interface ServerAssertion {
  providerId: 'ors';
  profileId: string;
  serverConfigVersion: number;
  paramsHash: string;
  generatedAtMs: number;
}

export interface DirectionsSuccessEnvelope {
  ok: true;
  assertion: ServerAssertion;
  payload: unknown;
}

export interface MatrixSuccessEnvelope {
  ok: true;
  assertion: ServerAssertion;
  payloadA: unknown;
  payloadB: unknown;
}
