import { type ComponentProps } from 'react';
import { type Feather } from '@expo/vector-icons';

import type { CryptogramId } from './cryptograms';
import { merchantCategoryById, type MerchantCategoryId } from './merchantCategoryFilters';
import type { Merchant } from './types';

/**
 * Modèle de navigation catégories en ARBRE (N niveaux). Un `CategoryNode` est soit une BRANCHE
 * (a des `children` → on descend d'un niveau), soit une FEUILLE (a un `match` → filtre les
 * commerces). Un nœud peut avoir les deux : `match` = union de la branche (filtre appliqué quand
 * on l'ouvre). Aucune donnée dupliquée : les prédicats regroupent des catégories existantes ou un
 * filtre texte transversal. Le Discovery Engine n'est jamais touché : on POST-filtre uniquement.
 *
 * Structure générique et réutilisable pour toute famille à plusieurs niveaux (Artisanat →
 * familles → métiers ; extensible demain à Culture, Bien-être, Mobilité…).
 */
export type FeatherName = ComponentProps<typeof Feather>['name'];
export type MerchantPredicate = (merchant: Merchant) => boolean;

export interface CategoryNode {
  id: string;
  label: string;
  /** Icône Feather (nœuds de 1er niveau — grandes familles). */
  icon?: FeatherName;
  /** Cryptogramme YOOTOO existant (asset résolu par le composant — couche données sans image). */
  iconId?: CryptogramId;
  /** Clé de pictogramme dédié (registres restaurants/bienetre/artisanat), résolu par le composant. */
  pictoKey?: string;
  /** Touche de couleur d'accent (halo discret aux états actif/hover). */
  accent?: string;
  /** Prédicat de filtrage (feuille = spécifique ; branche = union appliquée à l'ouverture). */
  match?: MerchantPredicate;
  /** Sous-niveau (branche). Absent = feuille. */
  children?: CategoryNode[];
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
/** OU de deux prédicats. */
const either = (a: MerchantPredicate, b: MerchantPredicate): MerchantPredicate => (m) => a(m) || b(m);

const item = (id: string, label: string, match: MerchantPredicate): CategoryNode => ({ id, label, match });
/** Feuille ADOSSÉE à une catégorie existante : réutilise son `match` ET son cryptogramme. */
const catItem = (id: MerchantCategoryId, label: string): CategoryNode => ({
  id,
  label,
  match: catMatch(id),
  iconId: merchantCategoryById(id)?.icon,
});
/** Feuille avec pictogramme dédié (registre) + accent, prédicat fourni. */
const pItem = (id: string, label: string, accent: string, match: MerchantPredicate): CategoryNode => ({
  id,
  label,
  match,
  pictoKey: id,
  accent,
});
/** Feuille avec pictogramme dédié + accent + prédicat TEXTE (métier transversal). */
const kItem = (id: string, label: string, accent: string, keywords: string[]): CategoryNode => ({
  id,
  label,
  match: textMatch(...keywords),
  pictoKey: id,
  accent,
});

const RESTO = anyCat('restaurants', 'cafes');
const BIENETRE = anyCat('bienetre', 'sport');
const CULTURE = anyCat('culture', 'librairies');
const MOBILITE = anyCat('mobilite', 'transports');

/**
 * BIEN-ÊTRE — métiers (soin, mouvement, santé douce, modification corporelle). Structure plate
 * extensible (id = pictogramme, label, accent = couleur du badge, mots-clés). Reconnaissance TEXTE
 * transversale (indépendante de la catégorie commerciale).
 */
interface WellnessMetier {
  id: string;
  label: string;
  accent: string;
  keywords: string[];
}

const BIENETRE_METIERS: WellnessMetier[] = [
  { id: 'spa-hammam', label: 'Spa & Hammam', accent: '#3EA79F', keywords: ['spa', 'hammam', 'sauna', 'balneo', 'thermes'] },
  { id: 'fitness', label: 'Fitness', accent: '#DD6145', keywords: ['fitness', 'musculation', 'salle de sport', 'gym', 'crossfit', 'remise en forme'] },
  { id: 'yoga', label: 'Yoga', accent: '#699E57', keywords: ['yoga'] },
  { id: 'pilates', label: 'Pilates', accent: '#61ACC4', keywords: ['pilates'] },
  { id: 'coaching-sportif', label: 'Coaching sportif', accent: '#DC7B11', keywords: ['coach sportif', 'coaching', 'personal trainer', 'preparateur physique'] },
  { id: 'naturopathie', label: 'Naturopathie', accent: '#7CAF56', keywords: ['naturopathe', 'naturopathie'] },
  { id: 'tatoueur', label: 'Tatoueur', accent: '#7E5799', keywords: ['tatoueur', 'tatouage', 'tattoo'] },
  { id: 'perceur', label: 'Perceur', accent: '#DC648A', keywords: ['perceur', 'piercing', 'percage'] },
];
const BIENETRE_KEYWORDS: string[] = BIENETRE_METIERS.flatMap((m) => m.keywords);
const bienetreMatch: MerchantPredicate = either(BIENETRE, textMatch(...BIENETRE_KEYWORDS));

/**
 * ARTISANAT — navigation à 3 niveaux : Artisanat → FAMILLES (11, avec cryptogramme dédié) →
 * MÉTIERS. Structure plate et extensible : ajouter une famille = une entrée ; ajouter un métier =
 * une ligne. Chaque famille regroupe ses métiers (union de mots-clés) ; reconnaissance TEXTE
 * transversale (un artisan remonte quelle que soit sa catégorie Google).
 */
type MetierDef = [id: string, label: string, keywords: string[]];
interface ArtisanatFamilyDef {
  id: string;
  label: string;
  accent: string;
  metiers: MetierDef[];
}

const ARTISANAT_FAMILIES: ArtisanatFamilyDef[] = [
  {
    id: 'art-du-bois', label: 'Art du bois', accent: '#AA6427',
    metiers: [
      ['ebeniste', 'Ébéniste', ['ebenist']],
      ['menuisier', 'Menuisier', ['menuisier', 'menuiserie']],
      ['charpentier', 'Charpentier', ['charpentier', 'charpente']],
      ['tourneur-bois', 'Tourneur sur bois', ['tourneur sur bois', 'tournage sur bois']],
      ['sculpteur-bois', 'Sculpteur sur bois', ['sculpteur sur bois', 'sculpture sur bois']],
      ['luthier', 'Luthier', ['luthier', 'lutherie']],
      ['encadreur', 'Encadreur', ['encadreur', 'encadrement']],
    ],
  },
  {
    id: 'art-du-metal', label: 'Art du métal', accent: '#6F7882',
    metiers: [
      ['ferronnier', "Ferronnier d'art", ['ferronnier', 'ferronnerie']],
      ['forgeron', 'Forgeron', ['forgeron', 'forge']],
      ['coutelier', 'Coutelier', ['coutelier', 'coutellerie']],
      ['chaudronnier', "Chaudronnier d'art", ['chaudronnier', 'chaudronnerie']],
      ['serrurier-art', "Serrurier d'art", ['serrurier d art', 'serrurerie d art']],
      ['dinandier', 'Dinandier', ['dinandier', 'dinanderie']],
    ],
  },
  {
    id: 'art-de-la-pierre', label: 'Art de la pierre', accent: '#9D8366',
    metiers: [
      ['tailleur-pierre', 'Tailleur de pierre', ['tailleur de pierre', 'taille de pierre']],
      ['marbrier', 'Marbrier', ['marbrier', 'marbrerie']],
      ['sculpteur-pierre', 'Sculpteur sur pierre', ['sculpteur sur pierre', 'sculpture sur pierre']],
      ['graveur-pierre', 'Graveur', ['graveur', 'gravure']],
    ],
  },
  {
    id: 'terre-ceramique', label: 'Terre & Céramique', accent: '#BF693A',
    metiers: [
      ['potier', 'Potier', ['potier', 'poterie']],
      ['ceramiste', 'Céramiste', ['ceramiste', 'ceramique']],
      ['faiencier', 'Faïencier', ['faiencier', 'faience']],
      ['porcelainier', 'Porcelainier', ['porcelainier', 'porcelaine']],
    ],
  },
  {
    id: 'textile-cuir', label: 'Textile & Cuir', accent: '#873629',
    metiers: [
      ['tapissier', 'Tapissier', ['tapissier', 'tapisserie']],
      ['sellier', 'Sellier', ['sellier', 'sellerie']],
      ['maroquinier', 'Maroquinier', ['maroquinier', 'maroquinerie']],
      ['tisserand', 'Tisserand', ['tisserand', 'tissage']],
      ['brodeur', 'Brodeur', ['brodeur', 'broderie']],
      ['couturier-art', "Couturier d'art", ['couturier', 'couture', 'atelier de couture']],
      ['modiste', 'Modiste', ['modiste', 'chapelier', 'chapellerie']],
    ],
  },
  {
    id: 'bijouterie-joaillerie', label: 'Bijouterie & Joaillerie', accent: '#D7992D',
    metiers: [
      ['bijoutier', 'Bijoutier', ['bijoutier', 'bijouterie']],
      ['joaillier', 'Joaillier', ['joaillier', 'joaillerie']],
      ['horloger', 'Horloger', ['horloger', 'horlogerie']],
      ['orfevre', 'Orfèvre', ['orfevre', 'orfevrerie']],
      ['graveur-precieux', 'Graveur sur métaux précieux', ['graveur sur metaux', 'glyptique']],
    ],
  },
  {
    id: 'verre-vitrail', label: 'Verre & Vitrail', accent: '#386198',
    metiers: [
      ['souffleur-verre', 'Souffleur de verre', ['souffleur de verre', 'verre souffle']],
      ['verrier', 'Verrier', ['verrier', 'verrerie']],
      ['maitre-verrier', 'Maître verrier', ['maitre verrier']],
      ['vitrailliste', 'Vitrailliste', ['vitrailliste', 'vitrail']],
    ],
  },
  {
    id: 'arts-decoratifs', label: 'Arts décoratifs', accent: '#754489',
    metiers: [
      ['peintre-decorateur', 'Peintre décorateur', ['peintre decorateur', 'decor peint']],
      ['doreur', 'Doreur', ['doreur', 'dorure']],
      ['mosaiste', 'Mosaïste', ['mosaiste', 'mosaique']],
      ['fresquiste', 'Fresquiste', ['fresquiste', 'fresque']],
    ],
  },
  {
    id: 'restauration-patrimoine', label: 'Restauration & Patrimoine', accent: '#AB8456',
    metiers: [
      ['restaurateur-meubles', 'Restaurateur de meubles', ['restauration de meuble', 'restaurateur de meuble']],
      ['restaurateur-oeuvres', "Restaurateur d'œuvres d'art", ['restauration d oeuvre', "restaurateur d art"]],
      ['relieur', 'Relieur', ['relieur', 'reliure']],
      ['conservateur', 'Conservateur-restaurateur', ['conservateur', 'conservation restauration']],
    ],
  },
  {
    id: 'art-de-la-table', label: 'Art de la table', accent: '#C26221',
    metiers: [
      ['coutelier-table', 'Coutelier artisanal', ['coutelier', 'coutellerie']],
      ['fabricant-ustensiles', "Fabricant d'ustensiles", ['ustensile', 'fabricant d ustensile']],
      ['tourneur-objets', "Tourneur d'objets", ['tourneur sur metal', 'tournage d objet']],
      ['createur-table', "Créateur d'arts de la table", ['arts de la table', 'art de la table']],
    ],
  },
  {
    id: 'creations-artisanales', label: 'Créations artisanales', accent: '#CD7E13',
    metiers: [
      ['savonnier', 'Savonnier', ['savonnier', 'savonnerie', 'savon artisanal']],
      ['cirier', 'Cirier', ['cirier', 'cire']],
      ['fabricant-bougies', 'Fabricant de bougies', ['bougie', 'fabrique de bougie']],
      ['parfumeur', 'Parfumeur artisanal', ['parfumeur', 'parfum artisanal']],
    ],
  },
];

/** Nœuds FAMILLES d'artisanat (Niveau 2) : cryptogramme dédié + accent + enfants (métiers). */
const artisanatChildren: CategoryNode[] = ARTISANAT_FAMILIES.map((f) => ({
  id: f.id,
  label: f.label,
  pictoKey: f.id,
  accent: f.accent,
  match: textMatch(...f.metiers.flatMap((mt) => mt[2])),
  children: f.metiers.map(([id, label, kw]) => item(id, label, textMatch(...kw))),
}));
const ARTISANAT_KEYWORDS: string[] = ARTISANAT_FAMILIES.flatMap((f) => f.metiers.flatMap((mt) => mt[2]));
const artisanatMatch: MerchantPredicate = either(catMatch('artisanat'), textMatch(...ARTISANAT_KEYWORDS));

/**
 * Grandes familles (Niveau 1) + « Tous » géré à part par le composant. Chaque famille est une
 * BRANCHE (`children`). « Plus » regroupe les catégories restantes (nature / autres).
 */
export const CATEGORY_FAMILIES: CategoryNode[] = [
  {
    id: 'alimentation',
    label: 'Alimentation',
    icon: 'shopping-bag',
    match: anyCat(
      'producteurs', 'boulangeries', 'primeurs', 'fromageries', 'boucheries', 'poissonneries',
      'epiceries', 'traiteurs', 'patisseries', 'marches', 'cavistes', 'cooperatives',
    ),
    children: [
      catItem('producteurs', 'Producteurs'),
      catItem('boulangeries', 'Boulangeries'),
      catItem('primeurs', 'Primeurs'),
      catItem('fromageries', 'Fromageries'),
      catItem('boucheries', 'Boucheries'),
      catItem('poissonneries', 'Poissonneries'),
      catItem('epiceries', 'Épiceries'),
      catItem('traiteurs', 'Traiteurs'),
      catItem('patisseries', 'Pâtisseries'),
      catItem('marches', 'Marchés'),
      catItem('cavistes', 'Cavistes'),
    ],
  },
  {
    id: 'restaurants',
    label: 'Restaurants',
    icon: 'coffee',
    match: RESTO,
    children: [
      pItem('tous', 'Tous les restaurants', '#C79A3B', RESTO),
      pItem('francaise', 'Cuisine française', '#4E6A93', withText(RESTO, 'francais', 'france')),
      pItem('italienne', 'Cuisine italienne', '#B24A3B', withText(RESTO, 'italien', 'pizza', 'pizzeria', 'pasta', 'trattoria')),
      pItem('asiatique', 'Cuisine asiatique', '#3E6E9C', withText(RESTO, 'asiat', 'japonais', 'sushi', 'chinois', 'thai', 'vietnam', 'wok', 'coreen', 'ramen')),
      pItem('street', 'Street Food', '#B8863B', withText(RESTO, 'street', 'food truck', 'burger', 'kebab', 'tacos', 'snack')),
      pItem('grill', 'Grill / Viandes', '#C4632B', withText(RESTO, 'grill', 'viande', 'barbecue', 'steak', 'rotisserie', 'grillade')),
      pItem('vegetarien', 'Végétarien / Vegan', '#4E8A54', withText(RESTO, 'vegetarien', 'vegan', 'veggie', 'vegetal')),
      pItem('bars-cafes', 'Bars / Cafés', '#7B4B2A', either(catMatch('cafes'), withText(RESTO, 'bar', 'pub', 'cave a vin'))),
      pItem('brasseries', 'Brasseries / Bistrots', '#C08A2E', withText(RESTO, 'brasserie', 'bistrot', 'taverne', 'biere')),
      pItem('fast-casual', 'Fast Casual', '#C4632B', withText(RESTO, 'fast', 'rapide', 'casual', 'comptoir')),
      pItem('healthy', 'Healthy Bowls', '#4E8A54', withText(RESTO, 'healthy', 'bowl', 'poke', 'salade', 'detox')),
      pItem('desserts', 'Pâtisseries / Desserts', '#6C5B8B', either(catMatch('patisseries'), withText(RESTO, 'dessert', 'glace', 'creperie'))),
      pItem('monde', 'Cuisines du monde', '#2C4A6E', withText(RESTO, 'monde', 'world', 'libanais', 'mexicain', 'indien', 'marocain', 'turc', 'oriental', 'africain')),
    ],
  },
  {
    id: 'bienetre',
    label: 'Bien-être',
    icon: 'heart',
    match: bienetreMatch,
    children: BIENETRE_METIERS.map((m) => kItem(m.id, m.label, m.accent, m.keywords)),
  },
  {
    // Artisanat = 3 niveaux (familles → métiers). Cryptogrammes de familles dédiés.
    id: 'artisanat',
    label: 'Artisanat',
    icon: 'tool',
    match: artisanatMatch,
    children: artisanatChildren,
  },
  {
    id: 'culture',
    label: 'Culture',
    icon: 'book-open',
    match: CULTURE,
    children: [
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
    children: [
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
    children: [
      item('nature', 'Nature', catMatch('nature')),
      item('autres', 'Autres', catMatch('autres')),
    ],
  },
];

export function categoryFamilyById(id: string | null): CategoryNode | null {
  if (!id) return null;
  return CATEGORY_FAMILIES.find((f) => f.id === id) ?? null;
}
