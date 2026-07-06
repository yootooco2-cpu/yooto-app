import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { Platform } from 'react-native';

import { authStorage } from './authStorage';

/**
 * Client Supabase — singleton PARESSEUX (lazy).
 *
 * - Aucune création au chargement du module (pas d'accès réseau/`window`) → rendu
 *   statique web SSR-safe, Expo Go OK.
 * - Clé ANON publique UNIQUEMENT. Jamais de `service_role` côté client.
 * - AUTH (PR 1) : session PERSISTÉE (stockage sécurisé) + refresh auto + PKCE.
 *   RÉTRO-COMPATIBLE : anon quand déconnecté (lecture publique des commerces actifs
 *   inchangée), JWT utilisateur quand connecté. Aucune UI ne consomme encore la session.
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
      storage: authStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Web : capte les jetons OAuth présents dans l'URL de redirection.
      detectSessionInUrl: Platform.OS === 'web',
      // PKCE : recommandé mobile + web (échange de code via exchangeCodeForSession).
      flowType: 'pkce',
    },
  });
  return cachedClient;
}
