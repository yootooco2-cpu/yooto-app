import { CURRENT_USER_ID, MOCK_ACTIVITY, MOCK_CONVERSATIONS, MOCK_MESSAGES, MOCK_NOTIFICATIONS, MOCK_PARTICIPANTS } from './mockData';
import type { ActivityItem, ChatConversation, ChatMessage, ChatNotification, ChatParticipant } from './types';

/**
 * Contrat d'accès aux données du Chat — la SEULE couture avec le backend. Aujourd'hui :
 * `mockChatRepository` (données fictives en mémoire). Demain : `supabaseChatRepository` qui
 * implémente exactement cette interface (mêmes signatures async) → le store et les écrans ne
 * changent pas. Toutes les méthodes sont asynchrones, comme le seront les appels Supabase.
 */
export interface ChatRepository {
  listParticipants(): Promise<ChatParticipant[]>;
  listConversations(): Promise<ChatConversation[]>;
  listActivity(): Promise<ActivityItem[]>;
  listMessages(conversationId: string): Promise<ChatMessage[]>;
  listNotifications(): Promise<ChatNotification[]>;
  markNotificationRead(id: string): Promise<void>;
  /** Suivre / ne plus suivre un acteur (commerçant, producteur, habitant). */
  setFollow(actorId: string, follow: boolean): Promise<void>;
  sendMessage(input: { conversationId: string; senderId: string; body: string }): Promise<ChatMessage>;
  createConversation(input: { title: string; body: string; authorId: string; categoryId?: string }): Promise<{
    conversation: ChatConversation;
    message: ChatMessage;
  }>;
}

// ── Implémentation MOCK : état mutable en mémoire (simule la base). ────────────────────────────
// Copies indépendantes des seeds pour ne jamais muter les constantes exportées.
let participants: ChatParticipant[] = MOCK_PARTICIPANTS.map((p) => ({ ...p }));
let conversations: ChatConversation[] = MOCK_CONVERSATIONS.map((c) => ({ ...c, participantIds: [...c.participantIds] }));
let messages: ChatMessage[] = MOCK_MESSAGES.map((m) => ({ ...m }));
const activity: ActivityItem[] = MOCK_ACTIVITY.map((a) => ({ ...a }));
let notifications: ChatNotification[] = MOCK_NOTIFICATIONS.map((n) => ({ ...n }));
const following = new Set<string>();

let seq = 0;
const uid = (prefix: string): string => `${prefix}_${Date.now().toString(36)}_${(seq++).toString(36)}`;

/** Petite latence simulée pour un rendu réaliste (et proche du futur réseau). */
const delay = <T>(value: T, ms = 60): Promise<T> => new Promise((resolve) => setTimeout(() => resolve(value), ms));

export const mockChatRepository: ChatRepository = {
  async listParticipants() {
    return delay(participants.map((p) => ({ ...p })));
  },

  async listConversations() {
    const sorted = [...conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
    return delay(sorted.map((c) => ({ ...c })));
  },

  async listActivity() {
    const sorted = [...activity].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return delay(sorted.map((a) => ({ ...a })));
  },

  async listMessages(conversationId) {
    const list = messages
      .filter((m) => m.conversationId === conversationId)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    return delay(list.map((m) => ({ ...m })));
  },

  async listNotifications() {
    const sorted = [...notifications].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return delay(sorted.map((n) => ({ ...n })));
  },

  async markNotificationRead(id) {
    notifications = notifications.map((n) => (n.id === id ? { ...n, read: true } : n));
    return delay(undefined);
  },

  async setFollow(actorId, follow) {
    if (follow) following.add(actorId);
    else following.delete(actorId);
    return delay(undefined);
  },

  async sendMessage({ conversationId, senderId, body }) {
    const now = new Date().toISOString();
    const message: ChatMessage = { id: uid('msg'), conversationId, senderId, body, createdAt: now };
    messages = [...messages, message];
    conversations = conversations.map((c) =>
      c.id === conversationId
        ? {
            ...c,
            updatedAt: now,
            joined: c.joined || senderId === CURRENT_USER_ID,
            unreadCount: senderId === CURRENT_USER_ID ? 0 : c.unreadCount,
            participantIds: c.participantIds.includes(senderId) ? c.participantIds : [...c.participantIds, senderId],
          }
        : c,
    );
    return delay(message);
  },

  async createConversation({ title, body, authorId, categoryId }) {
    const now = new Date().toISOString();
    const conversation: ChatConversation = {
      id: uid('conv'),
      title: title.trim(),
      visibility: 'public',
      categoryId,
      authorId,
      participantIds: [authorId],
      joined: authorId === CURRENT_USER_ID,
      unreadCount: 0,
      createdAt: now,
      updatedAt: now,
    };
    const message: ChatMessage = { id: uid('msg'), conversationId: conversation.id, senderId: authorId, body: body.trim(), createdAt: now };
    conversations = [conversation, ...conversations];
    messages = [...messages, message];
    return delay({ conversation, message });
  },
};
