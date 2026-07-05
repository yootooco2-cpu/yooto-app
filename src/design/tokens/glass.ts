import { Platform, type ViewStyle } from 'react-native';

/**
 * Verre dépoli SOMBRE (R6) — chrome premium posé sur la carte lumineuse : le fort contraste
 * interface sombre ↔ scène claire fait ressortir la carte (cf. Direction Artistique de référence).
 * Le flou d'arrière-plan (`backdropFilter`) n'existe que sur web (cible S1 — ADR-001) ; sur natif,
 * on garde le fond translucide sombre (dégradation gracieuse, aucun crash).
 */
const base: ViewStyle = {
  backgroundColor: 'rgba(24, 30, 27, 0.60)',
  borderWidth: 1,
  borderColor: 'rgba(255, 255, 255, 0.14)',
};

export const glass = {
  /** Panneau/pilule en verre dépoli sombre. */
  panel: (Platform.OS === 'web'
    ? { ...base, backdropFilter: 'blur(16px) saturate(1.25)', WebkitBackdropFilter: 'blur(16px) saturate(1.25)' }
    : base) as ViewStyle,
  /** Texte / icônes sur verre sombre. */
  onDark: '#F3EEE2',
  /** Texte secondaire / placeholder sur verre sombre. */
  onDarkMuted: 'rgba(243, 238, 226, 0.68)',
} as const;
