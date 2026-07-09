import type { CryptoId } from './components/PublicationCrypto';
import type { ActivityKind } from './types';

/** Étiquette raffinée d'un type de publication (chip) : libellé court + cryptogramme éditorial. */
export interface ActivityKindChip {
  label: string;
  crypto: CryptoId;
}

/**
 * Type de publication → chip discrète (libellé + cryptogramme YOOTOO, teinté de l'accent de la
 * catégorie par le composant). Les cryptogrammes remplacent les icônes Feather : signature visuelle
 * propriétaire, reconnaissable d'un coup d'œil. PRÉSENTATION uniquement — aucune logique métier
 * (le `kind` reste la source de vérité).
 */
const CHIPS: Record<ActivityKind, ActivityKindChip> = {
  arrivage: { label: 'Arrivage', crypto: 'arrivage' },
  produit: { label: 'Nouveauté', crypto: 'nouveaute' },
  offre: { label: 'Offre', crypto: 'offre' },
  evenement: { label: 'Événement', crypto: 'evenement' },
  degustation: { label: 'Dégustation', crypto: 'degustation' },
  concert: { label: 'Événement', crypto: 'evenement' },
  sortie: { label: 'Sortie', crypto: 'evenement' },
  marche: { label: 'Marché', crypto: 'marche' },
  recolte: { label: 'Récolte', crypto: 'recolte' },
  ouverture: { label: 'Ouverture', crypto: 'ouverture' },
  fermeture: { label: 'Information', crypto: 'information' },
  benevolat: { label: 'Engagement', crypto: 'engagement' },
  nouveau_pro: { label: 'Ouverture', crypto: 'ouverture' },
  annonce: { label: 'Information', crypto: 'information' },
};

const FALLBACK: ActivityKindChip = { label: 'Actualité', crypto: 'information' };

/** Chip d'un type de publication (jamais nul : repli neutre si un futur `kind` n'est pas mappé). */
export function activityKindChip(kind: ActivityKind): ActivityKindChip {
  return CHIPS[kind] ?? FALLBACK;
}
