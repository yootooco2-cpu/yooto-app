import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { grainDataUri } from '../theme';

type Props = {
  variant?: 'paper' | 'slate';
  opacity?: number;
};

/**
 * Grain — texture papier / ardoise discrète (SVG feTurbulence via expo-image).
 * Overlay non interactif, en remplissage absolu du parent. Web : rendu du filtre ;
 * natif : peut rester transparent (dégradation silencieuse).
 */
export function Grain({ variant = 'paper', opacity = 0.5 }: Props) {
  const uri =
    variant === 'slate'
      ? grainDataUri(0.95, 0.93, 0.85, 0.5, 1.1)
      : grainDataUri(0.42, 0.36, 0.24, 0.5, 0.85);
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Image source={{ uri }} style={[StyleSheet.absoluteFill, { opacity }]} contentFit="cover" />
    </View>
  );
}
