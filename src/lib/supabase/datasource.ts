import type { EntityDataSource } from '@/lib/data/types';

import { getSupabaseClient } from './client';

interface SupabaseDataSourceConfig<T> {
  /** Nom de la table Supabase. */
  table: string;
  /** Valide + mappe une ligne brute (snake_case) vers l'entité (camelCase). */
  parse: (row: unknown) => T;
}

/**
 * Construit un `EntityDataSource<T>` adossé à Supabase (lecture seule, RLS anon).
 * Retourne `null` si Supabase n'est pas configuré → le repository bascule sur le
 * fallback local. La validation/mapping est déléguée à `config.parse` (zod côté
 * domaine), pour garder cette couche agnostique du schéma.
 */
export function createSupabaseDataSource<T>(
  config: SupabaseDataSourceConfig<T>,
): EntityDataSource<T> | null {
  const client = getSupabaseClient();
  if (!client) return null;

  return {
    async list() {
      const { data, error } = await client.from(config.table).select('*');
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
