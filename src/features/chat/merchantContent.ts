/**
 * Réconciliation Chat ↔ vrais commerces. À partir d'un merchant RÉEL (id, nom, catégorie, photo),
 * on génère un contenu SCÉNARISÉ mais COHÉRENT avec le commerce (par catégorie). Les identités des
 * acteurs « pro » du Chat sont remplacées par de vrais merchants ; les textes sont réécrits ici.
 * Pur & testable — aucune dépendance UI/store.
 */

/** Vue minimale d'un vrai commerce, dérivée du merchant Supabase (photo déjà garantie). */
export interface ChatMerchant {
  id: string;
  name: string;
  category: string; // producer | grocery | restaurant | shop | service
  photo: string;
  distanceLabel?: string;
  isProducer?: boolean;
}

/** Emplacements « pro » du Chat mockés, remplacés dans l'ordre par de vrais commerces. */
export const MERCHANT_SLOTS = ['pro_boulangerie', 'pro_ferme', 'pro_cafe', 'pro_ceramique', 'pro_cave', 'assoc_velo'] as const;

interface CategoryPack {
  emoji: string;
  chatCategory: string;
  titles: [string, string];
  bodies: [string, string];
  discussions: [string, string];
}

const PACKS: Record<string, CategoryPack> = {
  producer: {
    emoji: '🥕',
    chatCategory: 'producteurs',
    titles: ['Récolte du jour chez {n}', 'Cueillette du matin — {n}'],
    bodies: ['Fruits et légumes de saison, tout juste ramassés.', 'Produits frais du jour, en quantité limitée.'],
    discussions: ['Paniers & marché de saison — {n}', 'Les récoltes de la semaine — {n}'],
  },
  grocery: {
    emoji: '🛒',
    chatCategory: 'vie-locale',
    titles: ['Arrivage frais aujourd’hui chez {n}', 'Nouveaux produits en rayon — {n}'],
    bodies: ['De belles nouveautés viennent d’arriver.', 'Frais du jour, à retrouver en boutique.'],
    discussions: ['Les arrivages de la semaine — {n}', 'Bons produits du moment — {n}'],
  },
  restaurant: {
    emoji: '🍽️',
    chatCategory: 'restaurants',
    titles: ['Le plat du jour est prêt chez {n}', 'La suggestion du chef — {n}'],
    bodies: ['Venez découvrir notre plat du jour.', 'On vous a préparé quelque chose de bon 😋'],
    discussions: ['Suggestions & réservations — {n}', 'Le menu de la semaine — {n}'],
  },
  shop: {
    emoji: '🛍️',
    chatCategory: 'artisanat',
    titles: ['Nouveautés en boutique chez {n}', 'Petite sélection fraîchement arrivée — {n}'],
    bodies: ['Passez découvrir les dernières trouvailles.', 'De nouvelles pièces à voir en boutique.'],
    discussions: ['Nouveautés à découvrir — {n}', 'Coups de cœur du moment — {n}'],
  },
  service: {
    emoji: '✨',
    chatCategory: 'vie-locale',
    titles: ['{n} vous accueille aujourd’hui', 'Petite nouveauté chez {n}'],
    bodies: ['Passez nous voir, on vous conseille avec plaisir.', 'On serait ravis de vous accueillir.'],
    discussions: ['Conseils & rendez-vous — {n}', 'À votre service — {n}'],
  },
};

const fill = (tpl: string, name: string): string => tpl.replace('{n}', name);

export interface MerchantTemplate {
  emoji: string;
  chatCategory: string;
  title: string;
  body: string;
  discussionTitle: string;
  dmFromUser: string;
  dmFromMerchant: string;
}

/** Contenu cohérent pour un commerce donné. `variant` (0/1) évite la répétition entre commerces. */
export function buildMerchantTemplate(m: ChatMerchant, variant: number): MerchantTemplate {
  const pack = PACKS[m.category] ?? PACKS.service;
  const v = variant % 2;
  return {
    emoji: pack.emoji,
    chatCategory: pack.chatCategory,
    title: fill(pack.titles[v], m.name),
    body: fill(pack.bodies[v], m.name),
    discussionTitle: fill(pack.discussions[v], m.name),
    dmFromUser: `Bonjour ${m.name}, êtes-vous ouverts cet après-midi ?`,
    dmFromMerchant: 'Bonjour ! Oui, jusqu’à 19h. Au plaisir de vous accueillir 🙂',
  };
}
