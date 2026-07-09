/**
 * CONSTITUTION DU CHAT YOOTOO — le cœur social du commerce local.
 *
 * Référence vivante : toute évolution du Chat doit respecter ces principes. Avant d'ajouter une
 * fonctionnalité, la passer au filtre de LA QUESTION FONDATRICE (ci-dessous). Ce n'est pas du code
 * actif : c'est le contrat de conception, consultable (et affichable un jour dans « À propos »).
 */

/** La question à laquelle toute nouvelle fonctionnalité doit répondre OUI. */
export const FOUNDING_QUESTION =
  'Est-ce que cela renforce les liens entre les habitants et leur territoire ?';

export interface Principle {
  id: string;
  title: string;
  rule: string;
}

export const CHAT_PRINCIPLES: Principle[] = [
  { id: 'coeur-social', title: 'Cœur social', rule: 'Le Chat n’est pas une feature : tout (commerce, producteurs, événements, recos, rencontres) converge vers lui.' },
  { id: 'differenciation', title: 'Différenciation absolue', rule: 'S’inspirer des mécaniques, jamais de l’expérience. On sent immédiatement une app différente de Facebook/Discord/WhatsApp.' },
  { id: 'fil-territoire', title: 'Le fil raconte le territoire', rule: 'Le fil montre la vie de la ville (marché, atelier qui ouvre, récolte, concert, fermeture, nouvel établissement), pas seulement les publications des membres.' },
  { id: 'utilite', title: 'Utilité, pas popularité', rule: 'La réputation récompense l’utilité (conseils, entraide). Les likes et abonnés n’y entrent jamais. Un bon conseil vaut plus que mille likes.' },
  { id: 'ia-ready', title: 'IA-ready (YootChat)', rule: 'L’architecture accueille l’IA dès aujourd’hui via une seam AIProvider (résumer, recommander, détecter, traduire, modérer). Ne jamais refaire l’archi.' },
  { id: 'moteur-local', title: 'Moteur local', rule: 'La géolocalisation est omniprésente : chaque contenu est classable proche de moi / quartier / ville / sur mon trajet.' },
];

/** Roadmap validée — la confiance précède l’explosion du contenu ; l’IA personnalise en dernier. */
export const CHAT_ROADMAP = [
  { phase: 'A', title: 'Socle social', goal: 'Transformer la lecture en participation (réactions, réponses, enregistrer, profils, suivre, notifications).' },
  { phase: 'B', title: 'Confiance & identité', goal: 'Vérification pros/producteurs, badges, réponses acceptées, réputation utile, modération.' },
  { phase: 'C', title: 'Contenu vivant', goal: 'Composer par gabarits, événements + RSVP, recommandations, temps réel, fil du territoire.' },
  { phase: 'D', title: 'Personnalisation, IA & rétention', goal: 'Fil personnalisé (proximité + intérêts + heure), rituels, IA (résumés, recommandations, modération).' },
] as const;
