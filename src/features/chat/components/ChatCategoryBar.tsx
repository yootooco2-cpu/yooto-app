import { Feather } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { CHAT_CATEGORIES } from '../categories';

interface Props {
  /** Catégorie active (`all` = toutes). */
  activeId: string;
  onSelect: (id: string) => void;
}

/**
 * Barre horizontale des CATÉGORIES de discussion. Chaque capsule active prend la COULEUR de sa
 * catégorie (identité chaleureuse et repérage immédiat) ; « Toutes » prend l'accent de l'univers.
 */
export function ChatCategoryBar({ activeId, onSelect }: Props) {
  const section = useSectionTheme();
  const items = [{ id: 'all', label: 'Toutes', icon: 'grid' as const, accent: section.accent }, ...CHAT_CATEGORIES];

  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {items.map((c) => {
        const active = c.id === activeId;
        return (
          <Pressable
            key={c.id}
            onPress={() => onSelect(c.id)}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={c.label}
            style={({ pressed }) => [
              styles.chip,
              active ? { backgroundColor: c.accent, borderColor: c.accent } : glass.panel,
              pressed && styles.pressed,
            ]}>
            <Feather name={c.icon} size={15} color={active ? '#FFFFFF' : glass.onDark} />
            <YText variant="caption" numberOfLines={1} style={{ color: active ? '#FFFFFF' : glass.onDark, fontWeight: '700' }}>
              {c.label}
            </YText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: spacing.sm, paddingRight: spacing.sm, alignItems: 'center' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm - 2,
    minHeight: 38,
    paddingVertical: 8,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
});
