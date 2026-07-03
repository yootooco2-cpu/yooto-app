import { useMemo } from 'react';

import { exportPreferences, usePreferences } from '@/features/discovery';

import type { PreferenceSummary } from '../types';

/**
 * Prépare UNIQUEMENT les données d'affichage des préférences.
 * Aucune logique métier, aucun recalcul : s'appuie sur `usePreferences()`
 * (réactif) et lit `exportPreferences()` pour le nombre d'interactions.
 */
export function usePreferenceSummary(): PreferenceSummary {
  const snapshot = usePreferences();

  return useMemo<PreferenceSummary>(() => {
    let interactionCount = 0;
    try {
      const parsed = JSON.parse(exportPreferences()) as { totalInteractions?: number };
      interactionCount = typeof parsed.totalInteractions === 'number' ? parsed.totalInteractions : 0;
    } catch {
      interactionCount = 0;
    }

    return {
      favoriteCategories: snapshot.topCategories,
      producerAffinity: snapshot.producerAffinity,
      prefersProducers: snapshot.producerAffinity >= 0.4,
      interactionCount,
      hasData: snapshot.hasData,
    };
  }, [snapshot]);
}
