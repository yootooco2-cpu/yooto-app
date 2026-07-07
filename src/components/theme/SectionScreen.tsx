import { type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { SectionAmbient } from '@/components/theme/SectionAmbient';
import { SectionThemeProvider } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { type SectionKey } from '@/design/theme/sections';

interface Props {
  section: SectionKey;
  /** Hauteur de la bande d'ambiance en tête (px). */
  ambientHeight?: number;
  /** Intensité de l'ambiance (0..1). */
  intensity?: number;
  children: ReactNode;
}

/** Enveloppe d'écran d'ONGLET : pose l'identité de l'univers + une bande d'ambiance en tête,
 *  derrière un contenu transparent. Fond émotionnel discret, jamais gênant pour la lecture. */
function Backdrop({ ambientHeight, intensity, children }: Omit<Props, 'section'>) {
  const { colors } = useTheme();
  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.ambient, { height: ambientHeight ?? 300 }]} pointerEvents="none">
        <SectionAmbient intensity={intensity ?? 0.5} />
      </View>
      {children}
    </View>
  );
}

export function SectionScreen({ section, ambientHeight, intensity, children }: Props) {
  return (
    <SectionThemeProvider section={section}>
      <Backdrop ambientHeight={ambientHeight} intensity={intensity}>
        {children}
      </Backdrop>
    </SectionThemeProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  ambient: { position: 'absolute', top: 0, left: 0, right: 0 },
});
