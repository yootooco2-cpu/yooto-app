import type { Merchant } from './types';

/**
 * IDENTITÉ VÉRIFIÉE (SIRENE V2.4) — dérivation des badges affichés sur la fiche.
 *
 * Principe : un badge n'apparaît QUE s'il est PROUVÉ par les données officielles
 * de l'État (API Recherche d'Entreprises). Jamais déduit, jamais deviné — c'est
 * précisément ce que Google ne peut pas offrir, et la promesse YOOTOO rendue
 * tangible : les vrais indépendants distingués des chaînes.
 */

export interface VerificationBadge {
  id: 'verified' | 'independent' | 'producer' | 'since';
  emoji: string;
  label: string;
}

/** Codes NAF « production » : agriculture (01), sylviculture (02), pêche (03). */
const PRODUCER_NAF_PREFIXES = ['01.', '02.', '03.'];

/** L'identité est vérifiée si un SIRET est présent ET l'établissement non cessé. */
export function isVerifiedMerchant(m: Pick<Merchant, 'siret' | 'sireneEtat'>): boolean {
  return Boolean(m.siret) && m.sireneEtat !== 'C';
}

/** Indépendance PROUVÉE : l'unité légale ne possède qu'un seul établissement. */
export function isProvenIndependent(
  m: Pick<Merchant, 'siret' | 'sireneEtat' | 'sireneNbEtablissements'>,
): boolean {
  return isVerifiedMerchant(m) && m.sireneNbEtablissements === 1;
}

/** Producteur PROUVÉ par l'activité officielle (NAF agricole/pêche). */
export function isProvenProducer(
  m: Pick<Merchant, 'siret' | 'sireneEtat' | 'nafCode'>,
): boolean {
  return (
    isVerifiedMerchant(m) &&
    Boolean(m.nafCode) &&
    PRODUCER_NAF_PREFIXES.some((p) => (m.nafCode as string).startsWith(p))
  );
}

/** Année de création lisible (« Depuis 2010 ») — undefined si inconnue/invalide. */
export function verifiedSinceYear(m: Pick<Merchant, 'sireneCreationDate'>): number | undefined {
  if (!m.sireneCreationDate) return undefined;
  const year = Number(m.sireneCreationDate.slice(0, 4));
  return Number.isInteger(year) && year > 1800 ? year : undefined;
}

/**
 * « Nouveau dans votre quartier » — établissement créé il y a moins de 90 jours.
 * DONNÉES PRÊTES, fonctionnalité pas encore affichée (V2.4 : préparation).
 */
export const NEW_MERCHANT_WINDOW_DAYS = 90;
export function isNewInTown(m: Pick<Merchant, 'sireneCreationDate'>, nowMs: number): boolean {
  if (!m.sireneCreationDate) return false;
  const created = Date.parse(m.sireneCreationDate);
  if (Number.isNaN(created)) return false;
  const ageDays = (nowMs - created) / 86_400_000;
  return ageDays >= 0 && ageDays <= NEW_MERCHANT_WINDOW_DAYS;
}

/**
 * Badges de vérification de la fiche — ordre d'importance, max 4.
 * Le badge « Local » (éditorial) vit déjà dans le header : on ne le duplique pas.
 */
export function getVerificationBadges(m: Merchant): VerificationBadge[] {
  const badges: VerificationBadge[] = [];
  if (!isVerifiedMerchant(m)) return badges;

  badges.push({ id: 'verified', emoji: '🏛', label: 'Vérifié · registre officiel' });
  if (isProvenProducer(m)) {
    badges.push({ id: 'producer', emoji: '🌾', label: 'Producteur vérifié' });
  }
  if (isProvenIndependent(m)) {
    badges.push({ id: 'independent', emoji: '🤝', label: 'Entreprise indépendante' });
  }
  const year = verifiedSinceYear(m);
  if (year !== undefined) {
    badges.push({ id: 'since', emoji: '📅', label: `Depuis ${year}` });
  }
  return badges;
}
