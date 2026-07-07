import * as Haptics from 'expo-haptics';

/**
 * Retour haptique — enveloppe tolérante autour d'`expo-haptics`. No-op silencieux là où
 * l'haptique n'existe pas (web, appareils non compatibles) : jamais de crash.
 */
export const haptics = {
  selection() {
    void Haptics.selectionAsync().catch(() => {});
  },
  light() {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
  },
  success() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  },
  error() {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
  },
};
