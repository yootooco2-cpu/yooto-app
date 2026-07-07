import { type ComponentProps } from 'react';
import { type Feather } from '@expo/vector-icons';

import { merchantCategoryById, type MerchantCategoryId } from './merchantCategoryFilters';
import type { Merchant } from './types';

/**
 * Navigation à DEUX niveaux (Niveau 1 = grandes familles, Niveau 2 = sous-catégories).
 *
 * Aucune donnée dupliquée : chaque famille REGROUPE des catégories existantes
 * (`MerchantCategoryId`) via l'union de leurs prédicats `match`. Les sous-catégories réutilisent
 * soit le `match` d'une catégorie existante, soit ce `match` affiné par un filtre texte (mêmes
 * champs que la recherche : nom, description, catégorie brute, tags). Le Discovery Engine n'est
 * jamais touché : on ne fait que POST-filtrer les commerces déjà chargés.
 */
export type FeatherName = ComponentProps<typeof Feather>['name'];
export type MerchantPredicate = (merchant: Merchant) => boolean;

export interface FamilyItem {
  id: string;
  label: string;
  match: MerchantPredicate;
}

export interface CategoryFamily {
  id: string;
  label: string;
  icon: FeatherName;
  /** Union des catégories membres → filtre carte quand la famille est ouverte (sans sous-cat). */
  match: MerchantPredicate;
  /** Sous-catégories affichées au Niveau 2. */
  items: FamilyItem[];
}

const FALSE: MerchantPredicate = () => false;
const catMatch = (id: MerchantCategoryId): MerchantPredicate => merchantCategoryById(id)?.match ?? FALSE;
const anyCat = (...ids: MerchantCategoryId[]): MerchantPredicate => (m) => ids.some((id) => catMatch(id)(m));

const norm = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
const haystack = (m: Merchant): string =>
  norm([m.name, m.description, m.rawCategory, m.rawMerchantType, ...(m.tags ?? [])].filter(Boolean).join(' '));
/** Affine un prédicat de base par une recherche texte (au moins un terme présent). */
const withText = (base: MerchantPredicate, ...terms: string[]): MerchantPredicate => {
  const needles = terms.map(norm);
  return (m) => base(m) && needles.some((t) => haystack(m).includes(t));
};
/** Prédicat purement TEXTUEL (indépendant de toute catégorie) — au moins un terme présent. */
const textMatch = (...terms: string[]): MerchantPredicate => withText(() => true, ...terms);

const item = (id: string, label: string, match: MerchantPredicate): FamilyItem => ({ id, label, match });

const RESTO = anyCat('restaurants', 'cafes');
const BIENETRE = anyCat('bienetre', 'sport');
const CULTURE = anyCat('culture', 'librairies');
const MOBILITE = anyCat('mobilite', 'transports');

/**
 * MÉTIERS D'ART — patrimoine vivant français. Structure VOLONTAIREMENT PLATE et extensible :
 * pour ajouter un métier, il suffit d'ajouter une entrée ici (id, label, mots-clés) — aucune autre
 * modification. Chaque métier est reconnu par recherche TEXTE transversale (nom / catégorie brute /
 * tags), indépendamment de la catégorie commerciale : un chocolatier ou un brasseur artisanal
 * remonte donc bien dans l'Artisanat, jamais confondu avec un commerce classique grâce à des
 * mots-clés métier précis. Critères YOOTOO : savoir-faire manuel, fabrication locale, création,
 * transmission, indépendants / TPE.
 */
export interface ArtisanMetier {
  id: string;
  label: string;
  /** Mots-clés (racines) reconnus dans le nom / la catégorie brute / les tags du commerce. */
  keywords: string[];
}

export const ARTISAN_METIERS: ArtisanMetier[] = [
  // Bois
  { id: 'ebenistes', label: 'Ébénistes', keywords: ['ebenist'] },
  { id: 'menuisiers', label: 'Menuisiers', keywords: ['menuisier', 'menuiserie'] },
  { id: 'charpentiers', label: 'Charpentiers', keywords: ['charpentier', 'charpente'] },
  { id: 'restaurateurs-meubles', label: 'Restaurateurs de meubles', keywords: ['restauration de meuble', 'restaurateur de meuble', 'renovation de meuble'] },
  { id: 'createurs-mobilier', label: 'Créateurs de mobilier', keywords: ['createur de mobilier', 'mobilier sur mesure', 'mobilier d art'] },
  { id: 'vanniers', label: 'Vanniers', keywords: ['vannier', 'vannerie'] },
  { id: 'rempailleurs', label: 'Rempailleurs', keywords: ['rempailleur', 'rempaillage', 'cannage'] },
  // Métal
  { id: 'ferronniers', label: "Ferronniers d'art", keywords: ['ferronnier', 'ferronnerie'] },
  { id: 'forgerons', label: 'Forgerons', keywords: ['forgeron', 'forge'] },
  { id: 'couteliers', label: 'Couteliers', keywords: ['coutelier', 'coutellerie'] },
  { id: 'orfevres', label: 'Orfèvres', keywords: ['orfevre', 'orfevrerie'] },
  // Terre & feu
  { id: 'ceramistes', label: 'Céramistes', keywords: ['ceramiste', 'ceramique'] },
  { id: 'potiers', label: 'Potiers', keywords: ['potier', 'poterie'] },
  { id: 'verriers', label: 'Verriers', keywords: ['verrier', 'verrerie'] },
  { id: 'souffleurs-verre', label: 'Souffleurs de verre', keywords: ['souffleur de verre', 'verre souffle'] },
  { id: 'mosaistes', label: 'Mosaïstes', keywords: ['mosaiste', 'mosaique'] },
  // Arts visuels
  { id: 'sculpteurs', label: 'Sculpteurs', keywords: ['sculpteur', 'sculpture'] },
  { id: 'peintres-art', label: "Peintres d'art", keywords: ["peintre d art", 'peintre-artiste', 'atelier de peinture'] },
  { id: 'illustrateurs', label: 'Illustrateurs', keywords: ['illustrateur', 'illustration'] },
  { id: 'photographes', label: 'Photographes', keywords: ['photographe', 'photographie'] },
  { id: 'encadreurs', label: 'Encadreurs', keywords: ['encadreur', 'encadrement'] },
  { id: 'restaurateurs-oeuvres', label: "Restaurateurs d'œuvres d'art", keywords: ["restauration d oeuvre", "restaurateur d art", 'restauration de tableau'] },
  // Textile & cuir
  { id: 'tapissiers', label: 'Tapissiers', keywords: ['tapissier', 'tapisserie'] },
  { id: 'selliers', label: 'Selliers', keywords: ['sellier', 'sellerie'] },
  { id: 'maroquiniers', label: 'Maroquiniers', keywords: ['maroquinier', 'maroquinerie'] },
  { id: 'tisserands', label: 'Tisserands', keywords: ['tisserand', 'tissage'] },
  { id: 'tailleurs', label: 'Tailleurs', keywords: ['tailleur de costume', 'tailleur sur mesure'] },
  { id: 'couturiers', label: 'Couturiers', keywords: ['couturier', 'couture', 'atelier de couture'] },
  { id: 'modistes', label: 'Modistes', keywords: ['modiste', 'chapelier', 'chapellerie'] },
  { id: 'brodeurs', label: 'Brodeurs', keywords: ['brodeur', 'broderie'] },
  // Précision
  { id: 'luthiers', label: 'Luthiers', keywords: ['luthier', 'lutherie'] },
  { id: 'facteurs-instruments', label: "Facteurs d'instruments", keywords: ['facteur d instrument', "facteur d orgue", 'manufacture d instrument'] },
  { id: 'bijoutiers-artisans', label: 'Bijoutiers artisans', keywords: ['bijoutier', 'joaillier', 'joaillerie', 'bijou artisanal'] },
  { id: 'horlogers', label: 'Horlogers', keywords: ['horloger', 'horlogerie'] },
  // Senteurs & goût artisanal
  { id: 'savonniers', label: 'Savonniers', keywords: ['savonnier', 'savonnerie', 'savon artisanal'] },
  { id: 'parfumeurs-artisans', label: 'Parfumeurs artisans', keywords: ['parfumeur', 'parfum artisanal', 'parfumerie artisanale'] },
  { id: 'bougies-artisanales', label: 'Bougies artisanales', keywords: ['bougie artisanale', 'cirier', 'fabrique de bougie'] },
  { id: 'chocolatiers-artisans', label: 'Chocolatiers artisans', keywords: ['chocolatier', 'chocolaterie'] },
  { id: 'torrefacteurs', label: 'Torréfacteurs', keywords: ['torrefacteur', 'torrefaction'] },
  { id: 'brasseurs-artisanaux', label: 'Brasseurs artisanaux', keywords: ['brasseur', 'microbrasserie', 'brasserie artisanale'] },
  { id: 'distillateurs', label: 'Distillateurs', keywords: ['distillateur', 'distillerie'] },
  { id: 'apiculteurs', label: 'Apiculteurs', keywords: ['apiculteur', 'apiculture', 'miel'] },
  // Lumière
  { id: 'createurs-luminaires', label: 'Créateurs de luminaires', keywords: ['createur de luminaire', 'luminaire d art', 'luminaire artisanal'] },
];

/** Un commerce est « artisan » s'il porte un mot-clé métier OU relève de la catégorie artisanat. */
const ARTISAN_KEYWORDS: string[] = ARTISAN_METIERS.flatMap((m) => m.keywords);
const artisanMatch: MerchantPredicate = (m) => catMatch('artisanat')(m) || textMatch(...ARTISAN_KEYWORDS)(m);

/**
 * Les 7 familles (Niveau 1) + « Tous » géré à part par le composant. « Plus » regroupe les
 * catégories restantes (nature / autres) qui n'entrent pas dans les familles principales.
 */
export const CATEGORY_FAMILIES: CategoryFamily[] = [
  {
    id: 'alimentation',
    label: 'Alimentation',
    icon: 'shopping-bag',
    match: anyCat(
      'producteurs', 'boulangeries', 'primeurs', 'fromageries', 'boucheries', 'poissonneries',
      'epiceries', 'traiteurs', 'patisseries', 'marches', 'cavistes', 'cooperatives',
    ),
    items: [
      item('producteurs', 'Producteurs', catMatch('producteurs')),
      item('boulangeries', 'Boulangeries', catMatch('boulangeries')),
      item('primeurs', 'Primeurs', catMatch('primeurs')),
      item('fromageries', 'Fromageries', catMatch('fromageries')),
      item('boucheries', 'Boucheries', catMatch('boucheries')),
      item('poissonneries', 'Poissonneries', catMatch('poissonneries')),
      item('epiceries', 'Épiceries', catMatch('epiceries')),
      item('traiteurs', 'Traiteurs', catMatch('traiteurs')),
      item('patisseries', 'Pâtisseries', catMatch('patisseries')),
      item('marches', 'Marchés', catMatch('marches')),
      item('cavistes', 'Cavistes', catMatch('cavistes')),
    ],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: 'coffee',
    match: RESTO,
    items: [
      item('francaise', 'Cuisine française', withText(catMatch('restaurants'), 'francais', 'france')),
      item('italienne', 'Italienne', withText(RESTO, 'italien', 'pizza', 'pizzeria', 'pasta')),
      item('asiatique', 'Asiatique', withText(RESTO, 'asiat', 'japonais', 'sushi', 'chinois', 'thai', 'vietnam', 'wok')),
      item('street', 'Street food', withText(RESTO, 'street', 'food truck', 'burger', 'kebab', 'tacos')),
      item('brasseries', 'Brasseries', withText(RESTO, 'brasserie', 'bistrot')),
      item('bars-cafes', 'Bars / Cafés', catMatch('cafes')),
      item('vegetarien', 'Végétarien / Vegan', withText(RESTO, 'vegetarien', 'vegan', 'veggie')),
    ],
  },
  {
    id: 'bienetre',
    label: 'Bien-être',
    icon: 'heart',
    match: BIENETRE,
    items: [
      item('coiffeurs', 'Coiffeurs', withText(catMatch('bienetre'), 'coiffeur', 'coiffure', 'barbier')),
      item('instituts', 'Instituts', withText(catMatch('bienetre'), 'institut', 'esthetique', 'beaute')),
      item('massages', 'Massages', withText(catMatch('bienetre'), 'massage', 'spa', 'detente')),
      item('fitness', 'Fitness / Yoga', withText(BIENETRE, 'yoga', 'fitness', 'salle', 'sport', 'pilates')),
      item('bienetre', 'Bien-être', catMatch('bienetre')),
    ],
  },
  {
    // Artisanat = MÉTIERS D'ART (patrimoine vivant français), pas des boutiques. Sous-catégories
    // générées depuis `ARTISAN_METIERS` → ajouter un métier = ajouter une entrée, rien d'autre.
    id: 'artisanat',
    label: 'Artisanat',
    icon: 'tool',
    match: artisanMatch,
    items: ARTISAN_METIERS.map((me) => item(me.id, me.label, textMatch(...me.keywords))),
  },
  {
    id: 'culture',
    label: 'Culture',
    icon: 'book-open',
    match: CULTURE,
    items: [
      item('librairies', 'Librairies', catMatch('librairies')),
      item('musees', 'Musées', withText(catMatch('culture'), 'musee', 'museum')),
      item('galeries', 'Galeries', withText(catMatch('culture'), 'galerie', 'exposition', 'expo')),
      item('cinemas', 'Cinémas', withText(catMatch('culture'), 'cinema', 'cine')),
      item('spectacles', 'Spectacles', withText(catMatch('culture'), 'spectacle', 'theatre', 'concert', 'salle')),
    ],
  },
  {
    id: 'mobilite',
    label: 'Mobilité',
    icon: 'navigation',
    match: MOBILITE,
    items: [
      item('velo', 'Vélo', withText(MOBILITE, 'velo', 'cycle', 'bike')),
      item('transports', 'Transports', catMatch('transports')),
      item('parking', 'Parking', withText(MOBILITE, 'parking', 'stationnement')),
      item('recharge', 'Recharge électrique', withText(MOBILITE, 'recharge', 'borne', 'electrique', 'charge')),
      item('autopartage', 'Auto-partage', withText(MOBILITE, 'partage', 'location', 'autopartage')),
      item('mobilite', 'Mobilité douce', catMatch('mobilite')),
    ],
  },
  {
    id: 'plus',
    label: 'Plus',
    icon: 'more-horizontal',
    match: anyCat('nature', 'autres'),
    items: [
      item('nature', 'Nature', catMatch('nature')),
      item('autres', 'Autres', catMatch('autres')),
    ],
  },
];

export function categoryFamilyById(id: string | null): CategoryFamily | null {
  if (!id) return null;
  return CATEGORY_FAMILIES.find((f) => f.id === id) ?? null;
}
