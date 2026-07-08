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
import { selectDiscussions, useChatStore } from '@/features/chat';
import { useFavoriteIds } from '@/features/favorites';
import { getMapConfig } from '@/features/map';
import { DEMO_REQUIRE_PHOTO, hasMerchantPhoto, useMerchants } from '@/features/merchants';
import { getSupabaseClient } from '@/lib/supabase/client';

type Status = 'up' | 'degraded' | 'down';

function relTime(ts: number, now: number): string {
  const diff = Math.max(0, now - ts);
  if (diff < 60_000) return "à l'instant";
  if (diff < 3_600_000) return `il y a ${Math.floor(diff / 60_000)} min`;
  const d = new Date(ts);
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export default function PilotageScreen() {
  const access = useControlCenterAccess();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [now] = useState(() => Date.now());

  const merchantsQuery = useMerchants();
  const favCount = useFavoriteIds().length;
  const chatInit = useChatStore((s) => s.init);
  const activity = useChatStore((s) => s.activity);
  const conversations = useChatStore((s) => s.conversations);
  const messages = useChatStore((s) => s.messages);

  useEffect(() => {
    void chatInit();
  }, [chatInit]);

  const merchants = merchantsQuery.data ?? [];
  const total = merchants.length;
  const withPhoto = merchants.filter(hasMerchantPhoto).length;
  const coverage = total ? Math.round((withPhoto / total) * 100) : 0;
  const producers = merchants.filter((m) => m.isProducer || m.category === 'producer').length;
  const restaurants = merchants.filter((m) => m.category === 'restaurant').length;
  const shops = merchants.filter((m) => m.category === 'shop').length;
  const lastSync = merchantsQuery.dataUpdatedAt ? relTime(merchantsQuery.dataUpdatedAt, now) : '—';

  const supabaseOk = getSupabaseClient() !== null;
  const mapboxOk = Boolean(getMapConfig().token);
  const dataError = merchantsQuery.isError;
  const dataLoading = merchantsQuery.isLoading;

  const supabaseStatus: Status = !supabaseOk ? 'down' : dataError ? 'degraded' : 'up';
  const apiStatus: Status = !supabaseOk ? 'down' : dataError ? 'degraded' : dataLoading ? 'degraded' : 'up';
  const mapboxStatus: Status = mapboxOk ? 'up' : 'down';
  const authStatus: Status = supabaseOk ? 'up' : 'down';
  const storageStatus: Status = supabaseOk ? 'up' : 'down';

  const publications = activity.length;
  const publicDiscussions = selectDiscussions(conversations, 'all').length;
  const messageCount = Object.values(messages).reduce((n, list) => n + list.length, 0);

  const journal: { tone: Status; text: string; time?: string }[] = [
    dataError
      ? { tone: 'down', text: 'Échec de synchronisation des commerces' }
      : dataLoading
        ? { tone: 'degraded', text: 'Synchronisation des commerces en cours…' }
        : { tone: 'up', text: `Synchronisation commerces — ${total} chargés`, time: lastSync },
    { tone: coverage >= 90 ? 'up' : 'degraded', text: `Couverture photo — ${withPhoto}/${total} (${coverage} %)` },
    { tone: mapboxOk ? 'up' : 'down', text: `Carte Mapbox — ${mapboxOk ? 'connectée' : 'token absent'}` },
    { tone: supabaseOk ? 'up' : 'down', text: `Supabase — ${supabaseOk ? 'client actif' : 'non configuré'}` },
  ];

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
            <YText variant="caption" color="muted">Supervision · équipe YOOTOO</YText>
          </View>
          <View style={[styles.livePill, glass.panel]}>
            <View style={[styles.dot, { backgroundColor: dataError ? colors.danger : colors.success }]} />
            <YText style={[styles.livePillText, { color: colors.text }]}>{dataError ? 'Incident' : 'En ligne'}</YText>
          </View>
        </View>

        {/* Données */}
        <Section icon="database" title="Données" colors={colors}>
          <Metric label="Commerces (total)" value={String(total)} colors={colors} />
          <Metric label="Avec photo" value={String(withPhoto)} colors={colors} />
          <Metric label="Couverture photo" value={`${coverage} %`} colors={colors} tone={coverage >= 90 ? colors.success : colors.warning} />
          <Metric label="Producteurs" value={String(producers)} colors={colors} />
          <Metric label="Restaurants" value={String(restaurants)} colors={colors} />
          <Metric label="Boutiques / artisans" value={String(shops)} colors={colors} />
          <Metric label="Dernière synchronisation" value={lastSync} colors={colors} last />
        </Section>

        {/* Utilisateurs */}
        <Section icon="users" title="Utilisateurs" colors={colors}>
          <Metric label="Favoris enregistrés" value={String(favCount)} colors={colors} />
          <Metric label="Publications du Chat" value={String(publications)} colors={colors} />
          <Metric label="Discussions publiques" value={String(publicDiscussions)} colors={colors} />
          <Metric label="Messages" value={String(messageCount)} colors={colors} />
          <Metric label="Comptes créés" value="—" colors={colors} />
          <Metric label="Utilisateurs actifs" value="—" colors={colors} last />
        </Section>

        {/* Services */}
        <Section icon="activity" title="Services" colors={colors}>
          <StatusRow label="Supabase" status={supabaseStatus} colors={colors} />
          <StatusRow label="Mapbox" status={mapboxStatus} colors={colors} />
          <StatusRow label="Authentification" status={authStatus} colors={colors} />
          <StatusRow label="Stockage" status={storageStatus} colors={colors} />
          <StatusRow label="API" status={apiStatus} colors={colors} last />
        </Section>

        {/* Application */}
        <Section icon="smartphone" title="Application" colors={colors}>
          <Metric label="Version" value={APP_VERSION} colors={colors} />
          <Metric label="Build" value={String(APP_BUILD)} colors={colors} />
          <Metric label="Environnement" value={__DEV__ ? 'DEV' : 'PROD'} colors={colors} />
          <Metric label="Mode démo" value={DEMO_REQUIRE_PHOTO ? 'Oui' : 'Non'} colors={colors} />
          <Metric label="Plateforme" value={Platform.OS} colors={colors} last />
        </Section>

        {/* Journal */}
        <Section icon="list" title="Journal" colors={colors}>
          {journal.map((e, i) => (
            <View key={i} style={[styles.logRow, i < journal.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
              <View style={[styles.dot, { backgroundColor: e.tone === 'up' ? colors.success : e.tone === 'degraded' ? colors.warning : colors.danger }]} />
              <YText variant="caption" style={{ flex: 1, color: colors.text }} numberOfLines={2}>{e.text}</YText>
              {e.time ? <YText variant="caption" color="muted">{e.time}</YText> : null}
            </View>
          ))}
        </Section>

        <YText variant="caption" color="muted" style={styles.footer}>{APP_NAME} · console interne — visible en développement et pour les administrateurs.</YText>
      </ScrollView>
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
      <View style={[styles.card, glass.panel, shadows.sm]}>{children}</View>
    </View>
  );
}

function Metric({ label, value, colors, tone, last }: { label: string; value: string; colors: ReturnType<typeof useTheme>['colors']; tone?: string; last?: boolean }) {
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <YText variant="body" style={{ color: colors.mutedText }}>{label}</YText>
      <YText variant="body" style={[styles.value, { color: tone ?? colors.text }]}>{value}</YText>
    </View>
  );
}

function StatusRow({ label, status, colors, last }: { label: string; status: Status; colors: ReturnType<typeof useTheme>['colors']; last?: boolean }) {
  const map = {
    up: { c: colors.success, t: 'Opérationnel' },
    degraded: { c: colors.warning, t: 'Dégradé' },
    down: { c: colors.danger, t: 'Hors service' },
  }[status];
  return (
    <View style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border }]}>
      <YText variant="body" style={{ color: colors.mutedText }}>{label}</YText>
      <View style={styles.statusPill}>
        <View style={[styles.dot, { backgroundColor: map.c }]} />
        <YText variant="caption" style={{ color: map.c, fontWeight: '700' }}>{map.t}</YText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: spacing.lg, gap: spacing.lg },
  denied: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: spacing.xl },
  backBtn: { marginTop: spacing.sm, paddingHorizontal: spacing.lg, paddingVertical: 10, borderRadius: radii.pill, borderWidth: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  titleCol: { flex: 1, gap: 2 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  livePill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radii.pill },
  livePillText: { fontSize: 12, fontWeight: '700' },
  dot: { width: 8, height: 8, borderRadius: 4 },
  section: { gap: spacing.sm },
  sectionHead: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: spacing.xs },
  sectionTitle: { fontSize: 15, fontWeight: '800', letterSpacing: -0.2 },
  card: { borderRadius: radii.lg, paddingHorizontal: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, gap: spacing.md },
  value: { fontWeight: '700', fontVariant: ['tabular-nums'] },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  logRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: 11 },
  footer: { textAlign: 'center', marginTop: spacing.sm },
});
