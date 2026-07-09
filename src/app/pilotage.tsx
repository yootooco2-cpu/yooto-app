import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ReactNode } from 'react';
import { Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YText } from '@/components/ui/YText';
import { APP_BUILD, APP_NAME, APP_VERSION } from '@/constants/app';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useControlCenterAccess } from '@/features/admin/access';
import { useCockpitData, type CockpitMetric, type CockpitSection, type SignalStatus } from '@/features/admin/cockpit';
import { useChatStore } from '@/features/chat';

const STATUS_LABEL: Record<SignalStatus, string> = { up: 'Opérationnel', degraded: 'Dégradé', down: 'Hors service' };

export default function PilotageScreen() {
  const access = useControlCenterAccess();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [now] = useState(() => Date.now());
  const chatInit = useChatStore((s) => s.init);
  const data = useCockpitData(now);

  useEffect(() => {
    void chatInit();
  }, [chatInit]);

  const toneColor = (s: SignalStatus | undefined): string =>
    s === 'up' ? colors.success : s === 'degraded' ? colors.warning : s === 'down' ? colors.danger : colors.text;

  if (!access) {
    return (
      <View style={[styles.denied, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Feather name="lock" size={28} color={colors.mutedText} />
        <YText variant="subtitle" style={{ color: colors.text, textAlign: 'center' }}>Accès réservé</YText>
        <YText variant="body" color="muted" style={{ textAlign: 'center' }}>Le Centre de pilotage est réservé à l’équipe YOOTOO.</YText>
        <Pressable onPress={() => router.back()} accessibilityRole="button" style={[styles.backBtn, { borderColor: colors.border }]}>
          <YText style={{ color: colors.text }}>Retour</YText>
        </Pressable>
      </View>
    );
  }

  const healthColor = toneColor(data.health.tone);

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={[styles.content, { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xl }]} showsVerticalScrollIndicator={false}>
        {/* En-tête */}
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour" style={[styles.iconBtn, glass.panel]}>
            <Feather name="chevron-left" size={22} color={glass.onDark} />
          </Pressable>
          <View style={styles.titleCol}>
            <YText style={[styles.title, { color: colors.text }]}>Centre de pilotage</YText>
            <YText variant="caption" color="muted">Cockpit · équipe YOOTOO</YText>
          </View>
        </View>

        {/* 1 · Santé globale */}
        <View style={[styles.hero, glass.panel, shadows.md]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroDot, { backgroundColor: healthColor }]} />
            <YText variant="caption" color="muted">État de YOOTOO</YText>
          </View>
          <View style={styles.heroScoreRow}>
            <YText style={[styles.heroScore, { color: healthColor }]}>{data.health.score}</YText>
            <YText style={[styles.heroPct, { color: healthColor }]}>%</YText>
          </View>
          <View style={styles.heroBar}>
            <View style={[styles.heroBarFill, { width: `${data.health.score}%`, backgroundColor: healthColor }]} />
          </View>
          <View style={[styles.services, { borderTopColor: colors.border }]}>
            {data.services.map((s) => (
              <View key={s.key} style={styles.serviceRow}>
                <View style={[styles.pillDot, { backgroundColor: toneColor(s.status) }]} />
                <YText variant="caption" style={{ flex: 1, color: colors.text }}>{s.label}</YText>
                <YText variant="caption" style={{ color: toneColor(s.status), fontWeight: '700' }}>{STATUS_LABEL[s.status]}</YText>
              </View>
            ))}
          </View>
        </View>

        {/* 2 · Priorités */}
        <Section icon="alert-circle" title="Priorités du jour" colors={colors}>
          <View style={[styles.card, glass.panel, shadows.sm, styles.cardPad]}>
            {data.priorities.map((p, i) => {
              const c = p.severity === 'critical' ? colors.danger : p.severity === 'warn' ? colors.warning : p.severity === 'ok' ? colors.success : colors.mutedText;
              return (
                <View key={i} style={[styles.prioRow, i < data.priorities.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                  <Feather name={p.severity === 'ok' ? 'check-circle' : p.severity === 'info' ? 'info' : 'alert-triangle'} size={15} color={c} />
                  <YText variant="body" style={{ flex: 1, color: colors.text }}>{p.text}</YText>
                </View>
              );
            })}
          </View>
        </Section>

        {/* 3 · Activité utilisateur */}
        <Section icon="users" title="Activité utilisateur" colors={colors}>
          <MetricGrid section={data.user} colors={colors} toneColor={toneColor} />
        </Section>

        {/* 4 · Réseau commerçant */}
        <Section icon="shopping-bag" title="Réseau commerçant" colors={colors}>
          <MetricGrid section={data.network} colors={colors} toneColor={toneColor} />
        </Section>

        {/* 5 · Performance */}
        <Section icon="zap" title="Performance" colors={colors}>
          <MetricGrid section={data.performance} colors={colors} toneColor={toneColor} />
        </Section>

        {/* 6 · IA — YootChat */}
        <Section icon="cpu" title="Intelligence artificielle" colors={colors}>
          <View style={[styles.card, glass.panel, shadows.sm, styles.cardPad]}>
            <YText variant="caption" color="muted">Architecture prête (seam AIProvider). Indicateurs à connecter :</YText>
            <PendingChips items={data.ai.pending} colors={colors} />
          </View>
        </Section>

        {/* 7 · Journal */}
        <Section icon="list" title="Journal" colors={colors}>
          <View style={[styles.card, glass.panel, shadows.sm, styles.cardPad]}>
            {data.journal.map((e, i) => (
              <View key={i} style={[styles.logRow, i < data.journal.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
                <View style={[styles.pillDot, { backgroundColor: toneColor(e.tone) }]} />
                <YText variant="caption" style={{ flex: 1, color: colors.text }} numberOfLines={2}>{e.text}</YText>
                {e.time ? <YText variant="caption" color="muted">{e.time}</YText> : null}
              </View>
            ))}
          </View>
        </Section>

        <YText variant="caption" color="muted" style={styles.footer}>
          {APP_NAME} v{APP_VERSION} · build {APP_BUILD} · {__DEV__ ? 'DEV' : 'PROD'} · {Platform.OS}
        </YText>
      </ScrollView>
    </View>
  );
}

function MetricGrid({ section, colors, toneColor }: { section: CockpitSection; colors: ReturnType<typeof useTheme>['colors']; toneColor: (s: SignalStatus | undefined) => string }) {
  return (
    <View style={styles.gridWrap}>
      <View style={styles.grid}>
        {section.real.map((m: CockpitMetric) => (
          <View key={m.label} style={[styles.tile, glass.panel, shadows.sm]}>
            <YText style={[styles.tileValue, { color: m.tone ? toneColor(m.tone) : colors.text }]}>{m.value}</YText>
            <YText variant="caption" color="muted" numberOfLines={1}>{m.label}</YText>
          </View>
        ))}
      </View>
      {section.pending.length > 0 ? <PendingChips items={section.pending} colors={colors} /> : null}
    </View>
  );
}

function PendingChips({ items, colors }: { items: string[]; colors: ReturnType<typeof useTheme>['colors'] }) {
  return (
    <View style={styles.pendingWrap}>
      <YText variant="caption" style={[styles.pendingLabel, { color: colors.mutedText }]}>À connecter</YText>
      <View style={styles.chips}>
        {items.map((it) => (
          <View key={it} style={[styles.chip, { borderColor: colors.border }]}>
            <YText variant="caption" style={{ color: colors.mutedText }}>{it}</YText>
          </View>
        ))}
      </View>
    </View>
  );
}

function Section({ icon, title, colors, children }: { icon: keyof typeof Feather.glyphMap; title: string; colors: ReturnType<typeof useTheme>['colors']; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        <Feather name={icon} size={15} color={colors.primary} />
        <YText style={[styles.sectionTitle, { color: colors.text }]}>{title}</YText>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.xl },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  backBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1, gap: 2 },
  title: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5 },

  hero: { borderRadius: radii.xl, padding: spacing.lg, gap: spacing.sm },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  heroDot: { width: 9, height: 9, borderRadius: 5 },
  heroScoreRow: { flexDirection: 'row', alignItems: 'flex-end' },
  heroScore: { fontSize: 52, fontWeight: '800', letterSpacing: -2, lineHeight: 56 },
  heroPct: { fontSize: 22, fontWeight: '800', marginBottom: 8, marginLeft: 2 },
  heroBar: { height: 6, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.10)', overflow: 'hidden', marginTop: 2 },
  heroBarFill: { height: '100%', borderRadius: 3 },
  services: { marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.xs },
  serviceRow: { flexDirection: 'row', alignItems: 'center', gap: 9, paddingVertical: 9 },
  pillDot: { width: 8, height: 8, borderRadius: 4 },

  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  card: { borderRadius: radii.lg },
  cardPad: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  prioRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 12 },

  gridWrap: { gap: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { width: '31.5%', flexGrow: 1, borderRadius: radii.lg, paddingVertical: spacing.md, paddingHorizontal: spacing.md, gap: 4 },
  tileValue: { fontSize: 24, fontWeight: '800', letterSpacing: -0.5, fontVariant: ['tabular-nums'] },

  pendingWrap: { gap: 8, paddingHorizontal: spacing.xs },
  pendingLabel: { fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6, fontSize: 10.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: radii.pill, borderWidth: 1, opacity: 0.7 },

  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11 },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});
