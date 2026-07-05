import { Image } from 'expo-image';
import { StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';

import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';

/**
 * Logo officiel YOOTOO — piste « 05E · STRATES E » (couches topographiques + point de présence).
 * Marque livrée en PNG @1x/2x/3x transparents (aucun fond blanc parasite) + SVG source.
 * Rendu via `expo-image` `contentFit="contain"` → net, jamais déformé. 3 tons :
 *  - `ink`   : marque sombre, pour fonds clairs ;
 *  - `cream` : marque crème, pour fonds sombres (verre dépoli) ;
 *  - `copper`: variante premium.
 */
export type LogoTone = 'ink' | 'cream' | 'copper';

const MARK: Record<LogoTone, ImageSourcePropType> = {
  ink: require('@/assets/images/brand/yootoo-mark.png'),
  cream: require('@/assets/images/brand/yootoo-mark-dark.png'),
  copper: require('@/assets/images/brand/yootoo-mark-copper.png'),
};

const WORD_COLOR: Record<LogoTone, string> = {
  ink: '#1A1A1A',
  cream: '#F3EEE2',
  copper: '#A9733E',
};

/** Marque seule (pictogramme), ratio 1:1, transparente. */
export function YBrandmark({ size = 40, tone = 'ink' }: { size?: number; tone?: LogoTone }) {
  return (
    <Image
      source={MARK[tone]}
      style={{ width: size, height: size }}
      contentFit="contain"
      accessibilityIgnoresInvertColors
      accessibilityLabel="YOOTOO"
    />
  );
}

interface LogoProps {
  size?: number;
  tone?: LogoTone;
  /** Afficher le mot « YOOTOO » à côté de la marque. */
  wordmark?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Verrou logo : marque + mot-symbole « YOOTOO » (lettrage large, sobre). */
export function YLogo({ size = 44, tone = 'ink', wordmark = true, style }: LogoProps) {
  return (
    <View style={[styles.row, style]}>
      <YBrandmark size={size} tone={tone} />
      {wordmark ? (
        <YText
          variant="subtitle"
          style={[
            styles.word,
            { color: WORD_COLOR[tone], fontSize: size * 0.44, letterSpacing: size * 0.12 },
          ]}>
          YOOTOO
        </YText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  word: {
    fontWeight: '600',
  },
});
