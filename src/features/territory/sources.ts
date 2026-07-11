import type { Merchant } from '@/features/merchants';
import { isNewInTown } from '@/features/merchants/verification';

/**
 * TERRITORY SOURCES — le contrat de contenu du TerritoryCarousel.
 *
 * Le composant UI ne sera JAMAIS réécrit : seule la source change. Une source est une
 * fonction PURE (testable) qui sélectionne et ordonne des commerces depuis le corpus
 * déjà chargé — aucun fetch, aucun état.
 *
 * Sources futures (même contrat, zéro changement d'UI) : producteurs vérifiés,
 * nouveaux artisans, à découvrir, les mieux notés, cette semaine, événements…
 * Quand le moteur SIRENE-first sera opérationnel, `recentlyOpenedSource` deviendra
 * automatiquement le flux officiel des créations : seule sa `select` changera.
 */

export interface TerritorySourceContext {
  /** Horloge injectée (déterminisme des tests). */
  now: number;
}

export interface TerritorySource {
  id: string;
  title: string;
  subtitle?: string;
  select: (merchants: readonly Merchant[], ctx: TerritorySourceContext) => Merchant[];
}

/** Plafond éditorial : un carrousel se parcourt, il ne se scrolle pas à l'infini. */
const CAROUSEL_CAP = 10;

/**
 * 🆕 Ils viennent d'ouvrir — créations récentes PROUVÉES par la date SIRENE.
 * Uniquement des données réelles : pas de date officielle → pas de présence ici.
 */
export const recentlyOpenedSource: TerritorySource = {
  id: 'recently-opened',
  title: '🆕 Ils viennent d’ouvrir',
  subtitle: 'Ouverts récemment près de chez vous.',
  select: (merchants, { now }) =>
    merchants
      .filter((m) => isNewInTown(m, now))
      .sort(
        (a, b) =>
          Date.parse(b.sireneCreationDate ?? '') - Date.parse(a.sireneCreationDate ?? ''),
      )
      .slice(0, CAROUSEL_CAP),
};
