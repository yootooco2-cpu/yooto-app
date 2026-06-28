import type { EntityCache, EntityDataSource, EntityRepository } from './types';

interface CreateEntityRepositoryOptions<T> {
  /** Source distante (Supabase…). `null` ⇒ on utilise le fallback. */
  remote: EntityDataSource<T> | null;
  /** Source locale toujours disponible (données de démo / seed offline). */
  fallback: EntityDataSource<T>;
  /** Cache offline optionnel. COUTURE S6 — non fourni en S5. */
  cache?: EntityCache<T>;
}

/**
 * Construit un `EntityRepository<T>` générique.
 * - Choisit `remote` si dispo, sinon `fallback` → l'app ne casse jamais.
 * - Le chemin cache est déjà branché (lecture/écriture si un cache est fourni) ;
 *   aucun cache n'étant passé en S5, ces branches restent inactives.
 */
export function createEntityRepository<T>({
  remote,
  fallback,
  cache,
}: CreateEntityRepositoryOptions<T>): EntityRepository<T> {
  const source = remote ?? fallback;

  return {
    async list() {
      if (cache) {
        const cached = await cache.read();
        if (cached) return cached;
      }
      const items = await source.list();
      if (cache) await cache.write(items);
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
