import type { IntentDefinition } from './types';

/**
 * Dictionnaire d'intentions — MODULAIRE.
 * Ajouter une intention = ajouter un objet ici (quelques lignes), rien d'autre.
 * `categories` = buckets canoniques ; `keywords` = matchés sur nom/description
 * (élargissement au-delà de la correspondance littérale).
 */
export const INTENTS: IntentDefinition[] = [
  {
    key: 'pain',
    aliases: ['pain', 'baguette', 'viennoiserie', 'viennoiseries', 'croissant', 'boulangerie'],
    categories: ['shop'],
    keywords: ['boulang', 'pain', 'patiss', 'viennois', 'croissant', 'fournil'],
  },
  {
    key: 'barbecue',
    aliases: ['barbecue', 'bbq', 'grillade', 'grillades'],
    categories: ['producer', 'grocery', 'shop'],
    keywords: ['bouch', 'viande', 'primeur', 'caviste', 'vin', 'fromage', 'boulang'],
  },
  {
    key: 'cadeau',
    aliases: ['cadeau', 'cadeaux', 'offrir'],
    categories: ['shop', 'producer'],
    keywords: ['fleur', 'chocolat', 'artisan', 'caviste', 'vin', 'bijou', 'librairie', 'livre'],
  },
  {
    key: 'apero',
    aliases: ['apero', 'apéro', 'aperitif', 'apéritif'],
    categories: ['producer', 'grocery', 'restaurant', 'shop'],
    keywords: ['caviste', 'vin', 'biere', 'fromage', 'traiteur', 'charcut', 'chocolat'],
  },
  {
    key: 'ce-soir',
    aliases: ['ce soir', 'diner', 'dîner', 'restaurant', 'manger'],
    categories: ['restaurant'],
    keywords: ['restaurant', 'bar', 'bistro', 'cafe', 'traiteur', 'caviste'],
  },
];
