import { getSupabaseClient } from '@/lib/supabase/client';

/** Profil affichable (lecture). */
export interface ProfileData {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  createdAt: string | null;
}

/** Champs modifiables du profil (colonnes réelles de `profiles`). */
export interface ProfilePatch {
  display_name?: string | null;
  avatar_url?: string | null;
}

export interface ServiceResult {
  ok: boolean;
  error?: string;
}

/**
 * Service de PROFIL — SEUL point d'accès aux données `profiles` de Supabase (via
 * `getSupabaseClient`, RLS appliquée : chacun ne lit/écrit que son profil). Aucun composant
 * n'appelle Supabase directement.
 */
export const ProfileService = {
  async get(userId: string): Promise<ProfileData | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url, primary_email, created_at')
      .eq('id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return {
      displayName: data.display_name ?? null,
      avatarUrl: data.avatar_url ?? null,
      email: data.primary_email ?? null,
      createdAt: data.created_at ?? null,
    };
  },

  async update(userId: string, patch: ProfilePatch): Promise<ServiceResult> {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: 'not-configured' };
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    return error ? { ok: false, error: error.message } : { ok: true };
  },
};
