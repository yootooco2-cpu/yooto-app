import BottomSheet, {
  BottomSheetBackdrop,
  BottomSheetView,
  type BottomSheetBackdropProps,
} from '@gorhom/bottom-sheet';
import { useCallback, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';

import { MapEngine } from '@/components/map';
import { YButton } from '@/components/ui/YButton';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { spacing } from '@/design/tokens/spacing';

/**
 * SPIKE PR4.1 — évaluation de @gorhom/bottom-sheet au-dessus de la carte Mapbox.
 *
 * Objectif UNIQUE : juger la fluidité (drag souris/tactile, FPS, conflits de gestes).
 * Aucune logique métier : sheet VIDE + poignée + backdrop + snap points (20 % / 80 %).
 * Route jetable (`/spike-bottomsheet`) → supprimée si NO-GO, sinon informe PR4.2.
 */
export default function BottomSheetSpike() {
  const ref = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['20%', '80%'], []);

  const renderBackdrop = useCallback(
    (props: BottomSheetBackdropProps) => (
      <BottomSheetBackdrop {...props} appearsOnIndex={1} disappearsOnIndex={0} opacity={0.4} />
    ),
    [],
  );

  return (
    <View style={styles.fill}>
      {/* Vraie carte Mapbox (web) pour tester le sheet AU-DESSUS + les conflits de gestes. */}
      <MapEngine fill markers={[]} />

      <BottomSheet
        ref={ref}
        index={0}
        snapPoints={snapPoints}
        enablePanDownToClose={false}
        backdropComponent={renderBackdrop}>
        <BottomSheetView style={styles.content}>
          <YText variant="subtitle">Spike — Bottom Sheet</YText>
          <YText variant="body" color="muted">
            Panneau vide au-dessus de la carte. Teste : drag (poignée + contenu) entre 20 % et 80 %,
            fluidité, FPS, conflits de gestes avec la carte.
          </YText>
          <View style={styles.row}>
            <YButton label="Réduire 20 %" variant="secondary" onPress={() => ref.current?.snapToIndex(0)} />
            <YButton label="Étendre 80 %" onPress={() => ref.current?.snapToIndex(1)} />
          </View>
        </BottomSheetView>
      </BottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
});
