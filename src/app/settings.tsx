import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { AuthSheet } from '@/components/auth/AuthSheet';
import { BrandIcon } from '@/components/settings/BrandIcon';
import { SettingsNavigationRow } from '@/components/settings/SettingsNavigationRow';
import { LocationSimulationSettings } from '@/components/settings/LocationSimulationSettings';
import { SettingsSection } from '@/components/settings/SettingsSection';
import { SettingsSwitch } from '@/components/settings/SettingsSwitch';
import { SettingsThemeSelector } from '@/components/settings/SettingsThemeSelector';
import { useToast } from '@/components/ui/Toast';
import { YText } from '@/components/ui/YText';
import { APP_BUILD, APP_NAME, APP_TAGLINE, APP_VERSION } from '@/constants/app';
import { SUPPORT_EMAIL, supportMailtoUrl } from '@/constants/support';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useControlCenterAccess } from '@/features/admin/access';
import { useLinkedProviders, useProfileRow, useSession } from '@/features/auth';
import { useSettings } from '@/features/settings/SettingsProvider';
import { haptics } from '@/lib/haptics';
import { signOut } from '@/lib/supabase/authActions';
import { PreferenceService } from '@/services/PreferenceService';

export default function SettingsScreen() {
  const router = useRouter();
  // Retour SÛR : revient si possible, sinon rejoint directement le Profil (évite l'erreur
  // « GO_BACK not handled » quand l'écran est ouvert sans historique, ex. lien direct sur web).
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  const { colors } = useTheme();
  const { status, userId, identity } = useSession();
  const isAuthenticated = status === 'authenticated';
  const profileRow = useProfileRow(isAuthenticated ? userId : null);
  const linked = useLinkedProviders(isAuthenticated ? userId : null);
  const { settings, setNotification, setMapSetting } = useSettings();
  const toast = useToast();
  const controlCenter = useControlCenterAccess();

  const [signingOut, setSigningOut] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const name = isAuthenticated ? identity?.displayName ?? 'Membre YOOTOO' : 'Invité';
  const email = isAuthenticated ? identity?.email ?? profileRow.email : null;

  const mail = (subject: string) => void Linking.openURL(`${supportMailtoUrl()}?subject=${encodeURIComponent(subject)}`);
  const openOsSettings = () => void Linking.openSettings();

  const onSignOut = async () => {
    if (signingOut) return;
    setSigningOut(true);
    await signOut();
    setSigningOut(false);
    goBack();
  };

  const n = settings.notifications;
  const m = settings.map;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={goBack} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour" style={styles.back}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <YText style={[styles.headerTitle, { color: colors.text }]}>Paramètres</YText>
        <View style={styles.back} />
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* ---------- CENTRE DE PILOTAGE (équipe / admin uniquement) ---------- */}
        {controlCenter ? (
          <SettingsSection title="Équipe YOOTOO">
            <SettingsNavigationRow icon={{ set: 'feather', name: 'activity' }} label="Centre de pilotage" subtitle="Supervision & santé de la plateforme" onPress={() => router.push('/pilotage')} />
          </SettingsSection>
        ) : null}

        {/* ---------- COMPTE ---------- */}
        <SettingsSection title="Compte">
          {isAuthenticated ? (
            <SettingsNavigationRow icon={{ set: 'feather', name: 'user' }} label={name} subtitle={email ?? undefined} onPress={() => router.push('/edit-profile')} />
          ) : (
            <SettingsNavigationRow icon={{ set: 'feather', name: 'user' }} label="Mode invité" subtitle="Connectez-vous pour synchroniser votre compte" onPress={() => setAuthOpen(true)} />
          )}
          {isAuthenticated ? <SettingsNavigationRow icon={{ set: 'feather', name: 'edit-3' }} label="Modifier le profil" onPress={() => router.push('/edit-profile')} /> : null}
        </SettingsSection>

        {/* ---------- COMPTES CONNECTÉS ---------- */}
        <SettingsSection title="Comptes connectés" footer="Sur Android, la connexion s’effectue via Google.">
          <SettingsNavigationRow leading={<BrandIcon brand="google" />} label="Google" status={linked.has('google') ? 'on' : 'off'} />
          <SettingsNavigationRow leading={<BrandIcon brand="apple" />} label="Apple" status={linked.has('apple') ? 'on' : 'off'} />
        </SettingsSection>

        {/* ---------- APPARENCE ---------- */}
        <SettingsSection title="Apparence" footer="Le thème s’applique immédiatement à toute l’application.">
          <View>
            <YText style={[styles.rowLabel, { color: colors.text }]}>Thème</YText>
            <SettingsThemeSelector />
          </View>
        </SettingsSection>

        {/* ---------- NOTIFICATIONS ---------- */}
        <SettingsSection title="Notifications">
          <SettingsSwitch icon={{ set: 'feather', name: 'tag' }} iconTint={colors.accent} label="Promotions" value={n.promotions} onValueChange={(v) => setNotification('promotions', v)} />
          <SettingsSwitch icon={{ set: 'mci', name: 'storefront-outline' }} label="Nouveaux commerces" value={n.newMerchants} onValueChange={(v) => setNotification('newMerchants', v)} />
          <SettingsSwitch icon={{ set: 'mci', name: 'sprout-outline' }} label="Nouveaux producteurs" value={n.newProducers} onValueChange={(v) => setNotification('newProducers', v)} />
          <SettingsSwitch icon={{ set: 'mci', name: 'leaf' }} label="Produits de saison" value={n.seasonal} onValueChange={(v) => setNotification('seasonal', v)} />
          <SettingsSwitch icon={{ set: 'feather', name: 'target' }} label="Missions" value={n.missions} onValueChange={(v) => setNotification('missions', v)} />
          <SettingsSwitch icon={{ set: 'feather', name: 'gift' }} iconTint={colors.accent} label="Récompenses" value={n.rewards} onValueChange={(v) => setNotification('rewards', v)} />
          <SettingsSwitch icon={{ set: 'feather', name: 'map-pin' }} label="Actualités locales" value={n.localNews} onValueChange={(v) => setNotification('localNews', v)} />
        </SettingsSection>

        {/* ---------- CARTE ---------- */}
        <SettingsSection title="Carte">
          <SettingsNavigationRow
            icon={{ set: 'feather', name: 'layers' }}
            label="Qualité de la carte"
            value={PreferenceService.qualityLabel(m.quality)}
            onPress={() => {
              const next = PreferenceService.nextQuality(m.quality);
              haptics.selection();
              setMapSetting('quality', next);
              toast.show(`Qualité de la carte : ${PreferenceService.qualityLabel(next)}`);
            }}
          />
          <SettingsSwitch icon={{ set: 'mci', name: 'office-building-outline' }} label="Bâtiments 3D" value={m.buildings3D} onValueChange={(v) => setMapSetting('buildings3D', v)} />
          <SettingsSwitch icon={{ set: 'feather', name: 'zap' }} label="Animations" value={m.animations} onValueChange={(v) => setMapSetting('animations', v)} />
          <SettingsSwitch icon={{ set: 'mci', name: 'sprout-outline' }} label="Afficher les producteurs" value={m.showProducers} onValueChange={(v) => setMapSetting('showProducers', v)} />
          <SettingsSwitch icon={{ set: 'feather', name: 'award' }} label="Partenaires uniquement" value={m.partnersOnly} onValueChange={(v) => setMapSetting('partnersOnly', v)} />
          <SettingsSwitch icon={{ set: 'feather', name: 'heart' }} iconTint="#D9645A" label="Favoris sur la carte" value={m.showFavorites} onValueChange={(v) => setMapSetting('showFavorites', v)} />
        </SettingsSection>

        {/* ---------- CONFIDENTIALITÉ ---------- */}
        <SettingsSection title="Confidentialité" footer="Vos demandes sont traitées par l’équipe YOOTOO sous 30 jours.">
          {Platform.OS !== 'web' ? (
            <SettingsNavigationRow icon={{ set: 'feather', name: 'shield' }} label="Autorisations de l’application" subtitle="Localisation, notifications…" onPress={openOsSettings} />
          ) : null}
          <SettingsNavigationRow icon={{ set: 'feather', name: 'download' }} label="Exporter mes données" onPress={() => mail('Export de mes données — YOOTOO')} />
          <SettingsNavigationRow icon={{ set: 'feather', name: 'trash-2' }} iconTint={colors.danger} label="Supprimer mon compte" onPress={() => mail('Suppression de mon compte — YOOTOO')} />
        </SettingsSection>

        {/* ---------- AIDE & CONTACT ---------- */}
        <SettingsSection title="Aide & contact">
          <SettingsNavigationRow icon={{ set: 'feather', name: 'mail' }} label="Nous contacter" value={SUPPORT_EMAIL} onPress={() => mail('Contact — YOOTOO')} />
          <SettingsNavigationRow icon={{ set: 'feather', name: 'alert-triangle' }} label="Signaler un bug" onPress={() => mail('Signalement de bug — YOOTOO')} />
          <SettingsNavigationRow icon={{ set: 'feather', name: 'message-square' }} label="Suggestions" onPress={() => mail('Suggestion — YOOTOO')} />
        </SettingsSection>

        {/* ---------- À PROPOS ---------- */}
        <SettingsSection title="À propos" footer={APP_TAGLINE}>
          <SettingsNavigationRow icon={{ set: 'mci', name: 'leaf' }} iconTint={colors.primary} label={APP_NAME} subtitle="Application mobile" />
          <SettingsNavigationRow icon={{ set: 'feather', name: 'tag' }} label="Version" value={APP_VERSION} />
          <SettingsNavigationRow icon={{ set: 'feather', name: 'hash' }} label="Numéro de build" value={APP_BUILD} />
        </SettingsSection>

        {/* ---------- SIMULATION GPS (DEV UNIQUEMENT) ---------- */}
        {__DEV__ ? <LocationSimulationSettings /> : null}

        {/* ---------- DÉCONNEXION ---------- */}
        {isAuthenticated ? (
          <Pressable
            onPress={() => void onSignOut()}
            disabled={signingOut}
            accessibilityRole="button"
            accessibilityLabel="Se déconnecter"
            style={({ pressed }) => [styles.signOut, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.sm, pressed && styles.pressed]}>
            <Feather name="log-out" size={18} color={colors.danger} />
            <YText style={[styles.signOutText, { color: colors.danger }]}>{signingOut ? 'Déconnexion…' : 'Se déconnecter'}</YText>
          </Pressable>
        ) : null}
      </ScrollView>

      <AuthSheet open={authOpen} onClose={() => setAuthOpen(false)} />
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg },
  rowLabel: { fontSize: 15, fontWeight: '600', paddingTop: spacing.md, paddingHorizontal: spacing.md },
  signOut: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    height: 54,
    borderRadius: radii.lg,
    borderWidth: 1,
  },
  signOutText: { fontSize: 16, fontWeight: '700' },
  pressed: { opacity: 0.85 },
});
