import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { type ComponentProps, useCallback, useMemo, useState } from 'react';
import { Image, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AuthSheet } from '@/components/auth/AuthSheet';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { YText } from '@/components/ui/YText';
import { SUPPORT_EMAIL, supportMailtoUrl } from '@/constants/support';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useProfileRow, useSession } from '@/features/auth';
import { useFavoriteIds } from '@/features/favorites/favoritesStore';
import { PreferenceSection } from '@/features/profile/preferences';
import { signOut } from '@/lib/supabase/authActions';

/** Palette locale de la page, dérivée du thème courant (jamais de couleur en dur). */
interface Palette {
  cream: string;
  card: string;
  ink: string;
  muted: string;
  green: string;
  greenDeep: string;
  lime: string;
  sage: string;
  gold: string;
  border: string;
  heart: string;
  blue: string;
  onDark: string;
  onDarkMuted: string;
  danger: string;
}

const MOIS = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « Membre depuis juin 2024 » à partir d'une date ISO (formatage FR sans dépendance Intl). */
function memberSince(iso: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return `Membre depuis ${MOIS[d.getMonth()]} ${d.getFullYear()}`;
}

/** Initiale d'affichage pour l'avatar de repli. */
function initialOf(name: string | null, email: string | null): string {
  const src = name ?? email ?? 'Y';
  return src.trim().charAt(0).toUpperCase() || 'Y';
}

function Stat({ value, label, styles }: { value: number; label: string; styles: ReturnType<typeof makeStyles> }) {
  return (
    <View style={styles.stat}>
      <YText style={styles.statValue}>{value}</YText>
      <YText style={styles.statLabel}>{label}</YText>
    </View>
  );
}

type QuickIcon =
  | { set: 'feather'; name: ComponentProps<typeof Feather>['name'] }
  | { set: 'mci'; name: ComponentProps<typeof MaterialCommunityIcons>['name'] };

function QuickCard({
  icon,
  tint,
  title,
  subtitle,
  onPress,
  styles,
}: {
  icon: QuickIcon;
  tint: string;
  title: string;
  subtitle: string;
  onPress?: () => void;
  styles: ReturnType<typeof makeStyles>;
}) {
  const inner = (
    <>
      <View style={[styles.quickIcon, { backgroundColor: `${tint}1A` }]}>
        {icon.set === 'feather' ? <Feather name={icon.name} size={18} color={tint} /> : <MaterialCommunityIcons name={icon.name} size={18} color={tint} />}
      </View>
      <YText style={styles.quickTitle} numberOfLines={1}>
        {title}
      </YText>
      <YText style={styles.quickSub} numberOfLines={1}>
        {subtitle}
      </YText>
    </>
  );
  // Sans action : tuile INFORMATIVE (pas de faux bouton cliquable sans effet).
  if (!onPress) return <View style={styles.quickCard}>{inner}</View>;
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={title} style={({ pressed }) => [styles.quickCard, pressed && styles.pressed]}>
      {inner}
    </Pressable>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { colors: c, brand } = useTheme();
  const P = useMemo<Palette>(
    () => ({
      cream: c.background,
      card: c.surface,
      ink: c.text,
      muted: c.mutedText,
      green: c.primary,
      greenDeep: brand.greenDeep,
      lime: brand.lime,
      sage: c.tint,
      gold: c.accent,
      border: c.border,
      heart: brand.heart,
      blue: brand.blue,
      onDark: brand.onDark,
      onDarkMuted: brand.onDarkMuted,
      danger: c.danger,
    }),
    [c, brand],
  );
  const styles = useMemo(() => makeStyles(P), [P]);

  const { status, userId, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  // Rafraîchit le profil (photo / nom édités dans les Paramètres) à chaque retour sur l'onglet
  // Profil — l'écran restant monté, il faut re-lire la table `profiles`.
  const [profileRefresh, setProfileRefresh] = useState(0);
  useFocusEffect(useCallback(() => setProfileRefresh((k) => k + 1), []));
  const profileRow = useProfileRow(isAuthenticated ? userId : null, profileRefresh);
  const favoriteIds = useFavoriteIds();

  const [signingOut, setSigningOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const favoritesCount = favoriteIds.length;
  const reviewsCount = 0;
  const visitedCount = 0;

  // La table `profiles` (éditée par l'utilisateur) prime sur les métadonnées de session Google.
  const name = isAuthenticated ? profileRow.displayName ?? identity?.displayName ?? 'Membre YOOTOO' : 'Invité';
  const email = isAuthenticated ? identity?.email ?? profileRow.email : null;
  const avatarUrl = isAuthenticated ? profileRow.avatarUrl ?? identity?.avatarUrl : null;
  const since = isAuthenticated ? memberSince(profileRow.createdAt) : null;

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
  };

  const mailSupport = () => void Linking.openURL(supportMailtoUrl());

  const quickItems: { key: string; icon: QuickIcon; tint: string; title: string; subtitle: string; onPress?: () => void }[] = [
    { key: 'fav', icon: { set: 'feather', name: 'heart' }, tint: P.heart, title: 'Mes favoris', subtitle: `${favoritesCount} favori${favoritesCount > 1 ? 's' : ''}`, onPress: () => router.push('/explore') },
    { key: 'reviews', icon: { set: 'feather', name: 'star' }, tint: P.gold, title: 'Mes avis', subtitle: `${reviewsCount} avis laissé${reviewsCount > 1 ? 's' : ''}` },
    { key: 'visited', icon: { set: 'feather', name: 'map-pin' }, tint: P.green, title: 'Lieux visités', subtitle: `${visitedCount} découverte${visitedCount > 1 ? 's' : ''}` },
    { key: 'prefs', icon: { set: 'feather', name: 'sliders' }, tint: P.green, title: 'Mes préférences', subtitle: 'Vos goûts' },
    { key: 'notif', icon: { set: 'feather', name: 'bell' }, tint: P.blue, title: 'Notifications', subtitle: 'Alertes et préférences', onPress: () => router.push('/settings') },
    { key: 'help', icon: { set: 'feather', name: 'help-circle' }, tint: P.green, title: 'Aide & Contact', subtitle: SUPPORT_EMAIL, onPress: mailSupport },
  ];

  return (
    <SectionScreen section="profil">
      <View testID="screen-profile" style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---------- HEADER ---------- */}
        <View style={styles.header}>
          <MaterialCommunityIcons name="leaf" size={72} color={P.green} style={styles.leafAccent} />
          <Pressable onPress={() => router.push('/settings')} hitSlop={10} accessibilityRole="button" accessibilityLabel="Paramètres" style={styles.gear}>
            <Feather name="settings" size={20} color={P.muted} />
          </Pressable>

          <View style={styles.avatarWrap}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImg} accessibilityLabel="Photo de profil" />
            ) : (
              <View style={[styles.avatarImg, styles.avatarFallback]}>
                <YText style={styles.avatarInitial}>{initialOf(identity?.displayName ?? null, email)}</YText>
              </View>
            )}
            {isAuthenticated ? <View style={styles.onlineDot} /> : null}
          </View>

          <YText style={styles.name}>{name}</YText>
          {email ? <YText style={styles.email}>{email}</YText> : null}

          <View style={[styles.statusBadge, isAuthenticated ? styles.statusOn : styles.statusGuest]}>
            {isAuthenticated ? <Feather name="check" size={13} color={P.green} /> : null}
            <YText style={[styles.statusText, { color: isAuthenticated ? P.green : P.muted }]}>
              {isAuthenticated ? 'Compte connecté' : 'Mode invité'}
            </YText>
          </View>
          {since ? <YText style={styles.since}>{since}</YText> : null}
        </View>

        {/* ---------- IMPACT ---------- */}
        <Animated.View entering={FadeInDown.duration(260)} style={styles.impactCard}>
          <View style={styles.impactHead}>
            <View style={styles.impactIcon}>
              <MaterialCommunityIcons name="leaf" size={20} color={P.lime} />
            </View>
            <View style={styles.impactHeadText}>
              <YText style={styles.impactTitle}>Votre impact local</YText>
              <YText style={styles.impactSub}>Chaque visite soutient les commerçants et producteurs locaux.</YText>
            </View>
            <Feather name="chevron-right" size={20} color={P.onDarkMuted} />
          </View>
          <View style={styles.statsRow}>
            <Stat value={favoritesCount} label="Favoris" styles={styles} />
            <View style={styles.statDivider} />
            <Stat value={reviewsCount} label="Avis laissés" styles={styles} />
            <View style={styles.statDivider} />
            <Stat value={visitedCount} label="Lieux visités" styles={styles} />
          </View>
        </Animated.View>

        {/* ---------- ACCÈS RAPIDES ---------- */}
        <YText style={styles.sectionTitle}>Accès rapides</YText>
        <View style={styles.grid}>
          {quickItems.map((item) => (
            <QuickCard key={item.key} icon={item.icon} tint={item.tint} title={item.title} subtitle={item.subtitle} onPress={item.onPress} styles={styles} />
          ))}
        </View>

        {/* ---------- PRÉFÉRENCES (fonctionnalité conservée) ---------- */}
        <PreferenceSection />

        {/* ---------- DE SAISON ---------- */}
        <Pressable
          onPress={() => router.push('/de-saison')}
          accessibilityRole="button"
          accessibilityLabel="De saison — découvrez les produits près de chez vous"
          style={({ pressed }) => [styles.seasonCard, pressed && styles.pressed]}>
          <View style={styles.seasonText}>
            <YText style={styles.seasonTitle}>De saison</YText>
            <YText style={styles.seasonSub}>Découvrez les meilleurs produits près de chez vous.</YText>
          </View>
          <View style={styles.seasonThumb}>
            <MaterialCommunityIcons name="basket" size={30} color={P.green} />
          </View>
          <Feather name="chevron-right" size={20} color={P.muted} />
        </Pressable>

        {/* ---------- ACTION SESSION ---------- */}
        {isAuthenticated ? (
          <Pressable onPress={() => void onSignOut()} disabled={signingOut} accessibilityRole="button" accessibilityLabel="Se déconnecter" style={({ pressed }) => [styles.signOut, pressed && styles.pressed]}>
            <Feather name="log-out" size={18} color={P.danger} />
            <YText style={styles.signOutText}>{signingOut ? 'Déconnexion…' : 'Se déconnecter'}</YText>
          </Pressable>
        ) : (
          <Pressable onPress={() => setAuthOpen(true)} accessibilityRole="button" accessibilityLabel="Se connecter ou créer un compte" style={({ pressed }) => [styles.signIn, pressed && styles.pressed]}>
            <Feather name="log-in" size={18} color={brand.onDark} />
            <YText style={styles.signInText}>Se connecter · créer un compte</YText>
          </Pressable>
        )}

        {/* ---------- SUPPORT ---------- */}
        <Pressable onPress={mailSupport} accessibilityRole="button" accessibilityLabel={`Besoin d'aide ? Écrire à ${SUPPORT_EMAIL}`} style={({ pressed }) => [styles.supportCard, pressed && styles.pressed]}>
          <View style={styles.supportIcon}>
            <MaterialCommunityIcons name="leaf" size={18} color={P.green} />
          </View>
          <View style={styles.supportText}>
            <YText style={styles.supportTitle}>Besoin d’aide ?</YText>
            <YText style={styles.supportSub}>Notre équipe est là pour vous.</YText>
          </View>
          <YText style={styles.supportEmail} numberOfLines={1}>
            {SUPPORT_EMAIL}
          </YText>
          <Feather name="chevron-right" size={18} color={P.muted} />
        </Pressable>
      </ScrollView>

      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} favoritesCount={favoritesCount} />
      </View>
    </SectionScreen>
  );
}

function makeStyles(P: Palette) {
  return StyleSheet.create({
    root: { flex: 1, backgroundColor: 'transparent' },
    content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },

    header: { alignItems: 'center', paddingTop: spacing.sm },
    leafAccent: { position: 'absolute', top: -6, left: -10, opacity: 0.1, transform: [{ rotate: '-18deg' }] },
    gear: { position: 'absolute', top: 0, right: 0, width: 40, height: 40, borderRadius: radii.pill, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center', ...shadows.sm },
    avatarWrap: { marginTop: spacing.sm },
    avatarImg: { width: 96, height: 96, borderRadius: 48, backgroundColor: P.card, borderWidth: 3, borderColor: P.card, ...shadows.md },
    avatarFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: P.green },
    avatarInitial: { color: '#FFFFFF', fontSize: 34, fontWeight: '800' },
    onlineDot: { position: 'absolute', right: 4, bottom: 4, width: 22, height: 22, borderRadius: 11, backgroundColor: '#3CB371', borderWidth: 3, borderColor: P.cream },
    name: { marginTop: spacing.md, fontSize: 24, lineHeight: 30, fontWeight: '800', color: P.ink, letterSpacing: -0.4 },
    email: { marginTop: 2, fontSize: 14, color: P.muted },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm, paddingVertical: 5, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1 },
    statusOn: { backgroundColor: P.sage, borderColor: P.border },
    statusGuest: { backgroundColor: P.card, borderColor: P.border },
    statusText: { fontSize: 13, fontWeight: '700' },
    since: { marginTop: spacing.sm, fontSize: 12, color: P.muted },

    impactCard: { backgroundColor: P.greenDeep, borderRadius: radii.xl, padding: spacing.lg, gap: spacing.md, ...shadows.md },
    impactHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
    impactIcon: { width: 44, height: 44, borderRadius: radii.pill, backgroundColor: 'rgba(167,222,121,0.16)', alignItems: 'center', justifyContent: 'center' },
    impactHeadText: { flex: 1, gap: 2 },
    impactTitle: { color: P.onDark, fontSize: 17, fontWeight: '700' },
    impactSub: { color: P.onDarkMuted, fontSize: 13, lineHeight: 18 },
    statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
    stat: { flex: 1, alignItems: 'center', gap: 2 },
    statValue: { color: P.lime, fontSize: 24, fontWeight: '800' },
    statLabel: { color: P.onDarkMuted, fontSize: 12 },
    statDivider: { width: 1, height: 34, backgroundColor: 'rgba(255,255,255,0.12)' },

    sectionTitle: { fontSize: 18, fontWeight: '800', color: P.ink, letterSpacing: -0.3 },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
    quickCard: { flexBasis: '30%', flexGrow: 1, minWidth: 96, backgroundColor: P.card, borderRadius: radii.lg, borderWidth: 1, borderColor: P.border, padding: spacing.md, gap: 6, ...shadows.sm },
    quickIcon: { width: 34, height: 34, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
    quickTitle: { fontSize: 14, fontWeight: '700', color: P.ink, marginTop: 2 },
    quickSub: { fontSize: 12, color: P.muted },

    seasonCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: P.sage, borderRadius: radii.xl, borderWidth: 1, borderColor: P.border, padding: spacing.lg },
    seasonText: { flex: 1, gap: 3 },
    seasonTitle: { fontSize: 17, fontWeight: '800', color: P.ink },
    seasonSub: { fontSize: 13, lineHeight: 18, color: P.muted },
    seasonThumb: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: P.card, alignItems: 'center', justifyContent: 'center' },

    signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 54, borderRadius: radii.lg, backgroundColor: P.card, borderWidth: 1, borderColor: P.border, ...shadows.sm },
    signOutText: { color: P.danger, fontSize: 16, fontWeight: '700' },
    signIn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, height: 54, borderRadius: radii.lg, backgroundColor: P.green, ...shadows.md },
    signInText: { color: P.onDark, fontSize: 16, fontWeight: '700' },

    supportCard: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, backgroundColor: P.card, borderRadius: radii.lg, borderWidth: 1, borderColor: P.border, padding: spacing.md, ...shadows.sm },
    supportIcon: { width: 36, height: 36, borderRadius: radii.pill, backgroundColor: P.sage, alignItems: 'center', justifyContent: 'center' },
    supportText: { flex: 1, gap: 1 },
    supportTitle: { fontSize: 14, fontWeight: '700', color: P.ink },
    supportSub: { fontSize: 12, color: P.muted },
    supportEmail: { fontSize: 12, color: P.green, fontWeight: '600', maxWidth: 130 },

    pressed: { opacity: 0.85 },
  });
}
