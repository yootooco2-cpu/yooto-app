import type { Merchant } from '@/features/merchants';
import { isNewInTown, isProvenProducer } from '@/features/merchants/verification';

/**
 * TERRITORY SOURCES — le contrat de contenu du TerritoryCarousel.
 *
 * Le composant UI ne sera JAMAIS réécrit : seule la source change. Une source est une
 * fonction PURE (testable) qui sélectionne et ordonne des commerces depuis le corpus
 * déjà chargé — aucun fetch, aucun état.
 *
 * STATUT (gouvernance 11/07) : abstraction EXPLORATOIRE — 1 producteur, 1 consommateur.
 * Elle sera « officielle » après les jalons A (2e producteur réel accepté sans changer
 * ce schéma) et B (2e consommateur). Honnêteté de contrat : `select(merchants)` est un
 * sélecteur de corpus COMMERCES — des contenus d'autre nature (événements, recos IA)
 * appelleront probablement des interfaces sœurs, pas un élargissement de celle-ci.
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
/**
 * 🌾 Producteurs vérifiés — activité agricole PROUVÉE par le NAF officiel (01/02/03).
 * Deuxième source réelle du TerritoryCarousel (jalon A-light : même forme, plomberie
 * multi-sources validée — le test de généricité complet reste les marchés, Sprint 3).
 */
export const verifiedProducersSource: TerritorySource = {
  id: 'verified-producers',
  title: '🌾 Producteurs vérifiés',
  subtitle: 'Activité agricole prouvée par le registre officiel.',
  select: (merchants) =>
    merchants
      .filter(isProvenProducer)
      .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
      .slice(0, CAROUSEL_CAP),
};

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
