// categoryTiers — TAXONOMIE ÉDITORIALE (donnée pure, Sprint 1 « socle invisible »).
//
// Source de vérité de la priorité éditoriale d'un commerce, sous forme de DONNÉES pures.
// AUCUN branchement au moteur à ce stade : ce module n'est importé par aucun signal, aucun
// écran, aucune requête. Il est délibérément sans dépendance (pas de `@/…`, pas de React
// Native) → testable partout, déterministe, réutilisable côté serveur plus tard.
//
// Il ne remplace RIEN aujourd'hui. Il sera consommé par `categorySignal` au Sprint 2.

/** Niveaux de priorité éditoriale (du plus mis en avant au plus rétrogradé). */
export type EditorialTier = 'max' | 'medium' | 'low' | 'veryLow';

/**
 * Prior multiplicatif associé à chaque tier (utilisé plus tard par l'agrégateur v2).
 * `max` = neutre (1.0) ; les tiers inférieurs rétrogradent sans jamais supprimer.
 * Défini ici en donnée pour rester ajustable sans toucher au moteur.
 */
export const TIER_PRIOR: Record<EditorialTier, number> = {
  max: 1.0,
  medium: 0.7,
  low: 0.35,
  veryLow: 0.12,
};

/** Prior multiplicatif d'un tier. Pure. */
export function tierPrior(tier: EditorialTier): number {
  return TIER_PRIOR[tier];
}

/** Tier de repli quand aucune preuve ne permet de trancher (jamais `veryLow` sans preuve). */
export const DEFAULT_TIER: EditorialTier = 'medium';

/**
 * Catégories BRUTES (Google `category` / YOOTOO `merchant_type`, minuscules) → tier.
 * La granularité brute est ce qui permet de distinguer café / couvreur / chatterie, que la
 * taxonomie canonique à 5 buckets écrase tous dans `shop`/`service`.
 */
export const TIER_BY_RAW_CATEGORY: Record<string, EditorialTier> = {
  // ── max : cafés, boulangeries, restauration, artisans alimentaires, producteurs ───────
  cafe: 'max',
  coffee_shop: 'max',
  bakery: 'max',
  artisan_bakery: 'max',
  boulangerie: 'max',
  pastry_shop: 'max',
  patisserie: 'max',
  restaurant: 'max',
  local_restaurant: 'max',
  bistro: 'max',
  brasserie: 'max',
  chocolate_shop: 'max',
  local_chocolate: 'max',
  chocolatier: 'max',
  cheese_shop: 'max',
  fromagerie: 'max',
  greengrocer: 'max',
  primeur: 'max',
  liquor_store: 'max',
  caviste: 'max',
  wine_shop: 'max',
  deli: 'max',
  traiteur: 'max',
  ice_cream_shop: 'max',
  glacier: 'max',
  producer: 'max',
  producteur: 'max',
  farm: 'max',
  ferme: 'max',
  local_farm: 'max',
  ranch: 'max',
  vineyard: 'max',
  winery: 'max',
  maraicher: 'max',
  apiculteur: 'max',
  market: 'max',
  local_market: 'max',
  marche: 'max',
  grocery_store: 'max',
  epicerie: 'max',
  epicerie_fine: 'max',
  butcher: 'max',
  boucherie: 'max',
  charcuterie: 'max',
  fishmonger: 'max',
  poissonnerie: 'max',
  seafood: 'max',
  seafood_market: 'max',
  cooperative: 'max',
  cooperative_alimentaire: 'max',

  // ── medium : découverte « plaisir » secondaire ────────────────────────────────────────
  florist: 'medium',
  fleuriste: 'medium',
  book_store: 'medium',
  librairie: 'medium',
  gift_shop: 'medium',
  clothing_store: 'medium',
  home_goods_store: 'medium',
  decoration: 'medium',
  artisan: 'medium',

  // ── low : services utiles mais jamais moteurs de découverte ───────────────────────────
  bank: 'low',
  banque: 'low',
  insurance_agency: 'low',
  assurance: 'low',
  car_repair: 'low',
  garage: 'low',
  real_estate_agency: 'low',
  lawyer: 'low',
  notary: 'low',
  notaire: 'low',
  roofing_contractor: 'low',
  couvreur: 'low',
  plumber: 'low',
  plombier: 'low',
  electrician: 'low',
  electricien: 'low',
  locksmith: 'low',
  serrurier: 'low',
  general_contractor: 'low',
  painter: 'low',

  // ── veryLow : trouvable en recherche, jamais dans la découverte spontanée ──────────────
  pet_boarding_service: 'veryLow',
  cattery: 'veryLow',
  chatterie: 'veryLow',
  kennel: 'veryLow',
  pension_animale: 'veryLow',
  animal_breeding: 'veryLow',
  elevage: 'veryLow',
  breeder: 'veryLow',
  veterinary_care: 'veryLow',
  pet_grooming: 'veryLow',
  toilettage: 'veryLow',
  funeral_home: 'veryLow',
  wholesaler: 'veryLow',
  grossiste: 'veryLow',
  industrial: 'veryLow',
};

/**
 * Mots-clés (nom + description, sans accents) → tier, filet de secours quand la catégorie
 * Google est générique (`establishment`, `point_of_interest`) ou absente.
 * Ordre de résolution : max → medium → low → veryLow (le premier match l'emporte).
 */
export const MAX_TIER_TERMS: readonly string[] = [
  'cafe',
  'torrefaction',
  'boulangerie',
  'patisserie',
  'chocolatier',
  'fromagerie',
  'primeur',
  'caviste',
  'glacier',
  'epicerie fine',
  'epicerie',
  'traiteur',
  'producteur',
  'restaurant',
  'bistrot',
  'brasserie',
  'domaine',
  'vignoble',
  'boucherie',
  'charcuterie',
  'poissonnerie',
  'amap',
  'vente directe',
  'circuit court',
];

export const MEDIUM_TIER_TERMS: readonly string[] = [
  'fleuriste',
  'librairie',
  'artisan',
  'decoration',
  'cadeaux',
  'concept store',
];

export const LOW_TIER_TERMS: readonly string[] = [
  'couvreur',
  'toiture',
  'facade',
  'ravalement',
  'etancheite',
  'plombier',
  'plomberie',
  'electricien',
  'garage',
  'depannage',
  'serrurerie',
  'notaire',
  'assurance',
  'banque',
];

export const VERYLOW_TIER_TERMS: readonly string[] = [
  'chatterie',
  'cattery',
  'chenil',
  'mastiff',
  'elevage',
  'pension animale',
  'toilettage',
  'grossiste',
  'industriel',
  'froid industriel',
  'pompes funebres',
];

/**
 * Termes NON ambigus hors mission YOOTOO, testés sur le NOM + description AVANT la catégorie
 * brute → forcent veryLow même si Google promeut la catégorie (`ranch`/`farm`…). Corrige à la
 * racine les élevages animaliers, pensions, pompes funèbres et services techniques mal
 * catégorisés (ex. « Elevage EDEN » tagué `ranch` → sinon producteur/max).
 */
export const HARD_NEGATIVE_TERMS: readonly string[] = [
  'elevage',
  'eleveur',
  'chatterie',
  'cattery',
  'chenil',
  'canin',
  'felin',
  'chiot',
  'mastiff',
  'animal breeding',
  'pension canine',
  'pension feline',
  'pension animale',
  'toilettage',
  'pompes funebres',
  'funeraire',
];

/** Minuscule, sans accents ni diacritiques. Pure. */
function normalize(input: string | undefined | null): string {
  return (input ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

function firstTermTier(haystack: string): EditorialTier | null {
  if (MAX_TIER_TERMS.some((t) => haystack.includes(t))) return 'max';
  if (MEDIUM_TIER_TERMS.some((t) => haystack.includes(t))) return 'medium';
  if (LOW_TIER_TERMS.some((t) => haystack.includes(t))) return 'low';
  if (VERYLOW_TIER_TERMS.some((t) => haystack.includes(t))) return 'veryLow';
  return null;
}

/**
 * Résout le tier éditorial d'un commerce, en cascade :
 *   1. catégorie brute Google (`rawCategory`), puis `merchantType` — le plus fiable ;
 *   2. mots-clés du nom + description — rattrape les catégories génériques/absentes ;
 *   3. repli `medium` — jamais `veryLow` sans preuve.
 *
 * Fonction PURE et déterministe (aucune donnée du monde extérieur).
 */
export function resolveTier(
  rawCategory?: string | null,
  merchantType?: string | null,
  name?: string | null,
  description?: string | null,
): EditorialTier {
  const haystack = normalize(`${name ?? ''} ${description ?? ''}`);

  // 0. Garde-fou PRIORITAIRE : un nom/description clairement hors mission force veryLow AVANT
  //    toute promotion par la catégorie brute (corrige `ranch`/`farm` mal attribués par Google).
  if (haystack && HARD_NEGATIVE_TERMS.some((t) => haystack.includes(t))) return 'veryLow';

  const raw = normalize(rawCategory);
  if (raw && TIER_BY_RAW_CATEGORY[raw]) return TIER_BY_RAW_CATEGORY[raw];

  const type = normalize(merchantType);
  if (type && TIER_BY_RAW_CATEGORY[type]) return TIER_BY_RAW_CATEGORY[type];

  const byTerm = haystack ? firstTermTier(haystack) : null;
  if (byTerm) return byTerm;

  return DEFAULT_TIER;
}
