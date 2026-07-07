import { getSupabaseClient } from '@/lib/supabase/client';

/** Profil complet (lecture) — champs éditables + méta. */
export interface ProfileData {
  displayName: string | null;
  avatarUrl: string | null;
  email: string | null;
  createdAt: string | null;
  firstName: string | null;
  lastName: string | null;
  username: string | null;
  bio: string | null;
  phone: string | null;
  city: string | null;
  website: string | null;
}

/** Champs modifiables (colonnes réelles de `profiles`). */
export interface ProfilePatch {
  display_name?: string | null;
  avatar_url?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  username?: string | null;
  bio?: string | null;
  phone?: string | null;
  city?: string | null;
  website?: string | null;
}

export interface ServiceResult {
  ok: boolean;
  error?: string;
}

const COLUMNS = 'display_name, avatar_url, primary_email, created_at, first_name, last_name, username, bio, phone, city, website';

/**
 * Service de PROFIL — SEUL point d'accès aux données `profiles` (via `getSupabaseClient`, RLS
 * appliquée : chacun ne lit/écrit que son profil). Aucun composant n'appelle Supabase directement.
 */
export const ProfileService = {
  async get(userId: string): Promise<ProfileData | null> {
    const supabase = getSupabaseClient();
    if (!supabase) return null;
    const { data, error } = await supabase.from('profiles').select(COLUMNS).eq('id', userId).maybeSingle();
    if (error || !data) return null;
    const row = data as Record<string, string | null>;
    return {
      displayName: row.display_name ?? null,
      avatarUrl: row.avatar_url ?? null,
      email: row.primary_email ?? null,
      createdAt: row.created_at ?? null,
      firstName: row.first_name ?? null,
      lastName: row.last_name ?? null,
      username: row.username ?? null,
      bio: row.bio ?? null,
      phone: row.phone ?? null,
      city: row.city ?? null,
      website: row.website ?? null,
    };
  },

  async update(userId: string, patch: ProfilePatch): Promise<ServiceResult> {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: 'not-configured' };
    const { error } = await supabase.from('profiles').update(patch).eq('id', userId);
    return error ? { ok: false, error: error.message } : { ok: true };
  },
};
