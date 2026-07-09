import { getSupabaseClient } from '@/lib/supabase/client';

import type { ServiceResult } from './ProfileService';

const AVATARS_BUCKET = 'avatars';

/**
 * Service de STOCKAGE — envoi des photos de profil dans Supabase Storage (bucket public `avatars`).
 * Chaque fichier est écrit sous `avatars/<uid>/…` (les policies imposent que seul le propriétaire
 * écrive dans son dossier). Renvoie l'URL publique. Seul point d'accès au Storage (aucun composant).
 */
export const StorageService = {
  bucket: AVATARS_BUCKET,

  async uploadAvatar(
    userId: string,
    bytes: ArrayBuffer | Uint8Array,
    contentType = 'image/jpeg',
  ): Promise<ServiceResult & { url?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: 'not-configured' };
    const path = `${userId}/avatar_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from(AVATARS_BUCKET).upload(path, bytes, {
      contentType,
      upsert: true,
      cacheControl: '3600',
    });
    if (error) return { ok: false, error: error.message };
    const { data } = supabase.storage.from(AVATARS_BUCKET).getPublicUrl(path);
    return { ok: true, url: data.publicUrl };
  },
};
