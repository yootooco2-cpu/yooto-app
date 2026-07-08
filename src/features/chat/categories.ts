import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

type FeatherName = ComponentProps<typeof Feather>['name'];

export interface ChatCategory {
  id: string;
  label: string;
  icon: FeatherName;
  /** Accent chaleureux propre à la catégorie (identité vivante du fil). */
  accent: string;
}

/**
 * Catégories de la « place du village » — ARCHITECTURE ÉVOLUTIVE : ajouter/retirer une entrée
 * suffit (aucun écran à toucher). Chaque catégorie porte sa couleur → filtres et cartes colorés,
 * pour une section chaleureuse et lisible d'un coup d'œil.
 */
export const CHAT_CATEGORIES: ChatCategory[] = [
  { id: 'vie-locale', label: 'Vie locale', icon: 'home', accent: '#C6553F' },
  { id: 'bons-plans', label: 'Bons plans', icon: 'tag', accent: '#E7B654' },
  { id: 'questions', label: 'Questions', icon: 'help-circle', accent: '#3E86A8' },
  { id: 'evenements', label: 'Événements', icon: 'calendar', accent: '#B5533A' },
  { id: 'producteurs', label: 'Producteurs', icon: 'sun', accent: '#6E7F41' },
  { id: 'restaurants', label: 'Restaurants', icon: 'coffee', accent: '#B08A50' },
  { id: 'artisanat', label: 'Artisanat', icon: 'tool', accent: '#9E4A34' },
  { id: 'culture', label: 'Culture', icon: 'book-open', accent: '#8A5AA8' },
  { id: 'mobilite', label: 'Mobilité', icon: 'navigation', accent: '#3E7CB1' },
  { id: 'entraide', label: 'Entraide', icon: 'heart', accent: '#D9645A' },
  { id: 'emploi', label: 'Emploi', icon: 'briefcase', accent: '#5A7D6A' },
  { id: 'famille', label: 'Famille', icon: 'users', accent: '#D98B6F' },
  { id: 'sport', label: 'Sport', icon: 'activity', accent: '#4E9A6B' },
  { id: 'nature', label: 'Nature', icon: 'feather', accent: '#6E8E4E' },
];

/** Accès rapide à une catégorie par id (couleur/icône pour cartes & filtres). */
export function chatCategoryById(id: string | undefined): ChatCategory | undefined {
  return id ? CHAT_CATEGORIES.find((c) => c.id === id) : undefined;
}
