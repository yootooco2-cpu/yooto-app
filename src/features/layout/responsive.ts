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
