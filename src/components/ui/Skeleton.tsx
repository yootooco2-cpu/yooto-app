import { useEffect } from 'react';
import { StyleSheet, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withRepeat, withTiming } from 'react-native-reanimated';

/**
 * Bloc SKELETON premium YOOTOO — verre dépoli sombre, pulsation TRÈS douce (jamais gadget).
 * Respecte « reduced-motion » (statique si l'utilisateur limite les animations). À composer pour
 * reproduire la forme du contenu réel (image, ligne de titre, etc.) → aucune rupture visuelle.
 */
export function Skeleton({
  width = '100%',
  height = 12,
  radius = 8,
  style,
}: {
  width?: ViewStyle['width'];
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const reduce = useReducedMotion();
  const p = useSharedValue(0);

  useEffect(() => {
    if (reduce) return;
    p.value = withRepeat(withTiming(1, { duration: 950 }), -1, true);
  }, [p, reduce]);

  const anim = useAnimatedStyle(() => ({ opacity: 0.4 + 0.35 * p.value }));

  return <Animated.View style={[styles.base, { width, height, borderRadius: radius }, style, anim]} />;
}

const styles = StyleSheet.create({
  base: { backgroundColor: 'rgba(255,255,255,0.09)' },
});
