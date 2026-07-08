/**
 * Jetons de mouvement (R6) — vocabulaire d'animation partagé pour que toutes les surfaces
 * respirent au même rythme. Purement descriptif : des durées (ms) et des réglages de ressort
 * consommés par `Animated`. Aucune dépendance runtime, donc testable et sans effet de bord.
 *
 * Règle produit : une transition premium est *rapide mais douce* — assez courte pour rester
 * vive, assez amortie pour ne jamais paraître nerveuse. On préfère un ressort peu rebondissant
 * à un mouvement linéaire (plus naturel à l'œil).
 */
export const motion = {
  duration: {
    /** Micro-retour (appui bouton, bascule d'état). */
    fast: 140,
    /** Transition standard (fondu du voile, sortie de feuille). */
    base: 220,
    /** Entrée ample (feuille qui surgit). */
    slow: 320,
  },
  /** Réglages de ressort pour `Animated.spring` (useNativeDriver). */
  spring: {
    /** Entrée de surface : ferme, à peine rebondissante. */
    sheet: { damping: 22, stiffness: 240, mass: 1 },
    /** Micro-interaction d'appui : très réactive, sans rebond. */
    press: { damping: 18, stiffness: 320, mass: 0.6 },
  },
  /** Échelle appliquée à un élément pressé (micro-interaction tactile). */
  pressScale: 0.97,
} as const;

export type Motion = typeof motion;
