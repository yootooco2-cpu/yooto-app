import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Client Supabase — singleton PARESSEUX (lazy).
 *
 * - Aucune création au chargement du module (pas d'accès réseau/`window`) → rendu
 *   statique web SSR-safe, Expo Go OK.
 * - Clé ANON publique UNIQUEMENT. Jamais de `service_role` côté client.
 * - Pas d'auth en S5 : session non persistée.
 */
let cachedClient: SupabaseClient | null | undefined;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.EXPO_PUBLIC_SUPABASE_URL && process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  );
}

export function getSupabaseClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
  return cachedClient;
}
