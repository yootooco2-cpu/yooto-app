/**
 * Rayons d'arrondi YOOTOO.
 * Des formes douces et arrondies pour un rendu chaleureux et moderne.
 */
export const radii = {
  none: 0,
  sm: 8,
  md: 12,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export type Radius = keyof typeof radii;
