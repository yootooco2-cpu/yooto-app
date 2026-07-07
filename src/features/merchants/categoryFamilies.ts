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

const item = (id: string, label: string, match: MerchantPredicate): FamilyItem => ({ id, label, match });

const RESTO = anyCat('restaurants', 'cafes');
const BIENETRE = anyCat('bienetre', 'sport');
const ART = anyCat('artisanat', 'fleuristes');
const CULTURE = anyCat('culture', 'librairies');
const MOBILITE = anyCat('mobilite', 'transports');

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
    id: 'artisanat',
    label: 'Artisanat',
    icon: 'tool',
    match: ART,
    items: [
      item('artisans', 'Artisans', withText(catMatch('artisanat'), 'artisan')),
      item('bijouteries', 'Bijouteries', withText(catMatch('artisanat'), 'bijou', 'joaillerie')),
      item('decoration', 'Décoration', withText(ART, 'deco', 'decoration', 'maison')),
      item('ceramique', 'Céramique', withText(catMatch('artisanat'), 'ceramique', 'poterie')),
      item('textile', 'Textile', withText(catMatch('artisanat'), 'textile', 'couture', 'retouche')),
      item('fleuristes', 'Fleuristes', catMatch('fleuristes')),
    ],
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
