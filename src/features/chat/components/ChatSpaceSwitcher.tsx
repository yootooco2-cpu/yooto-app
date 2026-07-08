import { Feather } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import type { ChatSpace } from '../store';

const SPACES: { id: ChatSpace; label: string; icon: keyof typeof Feather.glyphMap }[] = [
  { id: 'activity', label: 'Activité', icon: 'zap' },
  { id: 'discussions', label: 'Discussions', icon: 'message-square' },
  { id: 'messages', label: 'Messages', icon: 'mail' },
];

/**
 * Sélecteur des trois ESPACES du Chat : Activité (le fil vivant) · Discussions (public) ·
 * Messages (privé). Contrôle segmenté en verre, segment actif teinté de l'univers Chat.
 */
export function ChatSpaceSwitcher({ space, onChange, unread = 0 }: { space: ChatSpace; onChange: (s: ChatSpace) => void; unread?: number }) {
  const section = useSectionTheme();
  return (
    <View style={[styles.container, glass.panel]}>
      {SPACES.map((s) => {
        const active = s.id === space;
        const color = active ? section.onAccent : glass.onDark;
        return (
          <Pressable
            key={s.id}
            onPress={() => onChange(s.id)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={s.label}
            style={[styles.segment, active && { backgroundColor: section.accent }]}>
            <Feather name={s.icon} size={15} color={color} />
            <YText variant="caption" numberOfLines={1} style={{ color, fontWeight: '700' }}>
              {s.label}
            </YText>
            {s.id === 'messages' && unread > 0 ? (
              <View style={[styles.badge, { backgroundColor: active ? section.onAccent : section.accent }]}>
                <YText style={[styles.badgeText, { color: active ? section.accent : section.onAccent }]}>{unread}</YText>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: 'row', gap: 4, padding: 4, borderRadius: radii.lg },
  segment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: 9,
    borderRadius: radii.md,
  },
  badge: { minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 5, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 11, fontWeight: '800' },
});
