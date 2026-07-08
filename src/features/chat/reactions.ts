import type { ReactionEmoji } from './types';

/**
 * Réactions UTILES de YOOTOO — pas de « Like ». Chaque réaction dit quelque chose d'utile pour la
 * vie locale. Discrètes par principe : elles ne doivent jamais prendre plus de place que le contenu.
 */
export const REACTIONS: { emoji: ReactionEmoji; label: string }[] = [
  { emoji: '👍', label: 'Utile' },
  { emoji: '❤️', label: 'J’y vais' },
  { emoji: '👏', label: 'Bravo' },
  { emoji: '🙏', label: 'Merci' },
  { emoji: '🌱', label: 'Belle initiative' },
];

export function reactionLabel(emoji: ReactionEmoji): string {
  return REACTIONS.find((r) => r.emoji === emoji)?.label ?? '';
}
