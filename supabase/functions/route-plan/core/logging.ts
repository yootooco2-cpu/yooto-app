/**
 * Politique de logs — champs WHITELISTÉS uniquement, par construction.
 *
 * Jamais dans un log : JWT, `sub` brut, pseudonyme (même tronqué — la
 * corrélation passe par le requestId généré CÔTÉ SERVEUR), corps de
 * requête, coordonnées, URL amont, clé API, réponse ORS brute.
 * Aucun champ texte libre : impossible d'y glisser une donnée sensible.
 */

export interface SafeLogEntry {
  /** Identifiant généré serveur (injecté) — jamais un requestId client. */
  requestId: string;
  action: 'directions' | 'matrix' | null;
  mode: 'wheelchair' | 'walk' | null;
  statusCode: number;
  errorCode: string | null;
  latencyMs: number;
  upstreamCalls: number;
}

export type LogSink = (entry: SafeLogEntry) => void;

/** Constructeur : fige l'entrée (aucun ajout de champ après coup). */
export function buildSafeLogEntry(entry: SafeLogEntry): SafeLogEntry {
  return Object.freeze({
    requestId: entry.requestId,
    action: entry.action,
    mode: entry.mode,
    statusCode: entry.statusCode,
    errorCode: entry.errorCode,
    latencyMs: entry.latencyMs,
    upstreamCalls: entry.upstreamCalls,
  });
}
