/**
 * Domaine CHAT — l'espace d'échange local de YOOTOO (particuliers ↔ professionnels).
 *
 * Modèle pensé pour être branché tel quel sur Supabase (tables `chat_participants`,
 * `chat_conversations`, `chat_messages`). Aujourd'hui alimenté par des données FICTIVES via
 * `mockChatRepository`, demain par `supabaseChatRepository` — même interface `ChatRepository`,
 * aucun écran à retoucher.
 */

/** Nature d'un membre : un habitant ou un commerçant/pro. */
export type ChatParticipantKind = 'particulier' | 'professionnel';

/** Un membre de la communauté (→ table `chat_participants`). */
export interface ChatParticipant {
  id: string;
  kind: ChatParticipantKind;
  name: string;
  avatarUrl?: string | null;
  /** Pour un professionnel : le commerce rattaché (jointure future vers `merchants`). */
  merchantId?: string;
  /** Ancrage local optionnel (ex. « 800 m »). */
  distanceLabel?: string;
}

/** Un message d'une conversation (→ table `chat_messages`). */
export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string; // ISO 8601 (timestamptz Supabase)
}

/** Une conversation / discussion (→ table `chat_conversations`). */
export interface ChatConversation {
  id: string;
  title: string;
  /** Catégorie de discussion (voir `CHAT_CATEGORIES`), optionnelle. */
  categoryId?: string;
  /** Membre à l'origine de la discussion — affiché sur la carte du fil. */
  authorId: string;
  /** Tous les membres de la conversation (incluant l'utilisateur courant s'il a rejoint). */
  participantIds: string[];
  /** L'utilisateur courant participe → apparaît dans « Vos discussions ». */
  joined: boolean;
  /** Messages non lus pour l'utilisateur courant. */
  unreadCount: number;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601 — dernière activité (tri du fil)
}

/** Vue prête à afficher d'une conversation (conversation + auteur + dernier message résolus). */
export interface ChatConversationView {
  conversation: ChatConversation;
  author: ChatParticipant;
  lastMessage: ChatMessage | null;
}
