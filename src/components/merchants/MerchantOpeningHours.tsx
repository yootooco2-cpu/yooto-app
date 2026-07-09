import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import type { Merchant } from '@/features/merchants';
import { resolveOpeningHours } from '@/features/merchants/openingHours';

type Props = { merchant: Merchant };

/**
 * Section « Horaires » de la fiche détaillée. Priorise le jour courant, dévoile la semaine
 * complète à la demande, et indique clairement ouvert/fermé. N'invente jamais d'horaire :
 * quand la donnée est absente, affiche « Horaires non disponibles » proprement.
 */
export function MerchantOpeningHours({ merchant }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const hours = resolveOpeningHours(merchant);
  const open = merchant.isOpenNow;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <YText style={[styles.title, { color: colors.text }]}>Horaires</YText>
        <View style={[styles.status, { borderColor: colors.border }]}>
          <View style={[styles.dot, { backgroundColor: open ? colors.success : colors.mutedText }]} />
          <YText style={[styles.statusText, { color: open ? colors.success : colors.mutedText }]}>
            {open ? 'Ouvert' : 'Fermé'}
          </YText>
        </View>
      </View>

      {!hours.available ? (
        <YText style={[styles.unavailable, { color: colors.mutedText }]}>Horaires non disponibles</YText>
      ) : (
        <View style={[styles.card, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
          {/* Jour courant mis en avant (ou repli sur la semaine si non identifié). */}
          {hours.today ? (
            <View style={styles.todayRow}>
              <YText style={[styles.todayLabel, { color: colors.text }]}>{"Aujourd'hui"}</YText>
              <YText style={[styles.todayHours, { color: colors.text }]}>{hours.today.hours}</YText>
            </View>
          ) : null}

          {expanded || !hours.today
            ? hours.week.map((day) => (
                <View key={day.day} style={styles.weekRow}>
                  <YText style={[styles.weekDay, { color: day.isToday ? colors.text : colors.mutedText }, day.isToday && styles.weekDayToday]}>
                    {day.day}
                  </YText>
                  <YText style={[styles.weekHours, { color: day.isToday ? colors.text : colors.mutedText }]}>{day.hours}</YText>
                </View>
              ))
            : null}

          {hours.today && hours.week.length > 1 ? (
            <Pressable
              onPress={() => setExpanded((v) => !v)}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={expanded ? 'Masquer la semaine' : 'Voir la semaine complète'}
              style={styles.toggle}>
              <YText style={[styles.toggleText, { color: colors.primary }]}>
                {expanded ? 'Masquer la semaine' : 'Voir la semaine complète'}
              </YText>
              <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  statusText: { fontSize: 12.5, fontWeight: '700' },
  unavailable: { fontSize: 14 },
  card: { borderRadius: radii.lg, borderWidth: 1, padding: spacing.md, gap: spacing.xs },
  todayRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingBottom: spacing.xs },
  todayLabel: { fontSize: 14, fontWeight: '700' },
  todayHours: { fontSize: 14, fontWeight: '700', fontVariant: ['tabular-nums'] },
  weekRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 3 },
  weekDay: { fontSize: 13.5 },
  weekDayToday: { fontWeight: '700' },
  weekHours: { fontSize: 13.5, fontVariant: ['tabular-nums'] },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: spacing.xs },
  toggleText: { fontSize: 13.5, fontWeight: '700' },
});
