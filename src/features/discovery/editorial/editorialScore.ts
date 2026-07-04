import { getMerchantCoverPhoto, isRealPhotoUrl } from '@/features/merchants/photos';
import type { Merchant } from '@/features/merchants/types';

import { resolveTier, type EditorialTier } from './categoryTiers';

// editorialScore — score « première impression » de l'Accueil (ordre uniquement).
//
// Extrait de homeSections.ts (Option A, dé-duplication). La priorité de catégorie N'EST PLUS
// décidée par des listes de termes locales : elle est déléguée à `resolveTier` (categoryTiers),
// désormais SOURCE UNIQUE de la taxonomie éditoriale. Ce module ne garde que la partie
// « présentation Accueil » (photo réelle, note, ouverture, bonus producteur).
//
// Pur & additif → ordre explicable et testable. Aucune dépendance React Native (photos.ts
// n'importe qu'un type) → testable sans charger le registre de signaux.

// ── Poids de présentation (photo réelle & note dominent la première impression) ──────────
const W = {
  realPhoto: 60,
  noPhotoPenalty: -60,
  producer: 10,
  premiumProducer: 22,
  openNow: 6,
  ratingScale: 8,
  ratingPivot: 3.5,
  ratingClamp: 14,
  lowConfidenceReviews: 5,
} as const;

// Contribution d'attrait par TIER éditorial (dérivée de la source unique `resolveTier`).
// Remplace les anciens ATTRACTIVE/SENSITIVE + BUCKET_NUDGE. Alignée sur la hiérarchie du
// brief produit : max = neutre-positif fort ; low = pénalité modérée (couvreur/plombier) ;
// veryLow = pénalité forte (chatterie/élevage/toilettage/pompes funèbres).
const TIER_APPEAL: Record<EditorialTier, number> = {
  max: 30,
  medium: 6,
  low: -30,
  veryLow: -80,
};

// Bonus « producteur d'exception » (concern distinct du tier : sous-qualité producteur).
const PREMIUM_PRODUCER_TERMS = ['domaine', 'vignoble', 'vigneron', 'viticulteur'] as const;

// ── Qualité VISUELLE (métadonnées photos + signaux textuels — AUCUNE analyse d'image) ───────
// Valorise une vraie identité visuelle locale/terroir (vraies photos Google, plusieurs photos,
// vocabulaire domaine/cave/producteur…) ; réduit légèrement l'impression événementielle
// (mariage/réception/buffet). Poids MODÉRÉS : couche #3, sous la mission (#1) et la qualité de
// fiche (#2), au-dessus de la note Google (#4).
const V = {
  realPhoto: 12, // vraie photo Google (pas le fallback YOOTOO)
  fallbackPenalty: -18, // aucune vraie photo → fallback YOOTOO
  perExtraPhoto: 4, // par photo réelle supplémentaire
  extraPhotoCap: 16, // plafond (≈ 4 photos en plus)
  identityWord: 5, // par mot d'identité locale/terroir
  identityCap: 15,
  eventWord: -6, // par mot événementiel (réduction légère)
  eventCap: -18,
} as const;

// Vocabulaire d'identité locale / terroir / artisanat (nom + description + tags). Bonus léger
// → un faux positif reste bénin (jamais de suppression). Sans accents (haystack normalisé).
const IDENTITY_TERMS = [
  'domaine',
  'vignoble',
  'vigne',
  'vigneron',
  'cave',
  'vin',
  'terroir',
  'producteur',
  'ferme',
  'marche',
  'primeur',
  'boulangerie',
  'fromagerie',
  'epicerie',
  'artisan',
  'local',
  'circuit court',
] as const;

// Impression trop événementielle / hors-terroir → réduction légère.
const EVENT_TERMS = [
  'mariage',
  'reception',
  'evenementiel',
  'buffet',
  'traiteur mariage',
  'salle de reception',
] as const;

/**
 * Sous-score de QUALITÉ VISUELLE (métadonnées + texte uniquement — pas d'analyse d'image).
 * Favorise les vraies photos Google, la richesse (plusieurs photos) et l'identité terroir ;
 * pénalise l'absence/fallback et l'impression événementielle. Pur & additif. Ne supprime rien.
 */
export function visualQualityScore(merchant: Merchant): number {
  const real = hasRealPhoto(merchant);
  let score = real ? V.realPhoto : V.fallbackPenalty;

  // Richesse : nb de VRAIES photos (galerie réelle + cover, ou photo_count), plafonné.
  const galleryReal = (merchant.galleryPhotos ?? []).filter(isRealPhotoUrl).length;
  const photos = Math.max(merchant.photoCount ?? 0, galleryReal + (real ? 1 : 0));
  if (real && photos > 1) score += Math.min((photos - 1) * V.perExtraPhoto, V.extraPhotoCap);

  // Identité locale/terroir vs événementiel (nom + description + tags).
  const haystack = normalize(`${merchant.name} ${merchant.description} ${(merchant.tags ?? []).join(' ')}`);
  const identity = IDENTITY_TERMS.filter((t) => haystack.includes(t)).length;
  score += Math.min(identity * V.identityWord, V.identityCap);
  const events = EVENT_TERMS.filter((t) => haystack.includes(t)).length;
  score += Math.max(events * V.eventWord, V.eventCap);

  return score;
}

/** Accent-insensitive, lowercased. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function hasRealPhoto(merchant: Merchant): boolean {
  return getMerchantCoverPhoto(merchant) !== null;
}

/**
 * Score « première impression » d'un commerce. Plus haut = remonté plus haut à l'Accueil.
 * Pur & additif. La priorité de catégorie provient de `resolveTier` (source unique).
 */
export function editorialScore(merchant: Merchant): number {
  const haystack = normalize(`${merchant.name} ${merchant.description}`);
  let score = 0;

  // 1. Photo réelle — le levier le plus fort dans les deux sens.
  if (hasRealPhoto(merchant)) score += W.realPhoto;
  else score += W.noPhotoPenalty;

  // 2. Attrait de catégorie — SOURCE UNIQUE : resolveTier (categoryTiers), qui applique déjà le
  //    garde-fou hors-mission (nom/description) AVANT la catégorie brute → un « élevage » tagué
  //    `ranch` ressort veryLow ici, sans logique dupliquée.
  const tier = resolveTier(
    merchant.rawCategory,
    merchant.rawMerchantType,
    merchant.name,
    merchant.description,
  );
  score += TIER_APPEAL[tier];

  // 3. Qualité producteur — JAMAIS pour un commerce hors-mission (ex. « élevage » tagué ranch,
  //    ramené à veryLow) : un éleveur animalier ne doit pas toucher le bonus producteur.
  if ((merchant.isProducer || merchant.category === 'producer') && tier !== 'veryLow') {
    score += W.producer;
    if (PREMIUM_PRODUCER_TERMS.some((t) => haystack.includes(t))) score += W.premiumProducer;
  }

  // 4. Note (0–5), sous-pondérée quand trop peu d'avis pour être fiable.
  if (typeof merchant.rating === 'number' && Number.isFinite(merchant.rating)) {
    const confidence = (merchant.reviewCount ?? 0) >= W.lowConfidenceReviews ? 1 : 0.5;
    score +=
      clamp((merchant.rating - W.ratingPivot) * W.ratingScale, -W.ratingClamp, W.ratingClamp) *
      confidence;
  }

  // 5. Ouvert maintenant — petit bonus ; ne pénalise jamais un commerce fermé/inconnu.
  if (merchant.isOpenNow) score += W.openNow;

  // 6. Qualité VISUELLE (couche #3) : vraies photos + richesse + identité terroir/local,
  //    moins l'impression événementielle. Métadonnées + texte uniquement.
  score += visualQualityScore(merchant);

  return score;
}

/**
 * Score de ranking éditorial CENTRALISÉ (nom canonique). Alias de `editorialScore` :
 * combine catégorie prioritaire (resolveTier + mots-clés), note, review_count (confidence),
 * présence photo, ouvert, producteur/circuit court, et pénalité mots-clés hors intention.
 * Utilisé partout où les commerces sont triés (Accueil, Commerçants, Carte).
 */
export const getMerchantEditorialScore = editorialScore;

/**
 * SOURCE UNIQUE de tri éditorial YOOTOO. Trie une liste de commerces par score éditorial
 * DÉCROISSANT (clé PRIMAIRE), tri STABLE : à score égal, l'ordre d'entrée (Discovery Engine)
 * est conservé. Ne supprime rien (rétrograde uniquement). À utiliser partout où les commerces
 * sont classés : Accueil, Carte et Commerçants.
 */
export function rankMerchantsEditorially<T extends Merchant>(merchants: readonly T[]): T[] {
  return merchants
    .map((m, i) => ({ m, i, s: getMerchantEditorialScore(m) }))
    .sort((a, b) => b.s - a.s || a.i - b.i)
    .map((x) => x.m);
}
