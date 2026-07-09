import { StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { radii } from '@/design/tokens/radii';

import { activityKindChip } from '../activityKind';
import type { ActivityKind } from '../types';
import { PublicationCrypto } from './PublicationCrypto';

/**
 * Chip DISCRÈTE de type de publication (Nouveauté, Fournée, Dégustation…) — même langage visuel que
 * les catégories : petite pastille très arrondie, fond légèrement translucide teinté de l'accent,
 * icône Feather monochrome + libellé. Compacte et raffinée : identifie le type sans voler la vedette
 * au commerçant ni au contenu. Remplace les gros emojis décoratifs (présentation uniquement).
 */
export function PublicationTypeChip({ kind, accent }: { kind: ActivityKind; accent: string }) {
  const chip = activityKindChip(kind);
  return (
    <View style={[styles.chip, { backgroundColor: `${accent}1F` }]}>
      <PublicationCrypto id={chip.crypto} size={14} color={accent} />
      <YText style={[styles.label, { color: accent }]}>{chip.label}</YText>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: radii.pill,
  },
  label: { fontSize: 11.5, fontWeight: '700', letterSpacing: -0.1 },
});
