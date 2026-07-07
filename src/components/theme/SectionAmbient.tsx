import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent, type ViewStyle } from 'react-native';

import { AMBIENTS } from '@/assets/themes/ambients';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';

interface Props {
  /** Intensité globale (0..1) — bas par défaut pour ne jamais gêner la lecture. */
  intensity?: number;
  /** Fond l'ambiance vers la couleur d'écran en bas (headers). Défaut: true. */
  fade?: boolean;
  style?: ViewStyle;
}

/**
 * Fond d'ambiance d'UNIVERS (réutilisable) : dégradé de la section + bokeh flous, très diffus.
 * Remplit son parent (le parent contrôle la taille/position). Fond ÉMOTIONNEL uniquement :
 * faible opacité + fondu vers la couleur d'écran → la lecture n'est jamais gênée.
 */
export function SectionAmbient({ intensity = 0.55, fade = true, style }: Props) {
  const section = useSectionTheme();
  const { colors } = useTheme();
  const [size, setSize] = useState({ w: 0, h: 0 });
  const maxDim = Math.max(size.w, size.h);
  const composition = AMBIENTS[section.key];

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setSize({ w: width, h: height });
  };

  return (
    <View style={[StyleSheet.absoluteFill, style]} onLayout={onLayout} pointerEvents="none">
      <LinearGradient
        colors={section.gradient}
        start={{ x: 0.1, y: 0 }}
        end={{ x: 0.9, y: 1 }}
        style={[StyleSheet.absoluteFill, { opacity: intensity }]}
      />

      {maxDim > 0
        ? composition.blobs.map((b, i) => {
            const d = b.size * maxDim;
            return (
              <View
                key={i}
                style={{
                  position: 'absolute',
                  width: d,
                  height: d,
                  borderRadius: d / 2,
                  left: b.x * size.w - d / 2,
                  top: b.y * size.h - d / 2,
                  backgroundColor: section.bokeh[b.tone],
                  opacity: b.opacity * intensity,
                }}
              />
            );
          })
        : null}

      {/* Fondu vers la couleur d'écran (bas) → contenu toujours lisible. */}
      {fade ? (
        <LinearGradient
          colors={['transparent', colors.background]}
          start={{ x: 0.5, y: 0.25 }}
          end={{ x: 0.5, y: 1 }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </View>
  );
}
