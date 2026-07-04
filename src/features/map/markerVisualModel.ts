import {
  DIRECTIONAL_SHADOW,
  EXCEPTIONAL_GOLD,
  MARKER_STATE_TOKENS,
  SELECTED_COLOR,
  mapColorFor,
  withAlpha,
  type MarkerImportance,
} from '@/design/tokens/mapMarkers';

/**
 * Modèle visuel appliqué tel quel par le rendu (`photoMarkers`). Le composant de rendu ne
 * DÉCIDE rien : il applique. Toute la mise en avant passe par bordure + box-shadow + z-index,
 * JAMAIS par `transform` (Mapbox y stocke la position — ADR-002).
 */
export interface MarkerVisualModel {
  /** Diamètre (px). */
  size: number;
  /** Anneau catégorie (border). */
  borderColor: string;
  borderWidth: number;
  /** Anneaux + halo teinté + aura + ombre directionnelle, composés depuis les tokens. */
  boxShadow: string;
  zIndex: number;
}

/**
 * markerVisualModel — PUR. `importance` = état intrinsèque (Discovery) ; `selected` = focus
 * transitoire qui prime sur l'importance. `cryptogramId` fournit la teinte catégorie.
 *
 *  - Standard    : anneau simple fin + halo catégorie très subtil → la photo domine.
 *  - Recommandé  : double anneau + halo « d'air » teinté catégorie → respire (contraste calme).
 *  - Exceptionnel: aura OR/champagne (précieux, JAMAIS rouge) ; l'anneau reste la catégorie.
 *  - Sélectionné : anneau épais vert YOOTOO + liseré + halo vert + ombre forte → domine tout.
 */
export function markerVisualModel(
  importance: MarkerImportance,
  cryptogramId: string,
  opts?: { selected?: boolean },
): MarkerVisualModel {
  const category = mapColorFor(cryptogramId);
  const t = MARKER_STATE_TOKENS[opts?.selected ? 'selected' : importance];
  const layers: string[] = [];

  if (opts?.selected) {
    layers.push('0 0 0 3px #FFFFFF');
    layers.push(`0 0 0 6px ${SELECTED_COLOR}`);
    layers.push('0 8px 18px rgba(23,32,26,0.50)');
  } else if (importance === 'exceptional') {
    layers.push(`0 0 0 2px ${withAlpha(EXCEPTIONAL_GOLD, 0.95)}`);
    layers.push(`0 0 0 5px ${withAlpha(EXCEPTIONAL_GOLD, 0.55)}`);
    layers.push(`0 0 0 ${t.halo}px ${withAlpha(EXCEPTIONAL_GOLD, t.haloAlpha)}`);
    layers.push(DIRECTIONAL_SHADOW);
  } else if (importance === 'recommended') {
    layers.push('0 0 0 2px #FFFFFF');
    layers.push(`0 0 0 5px ${withAlpha(category, 0.9)}`);
    layers.push(`0 0 0 ${t.halo}px ${withAlpha(category, t.haloAlpha)}`);
    layers.push(DIRECTIONAL_SHADOW);
  } else {
    layers.push(`0 0 0 ${t.halo}px ${withAlpha(category, t.haloAlpha)}`);
    layers.push(DIRECTIONAL_SHADOW);
  }

  return {
    size: t.size,
    borderColor: opts?.selected ? SELECTED_COLOR : category,
    borderWidth: t.ring,
    boxShadow: layers.join(', '),
    zIndex: t.z,
  };
}
