import { getSupabaseClient } from '@/lib/supabase/client';

import type { ServiceResult } from './ProfileService';

/**
 * Service de STOCKAGE — envoi/suppression de fichiers (avatars) dans Supabase Storage.
 * L'implémentation d'upload sera activée en PR photo de profil, une fois le bucket `avatars`
 * (+ policies) créé côté Supabase. Tant que ce n'est pas prêt, on renvoie un état explicite
 * (aucun crash, aucune donnée en dur).
 */
export const StorageService = {
  bucket: 'avatars',

  async uploadAvatar(_userId: string, _fileBytes: Uint8Array, _contentType: string): Promise<ServiceResult & { url?: string }> {
    const supabase = getSupabaseClient();
    if (!supabase) return { ok: false, error: 'not-configured' };
    // À implémenter (PR photo de profil) : upload dans le bucket `avatars` + URL publique/signée.
    return { ok: false, error: 'storage-not-configured' };
  },
};
