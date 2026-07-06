import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabaseClient } from './client';

/**
 * Actions d'authentification (Phase 2) — s'appuient UNIQUEMENT sur Supabase Auth
 * (aucun système maison). Toutes GARDÉES : si Supabase n'est pas configuré, elles
 * renvoient `{ ok:false, error:'not-configured' }` sans effet.
 *
 * - Web  : `signInWithOAuth` redirige la page ; `detectSessionInUrl` capte la session.
 * - Natif: flux navigateur (`expo-web-browser`) + `exchangeCodeForSession` (PKCE).
 * - Email: `signInWithOtp` (lien magique, sans mot de passe) + métadonnées de profil.
 */
export type AuthProvider = 'google' | 'apple';
export interface AuthResult {
  ok: boolean;
  error?: string;
  /** Web OAuth : la session se finalise après redirection (rien à attendre ici). */
  pendingRedirect?: boolean;
}

/** URL de redirection : `yootoo://auth` (natif) / origine web `/auth`. */
function redirectUrl(): string {
  return Linking.createURL('auth');
}

export async function signInWithProvider(provider: AuthProvider): Promise<AuthResult> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'not-configured' };
  const redirectTo = redirectUrl();

  if (Platform.OS === 'web') {
    const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo } });
    return error ? { ok: false, error: error.message } : { ok: true, pendingRedirect: true };
  }

  // Natif : on ouvre nous-mêmes le navigateur d'auth, puis on échange le code.
  const { data, error } = await sb.auth.signInWithOAuth({
    provider,
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error || !data?.url) return { ok: false, error: error?.message ?? 'no-url' };

  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success' || !result.url) return { ok: false, error: 'cancelled' };

  const parsed = Linking.parse(result.url);
  const code = typeof parsed.queryParams?.code === 'string' ? parsed.queryParams.code : null;
  if (!code) return { ok: false, error: 'no-code' };

  const { error: exchangeError } = await sb.auth.exchangeCodeForSession(code);
  return exchangeError ? { ok: false, error: exchangeError.message } : { ok: true };
}

export interface EmailSignInMeta {
  firstName?: string;
  lastName?: string;
  phone?: string;
}

export async function signInWithEmailLink(email: string, meta: EmailSignInMeta): Promise<AuthResult> {
  const sb = getSupabaseClient();
  if (!sb) return { ok: false, error: 'not-configured' };
  const { error } = await sb.auth.signInWithOtp({
    email: email.trim(),
    options: {
      emailRedirectTo: redirectUrl(),
      // Métadonnées reprises par le trigger `handle_new_user` (first_name/last_name/phone).
      data: {
        first_name: meta.firstName?.trim() || undefined,
        last_name: meta.lastName?.trim() || undefined,
        phone: meta.phone?.trim() || undefined,
      },
    },
  });
  return error ? { ok: false, error: error.message } : { ok: true };
}
