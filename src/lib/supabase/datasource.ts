import type { SupabaseClient } from '@supabase/supabase-js';

import type { EntityDataSource } from '@/lib/data/types';

import { getSupabaseClient } from './client';

/** Type du query builder PostgREST renvoyé par `.from(table).select('*')`. */
export type SupabaseSelectBuilder = ReturnType<ReturnType<SupabaseClient['from']>['select']>;

interface SupabaseDataSourceConfig<T, Q> {
  /** Nom de la table Supabase. */
  table: string;
  /** Valide + mappe une ligne brute (snake_case) vers l'entité (camelCase). */
  parse: (row: unknown) => T;
  /** Traducteur critères → PostgREST (fourni par le domaine, garde `lib` agnostique). */
  buildQuery?: (builder: SupabaseSelectBuilder, query: Q) => SupabaseSelectBuilder;
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

  return {
    async list(query?: Q) {
      let builder = client.from(config.table).select('*');
      if (config.buildQuery && query !== undefined) {
        builder = config.buildQuery(builder, query);
      }
      const { data, error } = await builder;
      if (error) throw new Error(`Supabase ${config.table}.list: ${error.message}`);
      return (data ?? []).map((row) => config.parse(row));
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
