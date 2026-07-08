import { create } from 'zustand';

import { CURRENT_USER_ID } from './mockData';
import { mockChatRepository, type ChatRepository } from './repository';
import type { ChatConversation, ChatConversationView, ChatMessage, ChatParticipant } from './types';

/** Repository actif — MOCK aujourd'hui, `supabaseChatRepository` demain (une seule ligne à changer). */
const repository: ChatRepository = mockChatRepository;

interface ChatState {
  ready: boolean;
  currentUserId: string;
  participants: Record<string, ChatParticipant>;
  conversations: ChatConversation[]; // triées par activité décroissante
  messages: Record<string, ChatMessage[]>; // par conversationId (ordre chronologique)
  init: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, body: string) => Promise<void>;
  createConversation: (input: { title: string; body: string; categoryId?: string }) => Promise<string>;
  markRead: (conversationId: string) => void;
}

const sortByActivity = (list: ChatConversation[]): ChatConversation[] =>
  [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

export const useChatStore = create<ChatState>()((set, get) => ({
  ready: false,
  currentUserId: CURRENT_USER_ID,
  participants: {},
  conversations: [],
  messages: {},

  async init() {
    if (get().ready) return;
    const [participants, conversations] = await Promise.all([
      repository.listParticipants(),
      repository.listConversations(),
    ]);
    const byId: Record<string, ChatParticipant> = {};
    participants.forEach((p) => {
      byId[p.id] = p;
    });
    // Pré-chargement des messages (mock) → aperçu « dernier message » dispo dès le fil.
    const lists = await Promise.all(conversations.map((c) => repository.listMessages(c.id)));
    const messages: Record<string, ChatMessage[]> = {};
    conversations.forEach((c, i) => {
      messages[c.id] = lists[i];
    });
    set({ ready: true, participants: byId, conversations: sortByActivity(conversations), messages });
  },

  async loadMessages(conversationId) {
    const list = await repository.listMessages(conversationId);
    set((s) => ({ messages: { ...s.messages, [conversationId]: list } }));
  },

  async sendMessage(conversationId, body) {
    const text = body.trim();
    if (!text) return;
    const message = await repository.sendMessage({ conversationId, senderId: get().currentUserId, body: text });
    set((s) => {
      const conversations = s.conversations.map((c) =>
        c.id === conversationId ? { ...c, updatedAt: message.createdAt, joined: true, unreadCount: 0 } : c,
      );
      return {
        messages: { ...s.messages, [conversationId]: [...(s.messages[conversationId] ?? []), message] },
        conversations: sortByActivity(conversations),
      };
    });
  },

  async createConversation({ title, body, categoryId }) {
    const { conversation, message } = await repository.createConversation({
      title,
      body,
      authorId: get().currentUserId,
      categoryId,
    });
    set((s) => ({
      conversations: sortByActivity([conversation, ...s.conversations]),
      messages: { ...s.messages, [conversation.id]: [message] },
    }));
    return conversation.id;
  },

  markRead(conversationId) {
    set((s) => ({
      conversations: s.conversations.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c)),
    }));
  },
}));

// ── Sélecteurs purs (dérivations affichables) ─────────────────────────────────────────────────

export type ChatTab = 'all' | 'pro' | 'particulier' | 'mine';

/** Construit la vue affichable d'une conversation (auteur + dernier message résolus). */
export function toConversationView(
  participants: Record<string, ChatParticipant>,
  messages: Record<string, ChatMessage[]>,
  c: ChatConversation,
): ChatConversationView {
  const msgs = messages[c.id];
  return {
    conversation: c,
    author: participants[c.authorId] ?? { id: c.authorId, kind: 'particulier', name: '—' },
    lastMessage: msgs && msgs.length ? msgs[msgs.length - 1] : null,
  };
}

/** Filtre le fil selon l'onglet actif (Tous / Professionnels / Particuliers / Vos discussions). */
export function filterByTab(views: ChatConversationView[], tab: ChatTab): ChatConversationView[] {
  switch (tab) {
    case 'pro':
      return views.filter((v) => v.author.kind === 'professionnel');
    case 'particulier':
      return views.filter((v) => v.author.kind === 'particulier');
    case 'mine':
      return views.filter((v) => v.conversation.joined);
    default:
      return views;
  }
}
