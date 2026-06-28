import type { EntityCache, EntityDataSource, EntityRepository } from './types';

interface CreateEntityRepositoryOptions<T, Q> {
  /** Source distante (Supabase…). `null` ⇒ on utilise le fallback. */
  remote: EntityDataSource<T, Q> | null;
  /** Source locale toujours disponible (données de démo / seed offline). */
  fallback: EntityDataSource<T, Q>;
  /** Cache offline optionnel. COUTURE S6 — non fourni en S5. */
  cache?: EntityCache<T>;
}

/**
 * Construit un `EntityRepository<T, Q>` générique.
 * - Choisit `remote` si dispo, sinon `fallback` → l'app ne casse jamais.
 * - Le chemin cache est déjà branché (lecture/écriture si un cache est fourni) ;
 *   aucun cache n'étant passé en S5, ces branches restent inactives.
 * - La `query` est transmise telle quelle à la source (filtrage/tri y vivent).
 */
export function createEntityRepository<T, Q = void>({
  remote,
  fallback,
  cache,
}: CreateEntityRepositoryOptions<T, Q>): EntityRepository<T, Q> {
  const source = remote ?? fallback;

  return {
    async list(query?: Q) {
      // Le cache (S6) ne sera consulté que pour la liste non filtrée.
      if (cache && query === undefined) {
        const cached = await cache.read();
        if (cached) return cached;
      }
      const items = await source.list(query);
      if (cache && query === undefined) await cache.write(items);
      return items;
    },
    async getById(id) {
      if (cache) {
        const cached = await cache.readOne(id);
        if (cached) return cached;
      }
      return source.getById(id);
    },
  };
}
