import type { MapQuality, MapSettings } from '@/features/settings/types';

/** Élément minimal nécessaire pour décider de l'affichage d'un marqueur (découplé du modèle). */
export interface MarkerVisibilityInput {
  isProducer?: boolean | null;
  isFavorite: boolean;
}

const QUALITY_LABEL: Record<MapQuality, string> = { standard: 'Standard', high: 'Élevée', max: 'Maximum' };
const QUALITY_NEXT: Record<MapQuality, MapQuality> = { standard: 'high', high: 'max', max: 'standard' };

/**
 * Service de PRÉFÉRENCES carte — logique métier des réglages de carte, HORS composants.
 * Fournit le cycle/le libellé de qualité et le PRÉDICAT d'affichage d'un marqueur selon les
 * préférences (producteurs / favoris). Les réglages couplés au moteur/au style Mapbox
 * (3D, animations, qualité de rendu) sont appliqués côté carte dans une étape dédiée.
 */
export const PreferenceService = {
  qualityLabel(q: MapQuality): string {
    return QUALITY_LABEL[q];
  },
  nextQuality(q: MapQuality): MapQuality {
    return QUALITY_NEXT[q];
  },
  /** Le marqueur doit-il être affiché compte tenu des préférences ? */
  isMarkerVisible(map: MapSettings, m: MarkerVisibilityInput): boolean {
    if (!map.showFavorites && m.isFavorite) return false;
    if (!map.showProducers && m.isProducer) return false;
    return true;
  },
};
