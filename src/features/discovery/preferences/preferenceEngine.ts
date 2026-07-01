import { useSyncExternalStore } from 'react';

import { clamp01 } from '../context';
import type { Signal } from '../types';
import { getPreferenceSnapshot, subscribePreferences } from './behaviorTracker';

/** Hook React : snapshot des préférences, réactif (adaptatif en direct). */
export function usePreferences() {
  return useSyncExternalStore(subscribePreferences, getPreferenceSnapshot, getPreferenceSnapshot);
}

/**
 * Signal de préférence — enrichit le score selon les habitudes apprises.
 * N'écrase jamais distance/ouverture/note ; renvoie `null` s'il n'apporte rien.
 * Explicable, jamais de score exposé.
 */
const preferenceSignal: Signal = (merchant, ctx) => {
  const p = ctx.preferences;
  if (!p || !p.hasData) return null;

  if (p.topCategories.includes(merchant.category)) {
    const affinity = p.categoryAffinity[merchant.category] ?? 0;
    return {
      key: 'preference',
      weight: 1.2,
      value: clamp01(0.6 + affinity),
      reason: 'Catégorie souvent consultée',
    };
  }

  if (merchant.isProducer && p.producerAffinity >= 0.4) {
    return {
      key: 'preference',
      weight: 1,
      value: 0.7,
      reason: 'Correspond à vos habitudes',
    };
  }

  const affinity = p.categoryAffinity[merchant.category] ?? 0;
  if (affinity > 0.15) {
    return { key: 'preference', weight: 0.8, value: 0.6, reason: 'Semble adapté à vos préférences' };
  }

  return null;
};

export const preferenceSignals: Signal[] = [preferenceSignal];
