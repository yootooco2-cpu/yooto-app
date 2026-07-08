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
  /** Afficher le mot « YOOTOO » avec la marque. */
  wordmark?: boolean;
  /** `row` = marque + mot côte à côte ; `stack` = signature (marque au-dessus du mot). */
  orientation?: 'row' | 'stack';
  style?: StyleProp<ViewStyle>;
}

/** Verrou logo : marque + mot-symbole « YOOTOO » (lettrage large, sobre). */
export function YLogo({ size = 44, tone = 'ink', wordmark = true, orientation = 'row', style }: LogoProps) {
  const stack = orientation === 'stack';
  return (
    <View style={[stack ? styles.stack : styles.row, style]}>
      {/* En signature, compense la marge interne (6 %) de la marque → bord gauche visible
          aligné sur le mot « YOOTOO » et le reste de la grille. */}
      <View style={stack ? { marginLeft: -size * 0.06 } : undefined}>
        <YBrandmark size={size} tone={tone} />
      </View>
      {wordmark ? (
        <YText
          variant="subtitle"
          style={[
            styles.word,
            {
              color: WORD_COLOR[tone],
              fontSize: size * (stack ? 0.4 : 0.44),
              letterSpacing: size * (stack ? 0.16 : 0.12),
              marginTop: stack ? size * 0.14 : 0,
            },
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
  stack: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  word: {
    fontWeight: '600',
  },
});
