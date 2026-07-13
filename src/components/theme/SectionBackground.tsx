import { BlurView } from 'expo-blur';
import { Image as ExpoImage } from 'expo-image';
import { StyleSheet } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  interpolate,
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';

import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { SECTION_BACKGROUNDS } from '@/theme';

import { BackgroundOverlay } from './BackgroundOverlay';
import { SectionAmbient } from './SectionAmbient';

interface Props {
  /** Valeur de scroll (pour un parallax très discret). */
  scrollY?: SharedValue<number>;
  /** Amplitude du parallax (px). */
  parallax?: number;
  /**
   * `true` = le fond DÉFILE avec le contenu (1:1) : l'immersif appartient à la page — un héro
   * qu'on dépasse — et ne réapparaît jamais dans les interstices une fois la page défilée.
   * `false` (défaut) = fond fixe au viewport avec parallax discret (comportement historique).
   */
  scrollAway?: boolean;
}

/**
 * Fond d'ambiance d'UNIVERS façon Apple / Airbnb : image (WebP, cache mémoire+disque, lazy),
 * léger flou, voile teinté du thème, parallax très discret, fondu progressif vers le fond
 * d'écran et apparition douce au changement d'onglet. La lecture n'est jamais gênée.
 * Les univers sans image retombent sur le dégradé d'ambiance (`SectionAmbient`).
 */
export function SectionBackground({ scrollY, parallax = 22, scrollAway = false }: Props) {
  const section = useSectionTheme();
  const { scheme } = useTheme();
  const bg = SECTION_BACKGROUNDS[section.key];

  const imgStyle = useAnimatedStyle(() => {
    if (!scrollY) return {};
    if (scrollAway) {
      // Défilement 1:1 avec le contenu ; l'overscroll (tirer vers le bas) est amorti par le
      // débord PAD de l'image — jamais de bord révélé.
      const ty = scrollY.value < -PAD ? PAD : -scrollY.value;
      return { transform: [{ translateY: ty }] };
    }
    const ty = interpolate(scrollY.value, [0, 240], [0, -parallax], Extrapolation.CLAMP);
    const scale = interpolate(scrollY.value, [0, 240], [1.06, 1.12], Extrapolation.CLAMP);
    return { transform: [{ translateY: ty }, { scale }] };
  });

  if (!bg) return <SectionAmbient />;

  // En mode « scrollAway », c'est le BLOC ENTIER (image + flou + voile + fondu) qui défile :
  // le fondu bas du BackgroundOverlay se termine sur la couleur d'écran → couture invisible.
  return (
    <Animated.View entering={FadeIn.duration(500)} style={[StyleSheet.absoluteFill, scrollAway ? imgStyle : null]}>
      <Animated.View style={[styles.imgWrap, scrollAway ? null : imgStyle]}>
        <ExpoImage
          source={bg.background}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          cachePolicy="memory-disk"
          transition={350}
          priority="high"
          accessible={false}
        />
      </Animated.View>
      {/* Flou runtime TRÈS léger (profondeur premium) — l'asset est net, on ne le regomme pas. */}
      <BlurView intensity={scheme === 'dark' ? 8 : 4} tint={scheme === 'dark' ? 'dark' : 'light'} style={StyleSheet.absoluteFill} pointerEvents="none" />
      <BackgroundOverlay veil={bg.veil} veilOpacity={bg.veilOpacity} />
    </Animated.View>
  );
}

// Déborde légèrement pour que le parallax/zoom ne révèle jamais de bord.
const PAD = 28;
const styles = StyleSheet.create({
  imgWrap: { position: 'absolute', top: -PAD, left: -PAD, right: -PAD, bottom: -PAD },
});
