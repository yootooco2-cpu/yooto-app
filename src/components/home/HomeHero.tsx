import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeInDown,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  greeting: string;
  onExplore: () => void;
  scrollY: SharedValue<number>;
};

/** Plage de scroll sur laquelle l'effet de profondeur se joue (px). */
const RANGE = 200;

/**
 * HomeHero — signature visuelle de YOOTOO + parallaxe cinématique subtil.
 * Trois plans se déplacent à des vitesses légèrement différentes au scroll
 * (≤ 18 px) → sensation de profondeur quasi invisible. 100 % UI thread
 * (interpolate), aucune allocation pendant le scroll.
 */
export function HomeHero({ greeting, onExplore, scrollY }: Props) {
  // Plan 1 — halos (les plus « lointains » : décalent le plus, s'estompent un peu).
  const haloStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, RANGE], [0, 18], Extrapolation.CLAMP) },
    ],
    opacity: interpolate(scrollY.value, [0, RANGE], [1, 0.85], Extrapolation.CLAMP),
  }));

  // Plan 2 — contenu texte (un peu plus lent que le scroll).
  const contentStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(scrollY.value, [0, RANGE], [0, 10], Extrapolation.CLAMP) },
    ],
  }));

  // Plan 3 — CTA (presque fixe).
  const ctaStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: interpolate(scrollY.value, [0, RANGE], [0, 3], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={styles.hero}>
      <Animated.View style={[styles.haloLayer, haloStyle]} pointerEvents="none">
        <View style={[styles.halo, styles.haloGreen]} />
        <View style={[styles.halo, styles.haloAccent]} />
      </Animated.View>

      <Animated.View entering={FadeInDown.duration(220)} style={[styles.content, contentStyle]}>
        <YText variant="caption" color="muted">
          {greeting}
        </YText>

        <View style={styles.locationRow}>
          <View style={styles.locationDot} />
          <YText variant="caption" color="primary">
            Autour de vous
          </YText>
        </View>

        <YText variant="display" style={styles.title}>
          Découvrez les meilleurs commerces autour de vous.
        </YText>

        <YText variant="body" color="muted">
          Producteurs, épiceries et artisans responsables — soutenez le local, simplement.
        </YText>
      </Animated.View>

      <Animated.View style={[styles.cta, ctaStyle]}>
        <YButton label="Explorer la carte" fullWidth onPress={onExplore} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: {
    marginHorizontal: -spacing.lg,
    marginTop: -spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xxl,
    paddingBottom: spacing.xl,
    backgroundColor: '#EFF4EF',
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
    overflow: 'hidden',
  },
  haloLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  halo: {
    position: 'absolute',
    borderRadius: radii.pill,
  },
  haloGreen: {
    width: 260,
    height: 260,
    top: -90,
    right: -70,
    backgroundColor: 'rgba(31,122,77,0.10)',
  },
  haloAccent: {
    width: 220,
    height: 220,
    bottom: -80,
    left: -60,
    backgroundColor: 'rgba(214,168,90,0.14)',
  },
  content: {
    gap: spacing.md,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  locationDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  title: {
    letterSpacing: -1,
  },
  cta: {
    marginTop: spacing.md,
  },
});
