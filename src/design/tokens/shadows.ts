import type { ViewStyle } from 'react-native';

import { colors } from './colors';

/**
 * Ombres YOOTOO.
 * Élévations subtiles et chaudes (teinte basée sur la couleur de texte profonde),
 * compatibles iOS / Android (elevation) et Web (react-native-web → boxShadow).
 */
export const shadows = {
  none: {},
  sm: {
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  md: {
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  lg: {
    shadowColor: colors.text,
    shadowOpacity: 0.14,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 10,
  },
} as const satisfies Record<string, ViewStyle>;

export type ShadowLevel = keyof typeof shadows;
