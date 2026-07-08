import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

type FeatherName = ComponentProps<typeof Feather>['name'];

export interface ChatCategory {
  id: string;
  label: string;
  icon: FeatherName;
}

/**
 * Catégories de discussion du CHAT — ARCHITECTURE ÉVOLUTIVE : ajouter/retirer une entrée suffit,
 * aucun écran à modifier. Alignées sur les grandes familles YOOTOO (vie locale, commerce,
 * producteurs, artisanat…) + rubriques transverses (bons plans, questions, événements, emploi).
 */
export const CHAT_CATEGORIES: ChatCategory[] = [
  { id: 'general', label: 'Discussions générales', icon: 'message-square' },
  { id: 'bons-plans', label: 'Bons plans', icon: 'tag' },
  { id: 'questions', label: 'Questions', icon: 'help-circle' },
  { id: 'evenements', label: 'Événements', icon: 'calendar' },
  { id: 'emploi', label: 'Emploi', icon: 'briefcase' },
  { id: 'producteurs', label: 'Producteurs', icon: 'sun' },
  { id: 'artisanat', label: 'Artisanat', icon: 'tool' },
  { id: 'restaurants', label: 'Restaurants', icon: 'coffee' },
  { id: 'culture', label: 'Culture', icon: 'book-open' },
  { id: 'mobilite', label: 'Mobilité', icon: 'navigation' },
  { id: 'bien-etre', label: 'Bien-être', icon: 'heart' },
];
