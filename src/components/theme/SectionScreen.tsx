import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { type SharedValue } from 'react-native-reanimated';

import { SectionBackground } from '@/components/theme/SectionBackground';
import { SectionThemeProvider } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { type SectionKey } from '@/design/theme/sections';

interface Props {
  section: SectionKey;
  /** Hauteur de la bande de fond d'ambiance en tête (px). */
  height?: number;
  /** Scroll partagé → parallax très discret du fond. */
  scrollY?: SharedValue<number>;
  children: ReactNode;
}

/** Enveloppe d'écran d'ONGLET : pose l'identité de l'univers + son FOND d'ambiance (image ou
 *  dégradé de secours) en tête, derrière un contenu transparent. Discret, jamais gênant. */
function Backdrop({ height, scrollY, children }: Omit<Props, 'section'>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.ambient, { height: height ?? 360 }]} pointerEvents="none">
        <SectionBackground scrollY={scrollY} />
      </View>
      {children}
    </View>
  );
}

export function SectionScreen({ section, height, scrollY, children }: Props) {
  return (
    <SectionThemeProvider section={section}>
      <Backdrop height={height} scrollY={scrollY}>
        {children}
      </Backdrop>
    </SectionThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0 },
});
