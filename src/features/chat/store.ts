import { create } from 'zustand';

import { isLiveNow } from './logic';
import { CURRENT_USER_ID } from './mockData';
import { mockChatRepository, type ChatRepository } from './repository';
import type {
  ActivityComment,
  ActivityItem,
  ChatConversation,
  ChatConversationView,
  ChatMessage,
  ChatNotification,
  ChatParticipant,
  ReactionEmoji,
  ReactionSummary,
  Trend,
} from './types';

/** Repository actif — MOCK aujourd'hui, `supabaseChatRepository` demain (une seule ligne à changer). */
const repository: ChatRepository = mockChatRepository;

interface ChatState {
  ready: boolean;
  currentUserId: string;
  participants: Record<string, ChatParticipant>;
  conversations: ChatConversation[]; // triées par activité décroissante
  messages: Record<string, ChatMessage[]>; // par conversationId (ordre chronologique)
  activity: ActivityItem[]; // fil « Activité » (récent → ancien)
  trends: Trend[]; // « Tendance près de chez vous »
  notifications: ChatNotification[];
  following: Record<string, boolean>; // acteurs suivis (id → true)
  saved: Record<string, boolean>; // publications enregistrées (id → true)
  myReactions: Record<string, ReactionEmoji | undefined>; // ma réaction par activité
  commentsByActivity: Record<string, ActivityComment[]>; // réponses par activité
  init: () => Promise<void>;
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, body: string) => Promise<void>;
  createConversation: (input: { title: string; body: string; categoryId?: string }) => Promise<string>;
  markRead: (conversationId: string) => void;
  markNotificationRead: (id: string) => Promise<void>;
  toggleFollow: (actorId: string) => Promise<void>;
  toggleReaction: (activityId: string, emoji: ReactionEmoji) => Promise<void>;
  toggleSave: (activityId: string) => Promise<void>;
  addComment: (activityId: string, body: string) => Promise<void>;
}

const sortByActivity = (list: ChatConversation[]): ChatConversation[] =>
  [...list].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

/** Applique un delta de compteur à une réaction (insertion/suppression, retri par popularité). */
function bumpReaction(list: ReactionSummary[] | undefined, emoji: ReactionEmoji, delta: number): ReactionSummary[] {
  const arr = (list ?? []).map((r) => ({ ...r }));
  const i = arr.findIndex((r) => r.emoji === emoji);
  if (i >= 0) {
    arr[i].count += delta;
    if (arr[i].count <= 0) arr.splice(i, 1);
  } else if (delta > 0) {
    arr.push({ emoji, count: delta });
  }
  return arr.sort((a, b) => b.count - a.count);
}

export const useChatStore = create<ChatState>()((set, get) => ({
  ready: false,
  currentUserId: CURRENT_USER_ID,
  participants: {},
  conversations: [],
  messages: {},
  activity: [],
  trends: [],
  notifications: [],
  following: {},
  saved: {},
  myReactions: {},
  commentsByActivity: {},

  async init() {
    if (get().ready) return;
    const [participants, conversations, activity, trends, notifications] = await Promise.all([
      repository.listParticipants(),
      repository.listConversations(),
      repository.listActivity(),
      repository.listTrends(),
      repository.listNotifications(),
    ]);
    const byId: Record<string, ChatParticipant> = {};
    participants.forEach((p) => {
      byId[p.id] = p;
    });
    // Pré-chargement (mock) : dernier message + nombre de réponses dispo dès le fil.
    const [msgLists, cmtLists] = await Promise.all([
      Promise.all(conversations.map((c) => repository.listMessages(c.id))),
      Promise.all(activity.map((a) => repository.listComments(a.id))),
    ]);
    const messages: Record<string, ChatMessage[]> = {};
    conversations.forEach((c, i) => {
      messages[c.id] = msgLists[i];
    });
    const commentsByActivity: Record<string, ActivityComment[]> = {};
    activity.forEach((a, i) => {
      commentsByActivity[a.id] = cmtLists[i];
    });
    set({ ready: true, participants: byId, conversations: sortByActivity(conversations), messages, activity, trends, notifications, commentsByActivity });
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

  async markNotificationRead(id) {
    set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) }));
    await repository.markNotificationRead(id);
  },

  async toggleFollow(actorId) {
    const next = !get().following[actorId];
    set((s) => ({ following: { ...s.following, [actorId]: next } }));
    await repository.setFollow(actorId, next);
  },

  async toggleReaction(activityId, emoji) {
    const prev = get().myReactions[activityId];
    const next = prev === emoji ? undefined : emoji;
    set((s) => {
      const activity = s.activity.map((a) => {
        if (a.id !== activityId) return a;
        let reactions = a.reactions;
        if (prev) reactions = bumpReaction(reactions, prev, -1);
        if (next) reactions = bumpReaction(reactions, next, +1);
        return { ...a, reactions };
      });
      return { activity, myReactions: { ...s.myReactions, [activityId]: next } };
    });
    if (prev && prev !== emoji) await repository.setReaction(activityId, prev, false);
    await repository.setReaction(activityId, emoji, next === emoji);
  },

  async toggleSave(activityId) {
    const next = !get().saved[activityId];
    set((s) => ({ saved: { ...s.saved, [activityId]: next } }));
    await repository.setSaved(activityId, next);
  },

  async addComment(activityId, body) {
    const text = body.trim();
    if (!text) return;
    const comment = await repository.addComment({ activityId, authorId: get().currentUserId, body: text });
    set((s) => ({
      commentsByActivity: { ...s.commentsByActivity, [activityId]: [...(s.commentsByActivity[activityId] ?? []), comment] },
    }));
  },
}));

// ── Sélecteurs purs (dérivations affichables) ─────────────────────────────────────────────────

/** Les trois espaces de la « place du village ». */
export type ChatSpace = 'activity' | 'discussions' | 'messages';

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

/** Discussions PUBLIQUES (place du village), optionnellement filtrées par catégorie. */
export function selectDiscussions(
  conversations: ChatConversation[],
  categoryId: string = 'all',
): ChatConversation[] {
  return conversations.filter(
    (c) => c.visibility === 'public' && (categoryId === 'all' || c.categoryId === categoryId),
  );
}

/** Conversations PRIVÉES (messagerie 1:1). */
export function selectPrivateMessages(conversations: ChatConversation[]): ChatConversation[] {
  return conversations.filter((c) => c.visibility === 'private');
}

/** Total de messages non lus dans la messagerie privée (badge de l'espace « Messages »). */
export function unreadPrivateCount(conversations: ChatConversation[]): number {
  return selectPrivateMessages(conversations).reduce((n, c) => n + c.unreadCount, 0);
}

/** Nombre de notifications non lues. */
export function unreadNotifications(notifications: ChatNotification[]): number {
  return notifications.filter((n) => !n.read).length;
}

/**
 * « À ne pas manquer » — une seule carte, choisie automatiquement : un événement imminent ou en
 * direct d'abord, sinon une offre, sinon un nouveau commerce, sinon la plus récente. Change tout
 * seul avec l'heure et le fil.
 */
export function highlightActivity(activity: ActivityItem[], now: number): ActivityItem | null {
  if (activity.length === 0) return null;
  const dated = activity.filter((a) => a.startsAt).sort((a, b) => Date.parse(a.startsAt as string) - Date.parse(b.startsAt as string));
  const imminent =
    dated.find((a) => {
      const s = Date.parse(a.startsAt as string);
      return s >= now && s - now <= 3 * 60 * 60_000;
    }) ?? dated.find((a) => isLiveNow(a.startsAt, a.endsAt, now));
  if (imminent) return imminent;
  return activity.find((a) => a.kind === 'offre') ?? activity.find((a) => a.kind === 'nouveau_pro') ?? activity[0];
}
