import { useMemo } from 'react';
import { useColorScheme } from 'react-native';

/**
 * FONDATION TRANSVERSE A — Device Context.
 *
 * Rôle STRICT : décrire ce que l'OS expose (langue, région, devise, fuseau, thème).
 * PUREMENT DESCRIPTIF — aucune décision métier, aucun défaut « produit » :
 *  - si l'OS ne fournit pas une donnée → la valeur est `null` (on rapporte « inconnu »),
 *    et c'est au CONSOMMATEUR de choisir un repli (i18n, devise, thème…).
 *  - `currency` est une correspondance FACTUELLE région→ISO-4217 (pas une opinion) ; `null`
 *    si la région est inconnue/non mappée.
 * Sans dépendance native : `Intl.DateTimeFormat().resolvedOptions()` + `useColorScheme()`.
 * `resolveDeviceContext` est PUR (testable) ; le hook n'ajoute que la lecture OS.
 *
 * Réutilisable hors onboarding : i18n, préférences, personnalisation, notifications,
 * analytics, récompenses, future IA — tous consomment ce contexte sans le modifier.
 */
export type ColorSchemeName = 'light' | 'dark';

export interface DeviceContext {
  /** BCP-47 résolu par l'OS (`fr-FR`) — `null` si indisponible. */
  locale: string | null;
  /** Langue seule (`fr`) — `null` si indisponible. */
  language: string | null;
  /** Région / pays 2 lettres (`FR`) — `null` si absent. */
  region: string | null;
  /** Fuseau IANA (`Europe/Paris`) — `null` si indisponible. */
  timeZone: string | null;
  /** Devise ISO-4217 déduite de la région (`EUR`) — `null` si région inconnue/non mappée. */
  currency: string | null;
  /** Thème système — `null` si l'utilisateur n'a exprimé aucune préférence. */
  colorScheme: ColorSchemeName | null;
}

/** Table FACTUELLE région → devise (descriptive, pas une décision produit). Étendable. */
const REGION_CURRENCY: Record<string, string> = {
  FR: 'EUR', MC: 'EUR', BE: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', PT: 'EUR', NL: 'EUR',
  LU: 'EUR', IE: 'EUR', AT: 'EUR', FI: 'EUR', GR: 'EUR',
  GB: 'GBP', CH: 'CHF', US: 'USD', CA: 'CAD', JP: 'JPY',
};

/** PUR : devise ISO-4217 pour une région, ou `null` si inconnue. Descriptif. */
export function currencyForRegion(region: string | null): string | null {
  if (!region) return null;
  return REGION_CURRENCY[region.toUpperCase()] ?? null;
}

export interface DeviceContextInput {
  locale?: string | null;
  timeZone?: string | null;
  colorScheme?: ColorSchemeName | null;
}

/** PUR : normalise ce que l'OS a fourni — sans défaut métier (nulls si inconnu). */
export function resolveDeviceContext(input: DeviceContextInput = {}): DeviceContext {
  const raw = input.locale?.trim() || null;
  const language = raw ? (raw.split(/[-_]/)[0] || '').toLowerCase() || null : null;
  const regionMatch = raw ? raw.match(/[-_]([A-Za-z]{2})(?:[-_]|$)/) : null;
  const region = regionMatch ? regionMatch[1].toUpperCase() : null;
  return {
    locale: raw,
    language,
    region,
    timeZone: input.timeZone ?? null,
    currency: currencyForRegion(region),
    colorScheme: input.colorScheme ?? null,
  };
}

/** Lecture OS défensive (jamais d'exception si `Intl` incomplet). */
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
    // useColorScheme peut renvoyer 'unspecified'/null → on ne garde que light|dark, sinon null.
    const colorScheme: ColorSchemeName | null = scheme === 'light' || scheme === 'dark' ? scheme : null;
    return resolveDeviceContext({ locale, timeZone, colorScheme });
  }, [scheme]);
}
