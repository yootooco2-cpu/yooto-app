import type { NotificationSettings } from '@/features/settings/types';

/**
 * Service de NOTIFICATIONS — préférences (portées par `AppSettings.notifications`) + point
 * d'ancrage pour l'enregistrement push FUTUR (Expo Notifications / Firebase Cloud Messaging).
 * Les préférences sont persistées via `SettingsService` ; ce service centralisera l'obtention
 * du token push et l'abonnement par thème le moment venu.
 */
export const NotificationService = {
  /** Libellés lisibles des canaux (source unique). */
  channelLabels(): Record<keyof NotificationSettings, string> {
    return {
      promotions: 'Promotions',
      newMerchants: 'Nouveaux commerces',
      newProducers: 'Nouveaux producteurs',
      seasonal: 'Produits de saison',
      missions: 'Missions',
      rewards: 'Récompenses',
      localNews: 'Actualités locales',
    };
  },
  /**
   * Enregistrement push — À BRANCHER (Expo Notifications / FCM) dans une PR dédiée.
   * Renvoie un état explicite tant que ce n'est pas configuré (aucune donnée en dur, aucun crash).
   */
  async registerForPush(): Promise<{ ok: boolean; token?: string; reason?: string }> {
    return { ok: false, reason: 'push-not-configured' };
  },
};
