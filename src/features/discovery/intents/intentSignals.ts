import type { Signal } from '../types';
import { normalizeText } from './intentMatcher';

/**
 * Signal d'intention — enrichit le score quand le commerce correspond à ce que
 * l'utilisateur cherche réellement. N'écrase jamais distance/ouverture/note :
 * il s'ajoute (retourne `null` s'il n'apporte rien).
 */
const intentSignal: Signal = (merchant, ctx) => {
  const intent = ctx.intent;
  if (!intent) return null;

  const text = normalizeText(`${merchant.name} ${merchant.description ?? ''}`);
  const keywordHit = intent.keywords.some((k) => text.includes(normalizeText(k)));
  if (keywordHit) {
    return { key: 'intent', weight: 2, value: 1, reason: 'Correspond exactement à votre recherche' };
  }

  const categoryRank = intent.categories.indexOf(merchant.category);
  if (categoryRank === 0) {
    return { key: 'intent', weight: 2, value: 0.85, reason: 'Très proche de ce que vous cherchez' };
  }
  if (categoryRank > 0) {
    return {
      key: 'intent',
      weight: 1.5,
      value: 0.65,
      reason: 'Souvent choisi pour ce type de recherche',
    };
  }
  return null;
};

export const intentSignals: Signal[] = [intentSignal];
