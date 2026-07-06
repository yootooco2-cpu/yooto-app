import * as Linking from 'expo-linking';
import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';

import { getSupabaseClient } from './client';

/**
 * Actions d'authentification (PR 4) — via Supabase Auth uniquement (aucun système maison).
 * Toutes GARDÉES : sans Supabase configuré → `{ ok:false, error:'not-configured' }`.
 *
 * Upgrade ZÉRO PERTE : si la session courante est ANONYME, on **lie** l'identité
 * (`linkIdentity`) → même `auth.users.id` → les favoris restent. Sinon, connexion normale.
 * - Web  : redirection ; `detectSessionInUrl` (PR 1) finalise la session au retour.
 * - Natif: navigateur d'auth (`expo-web-browser`) + `exchangeCodeForSession` (PKCE).
 */
export type AuthProvider = 'google' | 'apple';
export interface AuthResult {
  ok: boolean;
  error?: string;
  /** Web : la session se finalise après redirection (rien à attendre côté appelant). */
  pendingRedirect?: boolean;
}

function redirectUrl(): string {
  return Linking.createURL('auth');
}

export async function continueWithProvider(provider: AuthProvider): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'not-configured' };
  const redirectTo = redirectUrl();
  const isWeb = Platform.OS === 'web';

  try {
    const { data: sess } = await supabase.auth.getSession();
    const isAnonymous = sess.session?.user?.is_anonymous === true;

    // Anonyme → upgrade par liaison (favoris conservés) ; sinon connexion.
    const start = isAnonymous
      ? supabase.auth.linkIdentity({ provider, options: { redirectTo, skipBrowserRedirect: !isWeb } })
      : supabase.auth.signInWithOAuth({ provider, options: { redirectTo, skipBrowserRedirect: !isWeb } });
    const { data, error } = await start;

    if (isWeb) {
      return error ? { ok: false, error: error.message } : { ok: true, pendingRedirect: true };
    }
    if (error || !data?.url) return { ok: false, error: error?.message ?? 'no-url' };

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) return { ok: false, error: 'cancelled' };
    const code = Linking.parse(result.url).queryParams?.code;
    if (typeof code !== 'string') return { ok: false, error: 'no-code' };
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    return exchangeError ? { ok: false, error: exchangeError.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function signOut(): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'not-configured' };
  try {
    const { error } = await supabase.auth.signOut();
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}

export async function signInWithEmailLink(email: string): Promise<AuthResult> {
  const supabase = getSupabaseClient();
  if (!supabase) return { ok: false, error: 'not-configured' };
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectUrl() },
    });
    return error ? { ok: false, error: error.message } : { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'unknown' };
  }
}
