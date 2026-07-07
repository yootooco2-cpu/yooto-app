/**
 * Réglages d'animation de la navigation verticale (halo actif, retour tactile). Centralisés pour
 * une sensation cohérente façon Apple : ressort ferme peu rebondissant, appui doux, apparition
 * fluide. Consommés par `FloatingMapNavigationItem`.
 */
export const mapNavAnimations = {
  /** Ressort du halo actif (apparition / déplacement). */
  halo: { damping: 18, stiffness: 220, mass: 0.8 },
  /** Ressort du retour tactile à l'appui. */
  press: { damping: 15, stiffness: 340, mass: 0.6 },
  /** Échelle appliquée à l'appui. */
  pressScale: 0.88,
  /** Apparition de la barre (ms). */
  appear: 320,
} as const;
