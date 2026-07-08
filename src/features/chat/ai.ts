import type { ActivityItem, ChatConversation, ChatMessage } from './types';

/**
 * Seam IA — la couture « YootChat ». L'architecture doit accueillir l'IA DÈS AUJOURD'HUI sans
 * refonte : les écrans/store appellent ces méthodes ; l'implémentation `noopAIProvider` est inerte
 * (renvois neutres) et sera un jour remplacée par `yootChatProvider` (LLM), exactement comme
 * `mockChatRepository` → `supabaseChatRepository`. Aucune méthode ne bloque le rendu.
 */
export interface AIProvider {
  /** Résume un fil de discussion (null tant que l'IA n'est pas branchée). */
  summarizeThread(conversation: ChatConversation, messages: ChatMessage[]): Promise<string | null>;
  /** Recommande des conversations pertinentes (ids). */
  recommendConversations(context: { currentUserId: string; interests?: string[] }): Promise<string[]>;
  /** Détecte les activités importantes à mettre en avant (ids). */
  detectImportant(items: ActivityItem[]): Promise<string[]>;
  /** Propose des réponses rapides à un fil. */
  suggestReplies(conversation: ChatConversation, messages: ChatMessage[]): Promise<string[]>;
  /** Traduit un texte vers une langue cible. */
  translate(text: string, targetLang: string): Promise<string | null>;
  /** Score de spam (0 = sûr, 1 = spam). */
  spamScore(text: string): Promise<number>;
  /** Modération : le contenu passe-t-il ? */
  moderate(text: string): Promise<{ ok: boolean; reason?: string }>;
}

/** Implémentation inerte d'aujourd'hui — neutre, non bloquante. YootChat la remplacera. */
export const noopAIProvider: AIProvider = {
  async summarizeThread() {
    return null;
  },
  async recommendConversations() {
    return [];
  },
  async detectImportant() {
    return [];
  },
  async suggestReplies() {
    return [];
  },
  async translate() {
    return null;
  },
  async spamScore() {
    return 0;
  },
  async moderate() {
    return { ok: true };
  },
};

/** Fournisseur IA actif — `noopAIProvider` aujourd'hui, `yootChatProvider` demain (une ligne). */
export const aiProvider: AIProvider = noopAIProvider;
