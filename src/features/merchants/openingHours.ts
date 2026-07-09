import type { Merchant } from './types';

/** Jours FR indexés comme `Date.getDay()` (0 = dimanche … 6 = samedi). */
const FR_DAYS = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'] as const;

export interface OpeningDay {
  /** Libellé du jour (« lundi »), capitalisé pour l'affichage. */
  day: string;
  /** Créneaux du jour (« 09:00 – 19:00 ») ou libellé « Fermé » tel que fourni. */
  hours: string;
  isToday: boolean;
}

export interface ResolvedOpeningHours {
  /** `false` quand aucun horaire n'est fourni → afficher « Horaires non disponibles ». */
  available: boolean;
  /** Ligne du jour courant, si identifiable. */
  today: OpeningDay | null;
  /** Semaine complète, dans l'ordre reçu (weekday_text Google). */
  week: OpeningDay[];
}

const capitalize = (value: string) => (value ? value.charAt(0).toUpperCase() + value.slice(1) : value);

/**
 * Dérive les horaires affichables à partir de `merchant.openingHours` (weekday_text Google,
 * ex. « lundi: 09:00 – 19:00 »). Purement dérivé, sans invention : si la donnée est absente
 * ou illisible, `available` vaut `false` et l'UI affiche « Horaires non disponibles ».
 * Le jour courant est détecté par correspondance du nom de jour (pas par index, robuste au
 * décalage lundi/dimanche des sources).
 */
export function resolveOpeningHours(merchant: Pick<Merchant, 'openingHours'>): ResolvedOpeningHours {
  const lines = merchant.openingHours?.filter((line) => typeof line === 'string' && line.trim().length > 0) ?? [];
  if (lines.length === 0) {
    return { available: false, today: null, week: [] };
  }

  const todayName = FR_DAYS[new Date().getDay()];
  const week: OpeningDay[] = lines.map((line) => {
    const separator = line.indexOf(':');
    const dayRaw = (separator >= 0 ? line.slice(0, separator) : line).trim();
    const hours = (separator >= 0 ? line.slice(separator + 1) : '').trim();
    const isToday = dayRaw.toLowerCase().startsWith(todayName);
    return { day: capitalize(dayRaw), hours: hours || '—', isToday };
  });

  return { available: true, today: week.find((d) => d.isToday) ?? null, week };
}
