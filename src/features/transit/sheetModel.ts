/**
 * Modèle du bottom sheet Bus & Tram — fonctions PURES (testables sans UI).
 * Deux responsabilités : hauteur par état (plafonnée sous la barre flottante) et
 * transitions chevrons/poignée.
 */

export type SheetState = 'reduced' | 'mid' | 'full';

/** Hauteur par état : px absolus (réduit) ou fraction d'écran (intermédiaire/développé). */
export const SHEET_HEIGHT: Record<SheetState, number> = { reduced: 168, mid: 0.42, full: 0.86 };

/** Plafond ABSOLU : le sheet ne recouvre jamais la barre flottante (recherche + modes). */
export const TOP_BAR_SPACE = 186;

/** Hauteur en pixels du sheet pour un état donné. */
export function sheetHeightPx(state: SheetState, screenHeight: number): number {
  if (state === 'reduced') return SHEET_HEIGHT.reduced;
  return Math.min(Math.round(screenHeight * SHEET_HEIGHT[state]), screenHeight - TOP_BAR_SPACE);
}

const ORDER: SheetState[] = ['reduced', 'mid', 'full'];

/**
 * Transition chevron/poignée. AVEC une sélection active, réduit ⇄ développé directement :
 * l'état intermédiaire est la LISTE des arrêts, pas une étape des horaires — l'ouverture
 * de la fiche tient en UN geste (bug corrigé : il fallait traverser la liste pour lire
 * les horaires d'une ligne sélectionnée).
 */
export function nextSheetState(state: SheetState, dir: 1 | -1, hasSelection: boolean): SheetState {
  const order = hasSelection ? (['reduced', 'full'] as SheetState[]) : ORDER;
  const idx = order.indexOf(state);
  // État hors échelle (ex. 'mid' avec sélection, transitoire) : on rejoint l'échelle dans le sens demandé.
  if (idx === -1) return dir === 1 ? order[order.length - 1] : order[0];
  return order[Math.min(order.length - 1, Math.max(0, idx + dir))];
}
