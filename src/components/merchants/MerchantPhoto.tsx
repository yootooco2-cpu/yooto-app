import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, View } from 'react-native';

import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';

/** Dégradé tonal du repli premium (vert profond → surface) — discret, jamais « placeholder ». */
const FALLBACK_GRADIENT = ['#26302A', '#18211B'] as const;

type Props = {
  uri: string | null;
  /** Hauteur fixe (px). Ignorée si `fill` (la photo épouse alors la hauteur du parent). */
  height?: number;
  /** Remplit le parent (width/height 100 %) → laisse le parent piloter le RATIO (responsive). */
  fill?: boolean;
  rounded?: number;
  /** Clé de recyclage (id commerce) pour un défilement de liste fluide. */
  recyclingKey?: string;
  /** Échec de chargement (URL 404/cassée) — permet au parent de retirer la photo. */
  onError?: () => void;
};

/**
 * Photo de commerce (expo-image). Sans photo réelle → REPLI PREMIUM discret : dégradé tonal + feuille
 * YOOTOO en filigrane (aucun texte « YOOTOO », aucun signal de prototype). Priorité de la source
 * gérée en amont par `getMerchantCoverPhoto` (cover → photo → galerie).
 */
export function MerchantPhoto({ uri, height, fill = false, rounded = radii.lg, recyclingKey, onError }: Props) {
  const dims = fill ? ({ width: '100%', height: '100%' } as const) : ({ width: '100%' as const, height });

  if (uri) {
    return (
      <Image
        source={uri}
        style={{ ...dims, borderRadius: rounded, backgroundColor: colors.border }}
        contentFit="cover"
        transition={220}
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        onError={onError}
      />
    );
  }

  const leaf = fill ? 30 : Math.max(22, Math.min(40, (height ?? 120) * 0.26));
  return (
    <View style={[styles.fallback, dims, { borderRadius: rounded }]}>
      <LinearGradient colors={FALLBACK_GRADIENT} start={{ x: 0.1, y: 0 }} end={{ x: 0.9, y: 1 }} style={StyleSheet.absoluteFill} />
      <MaterialCommunityIcons name="leaf" size={leaf} color="rgba(243,240,232,0.15)" />
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { width: '100%', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
