import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { hasMerchantPhoto, useMerchants } from '@/features/merchants';

/**
 * Diagnostic DEV — couverture photo des commerces chargés (total / avec photo / sans / %).
 * VISIBLE UNIQUEMENT en développement : rendu `null` hors `__DEV__` (et l'appelant garde la garde).
 * N'affecte pas le filtrage ni l'UX (overlay `pointerEvents="none"`).
 */
export function MerchantPhotoCoverageDev() {
  const { data } = useMerchants();
  if (!__DEV__) return null;

  const all = data ?? [];
  const total = all.length;
  const withPhoto = all.filter(hasMerchantPhoto).length;
  const without = total - withPhoto;
  const pct = total ? Math.round((withPhoto / total) * 100) : 0;

  return (
    <View style={[styles.chip, glass.panel]} pointerEvents="none">
      <YText style={styles.txt}>DEV · Photos {withPhoto}/{total} ({pct}%) · sans {without}</YText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: { position: 'absolute', left: 12, bottom: 96, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill, opacity: 0.92 },
  txt: { fontSize: 11, fontWeight: '700', color: glass.onDark },
});
