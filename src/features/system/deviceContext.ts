import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

/**
 * FONDATION A — Device Context.
 *
 * Lit ce que l'OS fournit DÉJÀ (langue, région, devise, fuseau, thème) — « le meilleur
 * formulaire est celui qui ne se remplit pas ». Sans nouvelle dépendance native :
 *  - locale + fuseau via `Intl.DateTimeFormat().resolvedOptions()` (Hermes/RN + web) ;
 *  - thème via `useColorScheme()` (react-native).
 * Purement en LECTURE : n'applique rien (ni thème, ni i18n). Les consommateurs décident.
 * `resolveDeviceContext` est PUR (testable) ; le hook n'ajoute que la lecture OS.
 */
export type ColorSchemeName = 'light' | 'dark';

export interface DeviceContext {
  /** BCP-47 résolu par l'OS, ex. `fr-FR`. */
  locale: string;
  /** Langue seule, ex. `fr`. */
  language: string;
  /** Région / pays (2 lettres) si présent, ex. `FR` — sinon `null`. */
  region: string | null;
  /** Fuseau IANA, ex. `Europe/Paris` — `null` si indisponible. */
  timeZone: string | null;
  /** Devise ISO-4217 déduite de la région, ex. `EUR`. Défaut `EUR` (cœur de cible). */
  currency: string;
  /** Thème système. */
  colorScheme: ColorSchemeName;
}

// Région → devise (minimal, étendable). Défaut EUR. On ne « devine » jamais au-delà de l'OS.
const REGION_CURRENCY: Record<string, string> = {
  FR: 'EUR', MC: 'EUR', BE: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR',
  LU: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
  GB: 'GBP', CH: 'CHF', US: 'USD', CA: 'CAD',
};

const DEFAULT_LOCALE = 'fr-FR';
const DEFAULT_CURRENCY = 'EUR';

export interface DeviceContextInput {
  locale?: string | null;
  timeZone?: string | null;
  colorScheme?: ColorSchemeName;
}

/** PUR : normalise une locale OS brute en `DeviceContext`. */
export function resolveDeviceContext(input: DeviceContextInput = {}): DeviceContext {
  const locale = (input.locale && input.locale.trim()) || DEFAULT_LOCALE;
  const language = (locale.split(/[-_]/)[0] || 'fr').toLowerCase();
  const regionMatch = locale.match(/[-_]([A-Za-z]{2})(?:[-_]|$)/);
  const region = regionMatch ? regionMatch[1].toUpperCase() : null;
  const currency = (region && REGION_CURRENCY[region]) || DEFAULT_CURRENCY;
  return {
    locale,
    language,
    region,
    timeZone: input.timeZone ?? null,
    currency,
    colorScheme: input.colorScheme === 'dark' ? 'dark' : 'light',
  };
}

/** Lecture OS (défensive : jamais d'exception si `Intl` incomplet). */
function readOsLocaleAndTimeZone(): { locale: string | null; timeZone: string | null } {
  try {
    const resolved = Intl.DateTimeFormat().resolvedOptions();
    return { locale: resolved.locale ?? null, timeZone: resolved.timeZone ?? null };
  } catch {
    return { locale: null, timeZone: null };
  }
}

/** Hook : contexte OS courant (recalculé si le thème système change). */
export function useDeviceContext(): DeviceContext {
  const scheme = useColorScheme();
  return useMemo(() => {
    const { locale, timeZone } = readOsLocaleAndTimeZone();
    return resolveDeviceContext({
      locale,
      timeZone,
      colorScheme: scheme === 'dark' ? 'dark' : 'light',
    });
  }, [scheme]);
}
