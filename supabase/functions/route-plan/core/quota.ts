/**
 * Quotas — LOT 3B.1 : contrat de consommation ATOMIQUE.
 *
 * `consume()` applique TOUS les compteurs d'une requête en une décision :
 * soit tous les buckets acceptent et sont incrémentés ensemble, soit AUCUN
 * n'est modifié (jamais d'incrément partiel). Le futur stockage Postgres
 * (Lot 3B.2) devra honorer ce contrat en une seule opération atomique.
 *
 * L'implémentation mémoire est RÉSERVÉE AUX TESTS : par instance, volatile,
 * AUCUNE durabilité ni cohérence multi-instances garantie en production.
 */

export interface QuotaBucket {
  /** Identifiant stable du bucket (retourné en cas de dépassement). */
  id: string;
  /** Clé de comptage complète (sujet + fenêtre), ex. `user:<pseudo>:day:<jour>`. */
  key: string;
  limit: number;
}

export interface QuotaConsumeRequest {
  subjectKey: string;
  nowMs: number;
  buckets: readonly QuotaBucket[];
}

export type QuotaConsumeResult =
  | { allowed: true; counts: Readonly<Record<string, number>> }
  | { allowed: false; exceededBucket: string };

export interface QuotaStore {
  consume(request: QuotaConsumeRequest): Promise<QuotaConsumeResult>;
}

/** Jour UTC déterministe depuis un epoch ms injecté. */
export function dayKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 10);
}

/** Minute UTC déterministe depuis un epoch ms injecté. */
export function minuteKey(nowMs: number): string {
  return new Date(nowMs).toISOString().slice(0, 16);
}

export interface QuotaLimits {
  perUserDaily: number;
  globalDaily: number;
  perUserPerMinute: number;
}

/** Buckets standard d'une requête : utilisateur/jour, global/jour, utilisateur/minute. */
export function buildStandardBuckets(
  pseudonym: string,
  nowMs: number,
  limits: QuotaLimits,
): QuotaBucket[] {
  const day = dayKey(nowMs);
  const minute = minuteKey(nowMs);
  return [
    { id: 'user_daily', key: `user:${pseudonym}:day:${day}`, limit: limits.perUserDaily },
    { id: 'global_daily', key: `global:day:${day}`, limit: limits.globalDaily },
    { id: 'user_minute', key: `user:${pseudonym}:minute:${minute}`, limit: limits.perUserPerMinute },
  ];
}

/**
 * Implémentation mémoire TEST-ONLY. Atomicité : vérification de tous les
 * buckets AVANT tout incrément ; un refus laisse chaque compteur intact.
 */
export function createMemoryQuotaStore(): QuotaStore {
  const counters = new Map<string, number>();
  return {
    consume(request: QuotaConsumeRequest): Promise<QuotaConsumeResult> {
      for (const bucket of request.buckets) {
        const current = counters.get(bucket.key) ?? 0;
        if (current + 1 > bucket.limit) {
          return Promise.resolve({ allowed: false, exceededBucket: bucket.id });
        }
      }
      const counts: Record<string, number> = {};
      for (const bucket of request.buckets) {
        const next = (counters.get(bucket.key) ?? 0) + 1;
        counters.set(bucket.key, next);
        counts[bucket.id] = next;
      }
      return Promise.resolve({ allowed: true, counts });
    },
  };
}
