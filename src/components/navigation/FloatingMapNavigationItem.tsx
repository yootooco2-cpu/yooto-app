import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { type ComponentProps, useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

import type { MapNavTheme } from '@/theme/MapNavigationTheme';

import { mapNavAnimations } from './MapNavigationAnimations';

export type MapNavIcon =
  | { set: 'feather'; name: ComponentProps<typeof Feather>['name'] }
  | { set: 'mci'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

interface Props {
  icon: MapNavIcon;
  active: boolean;
  theme: MapNavTheme;
  label: string;
  onPress: () => void;
}

/** Item de la navigation verticale : icône minimaliste + halo sable animé (actif) + retour
 *  tactile doux à l'appui. Aucun label (immersion carte). */
export function FloatingMapNavigationItem({ icon, active, theme, label, onPress }: Props) {
  const a = useSharedValue(active ? 1 : 0);
  const press = useSharedValue(0);

  useEffect(() => {
    a.value = withSpring(active ? 1 : 0, mapNavAnimations.halo);
  }, [active, a]);

  const haloStyle = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ scale: 0.5 + 0.5 * a.value }] }));
  const dotStyle = useAnimatedStyle(() => ({ opacity: a.value, transform: [{ scale: a.value }] }));
  const contentStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 - press.value * (1 - mapNavAnimations.pressScale) }] }));

  const color = active ? theme.onAccent : theme.icon;

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => (press.value = withSpring(1, mapNavAnimations.press))}
      onPressOut={() => (press.value = withSpring(0, mapNavAnimations.press))}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      hitSlop={6}
      style={styles.item}>
      <Animated.View style={[styles.content, contentStyle]}>
        <Animated.View style={[styles.halo, { backgroundColor: theme.accent }, haloStyle]} />
        {icon.set === 'feather' ? (
          <Feather name={icon.name} size={21} color={color} />
        ) : (
          <MaterialCommunityIcons name={icon.name} size={22} color={color} />
        )}
      </Animated.View>
      <Animated.View style={[styles.dot, { backgroundColor: theme.dot }, dotStyle]} />
    </Pressable>
  );
}

const SIZE = 44;

const styles = StyleSheet.create({
  item: { alignItems: 'center', justifyContent: 'center' },
  content: { width: SIZE, height: SIZE, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: SIZE, height: SIZE, borderRadius: SIZE / 2 },
  dot: { position: 'absolute', right: -3, width: 5, height: 5, borderRadius: 2.5 },
});
