import { SettingsService } from './SettingsService';
import { ProfileService, type ServiceResult } from './ProfileService';

/**
 * Service de CONFIDENTIALITÉ — export des données et suppression de compte.
 * L'export assemble un JSON conforme (profil + réglages). La suppression réelle (Auth + Storage +
 * données) passera par une Edge Function `delete-account` (service role) déployée côté Supabase :
 * tant qu'elle n'existe pas, on renvoie un état explicite. La confirmation « SUPPRIMER » est
 * vérifiée ici (règle métier hors composant).
 */
export const PrivacyService = {
  async exportData(userId: string): Promise<{ profile: unknown; settings: unknown }> {
    const [profile, settings] = await Promise.all([ProfileService.get(userId), SettingsService.load()]);
    return { profile, settings };
  },

  async deleteAccount(confirmation: string): Promise<ServiceResult> {
    if (confirmation.trim().toUpperCase() !== 'SUPPRIMER') return { ok: false, error: 'confirmation' };
    // À brancher (PR confidentialité) : appel de l'Edge Function `delete-account` (service role).
    return { ok: false, error: 'delete-not-configured' };
  },
};
