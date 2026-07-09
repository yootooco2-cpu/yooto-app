import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { LEGAL_PROVISIONAL, LEGAL_UPDATED, type LegalDoc } from '@/features/legal/content';

/** Écran de document légal — DA YOOTOO, lisible, sections structurées, bouton retour. Le texte
 *  provient de `@/features/legal/content` (remplaçable par une version validée sans toucher l'écran). */
export function LegalScreen({ doc }: { doc: LegalDoc }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator, paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour" style={styles.back}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <YText style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>{doc.title}</YText>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]} showsVerticalScrollIndicator={false}>
        <YText variant="caption" color="muted">{doc.subtitle} · mis à jour le {LEGAL_UPDATED}</YText>

        {/* Bandeau de prudence (version provisoire). */}
        <View style={[styles.banner, glass.panel]}>
          <Feather name="info" size={16} color={colors.warning} style={{ marginTop: 1 }} />
          <YText variant="caption" style={{ flex: 1, color: colors.mutedText, lineHeight: 18 }}>{LEGAL_PROVISIONAL}</YText>
        </View>

        <YText variant="body" style={{ color: colors.text, lineHeight: 23 }}>{doc.intro}</YText>

        {doc.sections.map((s) => (
          <View key={s.heading} style={styles.section}>
            <YText style={[styles.heading, { color: colors.text }]}>{s.heading}</YText>
            {s.body.map((p, i) => (
              <YText key={i} variant="body" style={{ color: colors.mutedText, lineHeight: 22 }}>{p}</YText>
            ))}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '800', letterSpacing: -0.3 },
  content: { padding: spacing.lg, gap: spacing.md },
  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, padding: spacing.md, borderRadius: radii.lg },
  section: { gap: spacing.xs, marginTop: spacing.sm },
  heading: { fontSize: 16, fontWeight: '800', letterSpacing: -0.2, marginBottom: 2 },
});
