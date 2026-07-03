import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { spacing } from '@/design/tokens/spacing';

type Props = {
  prefersProducers: boolean;
  interactionCount: number;
};

/** Statistiques de préférences (lecture seule). */
export function PreferenceStats({ prefersProducers, interactionCount }: Props) {
  return (
    <View style={styles.block}>
      <View style={styles.row}>
        <YText variant="caption" color="muted">
          Producteurs
        </YText>
        <YText variant="caption" color={prefersProducers ? 'primary' : 'muted'}>
          {prefersProducers ? 'Oui' : 'Non'}
        </YText>
      </View>
      <View style={styles.row}>
        <YText variant="caption" color="muted">
          Interactions enregistrées
        </YText>
        <YText variant="caption" color="default">
          {interactionCount}
        </YText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
  },
});
