import { getMerchantCoverPhoto } from './photos';
import type { Merchant } from './types';
import { isVerifiedMerchant } from './verification';

/**
 * SCORE DE COMPLÉTUDE (décision produit 12/07) — il ordonne l'AFFICHAGE, et rien d'autre :
 * jamais publier/dépublier/masquer/exclure. Toutes les fiches restent visibles ;
 * seules les positions changent. Deux axes restent INDÉPENDANTS : la complétude joue la
 * richesse de présentation ; la vérification SIRENE garde son sceau et sa présence propre
 * (sur la carte : liseré or du point — l'absence de photo n'écrase jamais la preuve d'État).
 */

/**
 * Santé photo — le score exige une photo RÉELLEMENT AFFICHABLE, jamais une simple URL
 * non nulle (leçon des URLs mortes). Registre alimenté par les `onError` des rendus :
 * il démarre vide (équivalent URL au premier rendu) et converge vers la vérité d'affichage.
 */
const failedPhotoUrls = new Set<string>();

export function markPhotoFailed(url?: string): void {
  if (url) failedPhotoUrls.add(url);
}

export function isDisplayablePhoto(m: Merchant): boolean {
  const url = getMerchantCoverPhoto(m);
  return Boolean(url) && !failedPhotoUrls.has(url as string);
}

/** Pondérations validées — le site web volontairement bas, la photo volontairement haute. */
function computeScore(m: Merchant): number {
  let score = 0;
  if (isDisplayablePhoto(m)) score += 3;
  if (isVerifiedMerchant(m)) score += 3;
  if (m.phone) score += 2;
  if (typeof m.rating === 'number' && m.rating > 0) score += 2;
  if (m.openingHours && m.openingHours.length > 0) score += 1;
  if (m.website) score += 1;
  return score; // 0..12
}

/**
 * Score effectif : la colonne MATÉRIALISÉE (dérivée, auto-recalculée par Postgres —
 * jamais désynchronisable) quand elle est là, raffinée par la santé photo du rendu
 * réel (une URL morte retire ses 3 points) ; calcul local en repli (fixtures, tests).
 */
export function presentationScore(m: Merchant): number {
  if (typeof m.presentationScore === 'number') {
    const photoDead = Boolean(getMerchantCoverPhoto(m)) && !isDisplayablePhoto(m);
    return Math.max(0, m.presentationScore - (photoDead ? 3 : 0));
  }
  return computeScore(m);
}

/**
 * CHECKLIST DE PROGRESSION du commerçant — JAMAIS un chiffre, jamais une fraction,
 * jamais un pourcentage : un score affiché EST une note, quelle que soit la doctrine.
 * Uniquement des ACTIONS possibles, ordonnées par impact ; la note Google n'y figure
 * pas (elle ne se « remplit » pas). Vide = fiche complète (message de félicitations
 * côté UI, pas 12/12). Consommateur naturel : le futur espace commerçant (claims).
 */
export function completionChecklist(m: Merchant): string[] {
  const actions: string[] = [];
  if (!isDisplayablePhoto(m)) actions.push('Ajoutez une photo de votre vitrine');
  if (!isVerifiedMerchant(m)) actions.push('Vérifiez votre établissement (SIRET)');
  if (!m.phone) actions.push('Ajoutez votre téléphone');
  if (!m.openingHours || m.openingHours.length === 0) actions.push('Ajoutez vos horaires');
  if (!m.website) actions.push('Ajoutez votre site web');
  return actions;
}

/**
 * Ordre d'affichage à catégorie identique : complétude → SPT → distance.
 * Note honnête : le score SPT n'est pas encore persisté côté client ; `verificationScore`
 * (score officiel V2.4 en base) en est le meilleur porteur disponible — à remplacer par la
 * colonne SPT quand elle sera persistée (décision à venir, aucune heuristique nouvelle ici).
 */
export function compareForDisplay(a: Merchant, b: Merchant): number {
  const s = presentationScore(b) - presentationScore(a);
  if (s !== 0) return s;
  const v = (b.verificationScore ?? 0) - (a.verificationScore ?? 0);
  if (v !== 0) return v;
  const d = (a.distanceKm ?? Number.POSITIVE_INFINITY) - (b.distanceKm ?? Number.POSITIVE_INFINITY);
  if (d !== 0) return d;
  return a.name.localeCompare(b.name);
}

/** Tri PUR (copie) — une permutation, jamais un filtre : |sortie| === |entrée|. */
export function sortForDisplay(merchants: readonly Merchant[]): Merchant[] {
  return [...merchants].sort(compareForDisplay);
}
