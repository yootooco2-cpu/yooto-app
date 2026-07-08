/**
 * Types du domaine CHAT — l'espace d'échange local de YOOTOO (particuliers ↔ professionnels).
 *
 * STRUCTURE ÉVOLUTIVE, sans donnée ni logique métier : ces contrats cadrent les fonctionnalités
 * qui seront développées progressivement — fil de discussions, conversations locales, catégories,
 * recherche, notifications, puis messagerie privée (2ᵉ temps). Aucune fonctionnalité n'est encore
 * branchée : la page Chat n'expose pour l'instant que la STRUCTURE.
 */

/** Nature de l'auteur : un habitant ou un commerçant/pro. */
export type ChatAuthorKind = 'particulier' | 'professionnel';

export interface ChatAuthor {
  id: string;
  kind: ChatAuthorKind;
  name: string;
  avatarUrl?: string | null;
  /** Renseigné pour un professionnel : le commerce rattaché. */
  merchantId?: string;
}

/** Un sujet du FIL DE DISCUSSIONS (public), rattaché à une catégorie et ancré localement. */
export interface ChatThread {
  id: string;
  categoryId: string;
  author: ChatAuthor;
  title: string;
  excerpt: string;
  repliesCount: number;
  createdAt: string; // ISO 8601
  lastActivityAt: string; // ISO 8601
  /** Ancrage local (quartier / ville) — cœur des « conversations locales ». */
  place?: string;
}

/** Une réponse dans un fil (2ᵉ temps). */
export interface ChatReply {
  id: string;
  threadId: string;
  author: ChatAuthor;
  body: string;
  createdAt: string;
}

/** Conversation PRIVÉE entre membres (messagerie — développée dans un second temps). */
export interface ChatConversation {
  id: string;
  participants: ChatAuthor[];
  lastMessageAt: string;
}
