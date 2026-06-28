import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { shadows } from '@/design/tokens/shadows';

type Props = {
  /** Position horizontale en % (0–100) sur la carte. */
  x: number;
  /** Position verticale en % (0–100) sur la carte. */
  y: number;
  label: string;
  active?: boolean;
  onPress?: () => void;
};

export function MapMarkerPin({ x, y, label, active = false, onPress }: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.wrapper, { left: `${x}%`, top: `${y}%` }]}>
      <View style={[styles.dot, shadows.sm, active && styles.dotActive]}>
        <YText variant="caption" color={active ? 'inverse' : 'default'}>
          {label}
        </YText>
      </View>
      <View style={[styles.tip, active && styles.tipActive]} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    alignItems: 'center',
    // recentre le pin sur le point (compense ~la moitié de sa taille)
    transform: [{ translateX: -16 }, { translateY: -34 }],
  },
  dot: {
    minWidth: 32,
    height: 32,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  tip: {
    width: 8,
    height: 8,
    marginTop: -4,
    backgroundColor: colors.surface,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
    transform: [{ rotate: '45deg' }],
  },
  tipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
});
