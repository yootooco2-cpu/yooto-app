import type { SupabaseClient } from '@supabase/supabase-js';

import type { EntityDataSource } from '@/lib/data/types';

import { getSupabaseClient } from './client';

/** Type du query builder PostgREST renvoyé par `.from(table).select('*')`. */
export type SupabaseSelectBuilder = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

interface SupabaseDataSourceConfig<T, Q> {
  /** Nom de la table Supabase. */
  table: string;
  /** Valide + mappe une ligne brute unitaire (utilisé par `getById`). */
  parse: (row: unknown) => T;
  /** Parsing RÉSILIENT d'un lot (ignore les lignes invalides) pour `list`. */
  parseList?: (rows: unknown[]) => T[];
  /** Traducteur critères → PostgREST (fourni par le domaine, garde `lib` agnostique). */
  buildQuery?: (builder: SupabaseSelectBuilder, query: Q) => SupabaseSelectBuilder;
  /**
   * PROJECTION de colonnes pour `list` (chaîne PostgREST, ex. 'id,name,latitude,...').
   * Défaut '*'. Permet de ne charger en LISTE que les colonnes réellement consommées
   * (compteurs, catégories, marqueurs, cartes, listes) ; `getById` reste en '*' (fiche complète).
   */
  listColumns?: string;
  /** Taille de page PostgREST pour la pagination de `list` (défaut 1000, max serveur). */
  pageSize?: number;
}

/**
 * Construit un `EntityDataSource<T, Q>` adossé à Supabase (lecture seule, RLS anon).
 * Retourne `null` si Supabase n'est pas configuré → le repository bascule sur le
 * fallback local. La validation/mapping et la traduction des critères sont déléguées
 * au domaine (zod + `buildQuery`), pour garder cette couche agnostique du schéma.
 */
export function createSupabaseDataSource<T, Q = void>(
  config: SupabaseDataSourceConfig<T, Q>,
): EntityDataSource<T, Q> | null {
  const client = getSupabaseClient();
  if (!client) return null;

  const columns = config.listColumns ?? '*';
  const pageSize = config.pageSize ?? 1000;

  // Construit une page (projection + éventuels critères domaine), bornée par `range`.
  const buildPage = (query: Q | undefined, from: number, to: number, withCount: boolean) => {
    let builder: SupabaseSelectBuilder = client
      .from(config.table)
      .select(columns, withCount ? { count: 'exact' } : undefined);
    if (config.buildQuery && query !== undefined) {
      builder = config.buildQuery(builder, query);
    }
    return builder.range(from, to);
  };

  return {
    async list(query?: Q) {
      // PAGINATION COMPLÈTE : PostgREST plafonne chaque réponse (~1000). On lit la 1re page avec
      // le total exact (`count`), puis on récupère les pages restantes EN PARALLÈLE → le temps de
      // chargement reste proche d'une seule requête (pas d'aller-retours séquentiels inutiles).
      const first = await buildPage(query, 0, pageSize - 1, true);
      if (first.error) throw new Error(`Supabase ${config.table}.list: ${first.error.message}`);
      const rows: unknown[] = [...(first.data ?? [])];
      const total = first.count ?? rows.length;

      const ranges: [number, number][] = [];
      for (let from = pageSize; from < total; from += pageSize) {
        ranges.push([from, Math.min(from + pageSize - 1, total - 1)]);
      }
      const pages = await Promise.all(ranges.map(([from, to]) => buildPage(query, from, to, false)));
      for (const page of pages) {
        if (page.error) throw new Error(`Supabase ${config.table}.list: ${page.error.message}`);
        rows.push(...(page.data ?? []));
      }

      return config.parseList ? config.parseList(rows) : rows.map((row) => config.parse(row));
    },
    async getById(id) {
      const { data, error } = await client
        .from(config.table)
        .select('*')
        .eq('id', id)
        .maybeSingle();
      if (error) throw new Error(`Supabase ${config.table}.getById: ${error.message}`);
      return data ? config.parse(data) : null;
    },
  };
}
