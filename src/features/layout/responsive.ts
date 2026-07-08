/**
 * Primitive responsive YOOTOO — logique PURE (aucune dépendance React Native).
 *
 * Le mode « Focus Commerce » (split-view carte + fiche latérale) n'existe que sur
 * Web/Desktop. En dessous du breakpoint — mobile-web, tablette — et sur natif, on
 * conserve strictement le comportement actuel (bottom sheet).
 */

/** Largeur minimale (px) activant le split-view desktop. */
export const DESKTOP_BREAKPOINT = 1024;

/** Vrai si l'on est sur Web ET assez large pour le mode Focus desktop. */
export function isDesktopWeb(os: string, width: number): boolean {
  return os === 'web' && width >= DESKTOP_BREAKPOINT;
}

/** Nb de colonnes de la grille Commerçants — RÉFÉRENCE visuelle unique des cartes YOOTOO. */
export const MERCHANT_GRID_COLUMNS = 3;

/**
 * Largeur EXACTE d'une carte de commerce, telle que produite par la grille Commerçants
 * (référence). Formule identique à la grille : (fenêtre − 2·marge − (colonnes−1)·gap) / colonnes.
 * Réutilisée par les carrousels de l'Accueil → cartes strictement identiques, sans variante.
 */
export function merchantCardWidth(windowWidth: number, gutter: number, columnGap: number): number {
  const inner = windowWidth - gutter * 2 - columnGap * (MERCHANT_GRID_COLUMNS - 1);
  return Math.max(0, inner / MERCHANT_GRID_COLUMNS);
}
