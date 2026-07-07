import { Platform, Share } from 'react-native';

import type { Merchant } from './types';

/**
 * Partage d'un commerce — API de partage natif (feuille système) sur mobile, `navigator.share`
 * sur web quand disponible. Tolérant : annulation / indisponibilité → no-op (jamais de crash).
 * Aucune dépendance Supabase.
 */
export async function shareMerchant(merchant: Merchant): Promise<void> {
  const title = merchant.name;
  const url = merchant.website ?? '';
  const message = url ? `${title} — découvert sur YOOTOO\n${url}` : `${title} — découvert sur YOOTOO`;
  try {
    const nav =
      typeof navigator !== 'undefined'
        ? (navigator as Navigator & { share?: (data: { title?: string; text?: string; url?: string }) => Promise<void> })
        : undefined;
    if (Platform.OS === 'web' && nav?.share) {
      await nav.share({ title, text: message, url: url || undefined });
      return;
    }
    await Share.share({ title, message });
  } catch {
    /* partage annulé ou indisponible */
  }
}
