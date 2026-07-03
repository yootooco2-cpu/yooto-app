import { Feather } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

interface Props {
  onAuthorize: () => void;
  onDismiss: () => void;
}

/**
 * Carte soft-ask de localisation — présentée comme un SERVICE, jamais une autorisation
 * imposée. Le dialogue système n'est déclenché qu'au tap sur « Autoriser » (côté appelant).
 */
export function LocationPrompt({ onAuthorize, onDismiss }: Props) {
  return (
    <Animated.View
      style={styles.card}
      entering={FadeInDown.duration(260)}
      exiting={FadeOutDown.duration(180)}
      accessibilityRole="alert">
      <View style={styles.row}>
        <View style={styles.iconBadge}>
          <Feather name="map-pin" size={18} color={colors.primary} />
        </View>
        <View style={styles.text}>
          <YText variant="subtitle">Utilisez votre position</YText>
          <YText variant="body" color="muted">
            Découvrez automatiquement les meilleurs commerces autour de vous.
          </YText>
        </View>
      </View>
      <View style={styles.actions}>
        <View style={styles.actionItem}>
          <YButton label="Plus tard" variant="ghost" fullWidth onPress={onDismiss} />
        </View>
        <View style={styles.actionItem}>
          <YButton label="Autoriser" fullWidth onPress={onAuthorize} />
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
    ...shadows.lg,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.md,
    alignItems: 'center',
  },
  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,122,77,0.10)',
  },
  text: {
    flex: 1,
    gap: 2,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionItem: {
    flex: 1,
  },
});
