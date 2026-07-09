import { Feather } from '@expo/vector-icons';
import { type ComponentProps } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type FeatherName = ComponentProps<typeof Feather>['name'];
type Variant = 'primary' | 'secondary';

interface Props {
  icon: FeatherName;
  label: string;
  /** `primary` = action principale (plein, vert). `secondary` = discret mais lisible. */
  variant?: Variant;
  onPress: () => void;
  disabled?: boolean;
  /** S'étire pour remplir la largeur disponible (dans une rangée flex). */
  fullWidth?: boolean;
  style?: ViewStyle;
}

/**
 * Bouton d'action PREMIUM — hauteur généreuse, coins doux, icône parfaitement centrée, équilibre
 * icône/texte, états soignés : pressed (mobile), hover (web) et disabled élégant. Hiérarchie
 * claire primaire ↔ secondaire. Thémé (mêmes tokens partout → une seule DA).
 */
export function ActionButton({ icon, label, variant = 'secondary', onPress, disabled, fullWidth, style }: Props) {
  const { colors } = useTheme();
  const isPrimary = variant === 'primary';
  const press = useSharedValue(0);
  const hover = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - press.value * 0.03 }],
  }));
  // Le calque hover porte la couleur EXACTE de la palette et n'apparaît qu'au survol (opacité).
  const hoverStyle = useAnimatedStyle(() => ({ opacity: hover.value * 1 }));
  // Pressed : léger assombrissement (voile noir discret) — jamais de flash blanc.
  const pressStyle = useAnimatedStyle(() => ({ opacity: press.value * 0.14 }));

  const fg = disabled ? colors.mutedText : isPrimary ? colors.onPrimary : colors.text;
  const baseBg = isPrimary ? colors.primary : colors.surfaceAlt;
  const hoverBg = isPrimary ? colors.primaryHover : colors.surfaceAltHover;
  const border: ViewStyle = isPrimary ? {} : { borderWidth: 1, borderColor: colors.border };

  return (
    <Animated.View style={[fullWidth && styles.grow, animatedStyle, style]}>
      <Pressable
        onPress={disabled ? undefined : onPress}
        onPressIn={() => (press.value = withTiming(1, { duration: 90 }))}
        onPressOut={() => (press.value = withTiming(0, { duration: 160 }))}
        onHoverIn={() => (hover.value = withTiming(1, { duration: 130 }))}
        onHoverOut={() => (hover.value = withTiming(0, { duration: 180 }))}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ disabled: !!disabled }}
        accessibilityLabel={label}
        style={[styles.btn, border, { backgroundColor: baseBg }, disabled && styles.disabled]}>
        {/* Calques (couleur exacte au survol, voile pressed) derrière le contenu. Zéro blanc. */}
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay, { backgroundColor: hoverBg }, hoverStyle]} />
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.overlay, styles.pressVeil, pressStyle]} />
        <View style={styles.content}>
          <Feather name={icon} size={18} color={fg} />
          <YText variant="label" numberOfLines={1} style={[styles.label, { color: fg }]}>
            {label}
          </YText>
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  btn: {
    height: 54,
    borderRadius: radii.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  overlay: { borderRadius: radii.lg },
  pressVeil: { backgroundColor: '#000000' },
  content: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingHorizontal: spacing.md },
  label: { fontWeight: '700' },
  disabled: { opacity: 0.45 },
});
