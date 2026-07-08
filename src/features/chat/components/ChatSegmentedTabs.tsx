import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import type { ChatTab } from '../store';

const TABS: { id: ChatTab; label: string }[] = [
  { id: 'all', label: 'Tous' },
  { id: 'pro', label: 'Professionnels' },
  { id: 'particulier', label: 'Particuliers' },
  { id: 'mine', label: 'Vos discussions' },
];

/**
 * Onglets du fil (Tous / Professionnels / Particuliers / Vos discussions). Capsules en verre,
 * onglet actif teinté de l'univers Chat — même langage visuel que les catégories YOOTOO.
 */
export function ChatSegmentedTabs({ tab, onChange }: { tab: ChatTab; onChange: (t: ChatTab) => void }) {
  const section = useSectionTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {TABS.map((t) => {
        const active = t.id === tab;
        return (
          <Pressable
            key={t.id}
            onPress={() => onChange(t.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            style={({ pressed }) => [
              styles.pill,
              active ? { backgroundColor: section.accent, borderColor: section.accent } : glass.panel,
              pressed && styles.pressed,
            ]}>
            <YText variant="caption" numberOfLines={1} style={{ color: active ? section.onAccent : glass.onDark, fontWeight: '700' }}>
              {t.label}
            </YText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingRight: spacing.sm, alignItems: 'center' },
  pill: {
    minHeight: 38,
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
