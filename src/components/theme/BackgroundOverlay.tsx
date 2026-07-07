import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/design/theme/ThemeProvider';

interface Props {
  /** Couleur du voile teinté de l'univers. */
  veil: string;
  /** Opacité du voile (0..1). */
  veilOpacity: number;
}

/**
 * Voile + fondu posés sur une image d'ambiance : voile teinté de l'univers, léger scrim haut
 * (lisibilité sous la barre de statut) et fondu PROGRESSIF vers la couleur d'écran en bas
 * (aucune coupure brutale, contenu toujours lisible). Réutilisable.
 */
export function BackgroundOverlay({ veil, veilOpacity }: Props) {
  const { colors } = useTheme();
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={[StyleSheet.absoluteFill, { backgroundColor: veil, opacity: veilOpacity }]} />
      <LinearGradient
        colors={['rgba(0,0,0,0.12)', 'transparent', colors.background]}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
      />
    </View>
  );
}
