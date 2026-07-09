import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';

import type { ActivityKind } from './types';

type FeatherName = ComponentProps<typeof Feather>['name'];

/** Étiquette raffinée d'un type de publication (chip) : libellé court + icône Feather monochrome. */
export interface ActivityKindChip {
  label: string;
  icon: FeatherName;
}

/**
 * Type de publication → chip discrète (langage visuel des catégories : icône Feather + libellé,
 * teintés de l'accent de la catégorie par le composant). Remplace les gros emojis décoratifs :
 * l'utilisateur identifie le type d'un coup d'œil, sans que cela vole la vedette au commerçant.
 * PRÉSENTATION uniquement — aucune logique métier (le `kind` reste la source de vérité).
 */
const CHIPS: Record<ActivityKind, ActivityKindChip> = {
  arrivage: { label: 'Arrivage', icon: 'package' },
  produit: { label: 'Nouveauté', icon: 'star' },
  offre: { label: 'Offre', icon: 'tag' },
  evenement: { label: 'Événement', icon: 'calendar' },
  degustation: { label: 'Dégustation', icon: 'coffee' },
  concert: { label: 'Concert', icon: 'music' },
  sortie: { label: 'Sortie', icon: 'compass' },
  marche: { label: 'Marché', icon: 'shopping-bag' },
  recolte: { label: 'Récolte', icon: 'sun' },
  ouverture: { label: 'Ouverture', icon: 'unlock' },
  fermeture: { label: 'Information', icon: 'info' },
  benevolat: { label: 'Entraide', icon: 'heart' },
  nouveau_pro: { label: 'Nouveauté', icon: 'star' },
  annonce: { label: 'Information', icon: 'info' },
};

const FALLBACK: ActivityKindChip = { label: 'Actualité', icon: 'zap' };

/** Chip d'un type de publication (jamais nul : repli neutre si un futur `kind` n'est pas mappé). */
export function activityKindChip(kind: ActivityKind): ActivityKindChip {
  return CHIPS[kind] ?? FALLBACK;
}
