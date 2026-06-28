/**
 * Contrats de données génériques (agnostiques du backend ET de l'entité).
 *
 * Couches : UI → Repository<T> → DataSource<T> → backend (Supabase, REST, IA…).
 * `Merchant` n'est que la 1ʳᵉ entité ; `Producer`, `Event`, `Challenge`… réutilisent
 * ces mêmes contrats.
 */

/**
 * Source de données brute (Supabase aujourd'hui, REST/cache/IA demain).
 * `Q` = critères de requête optionnels (recherche/filtres/distance). `Q = void`
 * par défaut → les entités sans critères ne changent pas.
 */
export interface EntityDataSource<T, Q = void> {
  list(query?: Q): Promise<T[]>;
  getById(id: string): Promise<T | null>;
}

/** Cache offline optionnel (MMKV…). COUTURE — défini, non implémenté en S5. */
export interface EntityCache<T> {
  read(): Promise<T[] | null>;
  readOne(id: string): Promise<T | null>;
  write(items: T[]): Promise<void>;
}

/** Orchestrateur consommé par l'UI : source distante + cache + fallback local. */
export interface EntityRepository<T, Q = void> {
  list(query?: Q): Promise<T[]>;
  getById(id: string): Promise<T | null>;
}
