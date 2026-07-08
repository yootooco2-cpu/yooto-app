/**
 * Domaine CHAT — le CŒUR SOCIAL de YOOTOO (commerce local). Voir `constitution.ts` pour les
 * principes fondateurs. Modèle pensé pour Supabase ET pour l'IA (YootChat) dès aujourd'hui :
 * champs de méta-IA optionnels, géolocalisation omniprésente, réputation fondée sur l'UTILITÉ.
 */

// ── Acteurs & confiance ───────────────────────────────────────────────────────────────────────

/** Nature d'un membre. Au-delà du binaire : producteurs et associations ont une identité propre. */
export type ChatParticipantKind = 'particulier' | 'professionnel' | 'producteur' | 'association';

/** Badge : soit un RÔLE vérifié (confiance), soit une CONTRIBUTION méritée (utilité). Jamais achetable. */
export type ChatBadgeKind =
  | 'verified_pro'
  | 'producteur_local'
  | 'association'
  | 'habitant_verifie'
  | 'bon_conseiller'
  | 'ambassadeur_quartier'
  | 'hote_evenements';

export interface ChatBadge {
  kind: ChatBadgeKind;
  label: string;
}

/**
 * Réputation par l'UTILITÉ — JAMAIS la popularité. Les likes/réactions et le nombre d'abonnés
 * n'entrent PAS ici : seuls comptent les conseils utiles, réponses acceptées et recos confirmées.
 */
export interface ChatReputation {
  helpfulScore: number;
  acceptedAnswers: number;
  confirmedRecos: number;
}

/** Un membre de la communauté (→ table `chat_participants`). */
export interface ChatParticipant {
  id: string;
  kind: ChatParticipantKind;
  name: string;
  /** Photo de profil personnelle (particulier). */
  avatarUrl?: string | null;
  /** Logo officiel du commerce (priorité 1 d'affichage). */
  logoUrl?: string | null;
  /** Photo de façade / image principale du commerce (priorité 2). */
  coverUrl?: string | null;
  /** Pour un pro/producteur : le commerce rattaché (jointure future vers `merchants`). */
  merchantId?: string;
  /** Compte vérifié (identité/lieu) → socle de confiance. */
  verified?: boolean;
  badges?: ChatBadge[];
  reputation?: ChatReputation;
  /** Présence : en ligne maintenant. */
  online?: boolean;
  /** Dernière activité (ISO) → statut « Actif il y a X min », etc. */
  lastActiveAt?: string;
  /** Ancrage local. */
  neighborhood?: string;
  geo?: ChatGeo;
  /** Étiquette de proximité prête à afficher (« à 400 m »). */
  distanceLabel?: string;
}

// ── Moteur local (géolocalisation omniprésente) ─────────────────────────────────────────────────

/** Portée géographique d'un contenu — cœur du moteur local. */
export type GeoScope = 'near' | 'neighborhood' | 'city' | 'route';

export interface ChatGeo {
  lat?: number;
  lng?: number;
  distanceKm?: number;
  distanceLabel?: string;
  neighborhood?: string;
  /** Pré-classement (proche / quartier / ville / sur mon trajet). */
  scope?: GeoScope;
}

// ── Messages & conversations ────────────────────────────────────────────────────────────────────

export type ChatMessageStatus = 'sent' | 'delivered' | 'read';

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO 8601
  /** Statut d'un message ENVOYÉ par l'utilisateur (indicateur discret). */
  status?: ChatMessageStatus;
  /** Méta-IA (remplies plus tard par YootChat) — n'altèrent jamais le rendu. */
  lang?: string;
  translatedBody?: string;
}

/** Portée d'une conversation : publique (« Discussions ») ou privée (« Messages »). */
export type ChatVisibility = 'public' | 'private';

export interface ChatConversation {
  id: string;
  title: string;
  visibility: ChatVisibility;
  categoryId?: string;
  authorId: string;
  participantIds: string[];
  joined: boolean;
  unreadCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
  geo?: ChatGeo;
  /** Question résolue (statut à la Reddit/StackOverflow) — utilité mise en avant. */
  resolved?: boolean;
  /** Méta-IA optionnelle (résumé, sujets) — future YootChat. */
  summary?: string;
  topics?: string[];
}

// ── Interactions sociales (Phase A) ─────────────────────────────────────────────────────────────

/**
 * Réactions UTILES (jamais un simple « Like », jamais comptées dans la réputation) :
 * 👍 Utile · ❤️ J'y vais · 👏 Bravo · 🙏 Merci · 🌱 Belle initiative.
 */
export type ReactionEmoji = '👍' | '❤️' | '👏' | '🙏' | '🌱';

export interface ReactionSummary {
  emoji: ReactionEmoji;
  count: number;
}

/** Signaux d'UTILITÉ qui, eux, nourrissent la réputation (à la différence des réactions). */
export type HelpfulKind = 'accepted_answer' | 'confirmed_reco' | 'marked_useful';

/** Une réponse à une carte d'activité (repliée par défaut : « Voir N réponses »). */
export interface ActivityComment {
  id: string;
  activityId: string;
  authorId: string;
  body: string;
  createdAt: string; // ISO 8601
}

/** Une ligne du bloc « Tendance près de chez vous » (compact, donne envie de descendre). */
export interface Trend {
  id: string;
  emoji: string;
  label: string;
}

// ── Fil d'activité (le fil raconte le TERRITOIRE, pas seulement les membres) ─────────────────────

export type ActivityKind =
  | 'arrivage'
  | 'produit'
  | 'offre'
  | 'evenement'
  | 'degustation'
  | 'concert'
  | 'sortie'
  | 'marche'
  | 'recolte'
  | 'ouverture'
  | 'fermeture'
  | 'benevolat'
  | 'nouveau_pro'
  | 'annonce';

/** Origine d'une carte : un membre, la vie du territoire, ou une détection système/IA. */
export type ActivitySource = 'member' | 'territory' | 'system';

/**
 * Une CARTE VIVANTE du fil « Activité » (→ future table `chat_activity`). Ce n'est pas un message :
 * c'est ce qui vit autour de l'utilisateur MAINTENANT — publié par un membre OU raconté par le
 * territoire (un marché commence, un atelier ouvre, un concert dans 2h, un établissement rejoint…).
 */
export interface ActivityItem {
  id: string;
  kind: ActivityKind;
  source: ActivitySource;
  emoji: string;
  authorId: string;
  title: string;
  body?: string;
  categoryId?: string;
  merchantId?: string;
  place?: string;
  geo?: ChatGeo;
  createdAt: string; // ISO 8601
  /** Événements datés (concert dans 2h, marché 9h-13h…). */
  startsAt?: string;
  endsAt?: string;
  /** Compteurs de réactions (dénormalisés, comme le sera Supabase). */
  reactions?: ReactionSummary[];
  /** Méta-IA optionnelle. */
  summary?: string;
  topics?: string[];
}

// ── Notifications ───────────────────────────────────────────────────────────────────────────────

export type NotificationKind = 'reply' | 'reaction' | 'follow' | 'event_reminder' | 'reco' | 'mention' | 'territory';

export interface ChatNotification {
  id: string;
  kind: NotificationKind;
  actorId?: string;
  title: string;
  body?: string;
  ref?: { type: 'conversation' | 'activity'; id: string };
  createdAt: string; // ISO 8601
  read: boolean;
}

// ── Vues affichables ────────────────────────────────────────────────────────────────────────────

/** Vue prête à afficher d'une conversation (conversation + auteur + dernier message résolus). */
export interface ChatConversationView {
  conversation: ChatConversation;
  author: ChatParticipant;
  lastMessage: ChatMessage | null;
}
