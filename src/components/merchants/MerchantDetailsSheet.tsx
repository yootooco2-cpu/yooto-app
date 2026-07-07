import { Feather } from '@expo/vector-icons';
import { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { Image } from 'expo-image';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { MapMerchantPreview } from '@/components/map/MapMerchantPreview';
import { MerchantOpeningHours } from '@/components/merchants/MerchantOpeningHours';
import { YText } from '@/components/ui/YText';
import { DarkThemeScope, useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import type { Merchant } from '@/features/merchants';

type Props = {
  merchant: Merchant;
  /** Ouvre la fiche plein écran (route dédiée). */
  onOpenFull: () => void;
  onClose: () => void;
};

const openUrl = (url?: string) => {
  if (url) void Linking.openURL(url).catch(() => {});
};

function InfoRow({ icon, value, onPress }: { icon: keyof typeof Feather.glyphMap; value: string; onPress?: () => void }) {
  const { colors } = useTheme();
  const interactive = Boolean(onPress);
  return (
    <Pressable
      onPress={onPress}
      disabled={!interactive}
      accessibilityRole={interactive ? 'button' : 'text'}
      style={({ pressed }) => [styles.infoRow, pressed && interactive && styles.infoRowPressed]}>
      <View style={[styles.infoIcon, { backgroundColor: colors.surfaceAlt }]}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <YText style={[styles.infoValue, { color: colors.text }]} numberOfLines={2}>
        {value}
      </YText>
      {interactive ? <Feather name="chevron-right" size={16} color={colors.mutedText} /> : null}
    </Pressable>
  );
}

function DetailsInner({ merchant, onOpenFull, onClose }: Props) {
  const { colors } = useTheme();
  const fullAddress = [merchant.address, [merchant.postalCode, merchant.city].filter(Boolean).join(' ')]
    .filter((part) => part && part.trim().length > 0)
    .join(', ');
  const tags = merchant.tags?.filter(Boolean) ?? [];
  const gallery = merchant.galleryPhotos?.filter(Boolean) ?? [];
  const hasContact = Boolean(fullAddress || merchant.phone || merchant.website || merchant.email);

  return (
    <BottomSheetScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled">
      {/* En-tête = mini-fiche réutilisée (photo, nom, badge, statut, actions principales). */}
      <MapMerchantPreview merchant={merchant} onPress={onOpenFull} onClose={onClose} flat />

      <MerchantOpeningHours merchant={merchant} />

      {hasContact ? (
        <View style={styles.section}>
          <YText style={[styles.sectionTitle, { color: colors.text }]}>Informations pratiques</YText>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            {fullAddress ? (
              <InfoRow icon="map-pin" value={fullAddress} onPress={merchant.googleMapsUrl ? () => openUrl(merchant.googleMapsUrl) : undefined} />
            ) : null}
            {merchant.phone ? <InfoRow icon="phone" value={merchant.phone} onPress={() => openUrl(`tel:${merchant.phone}`)} /> : null}
            {merchant.website ? <InfoRow icon="globe" value={merchant.website} onPress={() => openUrl(merchant.website)} /> : null}
            {merchant.email ? <InfoRow icon="mail" value={merchant.email} onPress={() => openUrl(`mailto:${merchant.email}`)} /> : null}
          </View>
        </View>
      ) : null}

      {merchant.description ? (
        <View style={styles.section}>
          <YText style={[styles.sectionTitle, { color: colors.text }]}>À propos</YText>
          <YText style={[styles.about, { color: colors.mutedText }]}>{merchant.description}</YText>
        </View>
      ) : null}

      {tags.length > 0 ? (
        <View style={styles.section}>
          <YText style={[styles.sectionTitle, { color: colors.text }]}>Catégories</YText>
          <View style={styles.tagRow}>
            {tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: colors.surfaceAlt, borderColor: colors.border }]}>
                <YText style={[styles.tagText, { color: colors.text }]}>{tag}</YText>
              </View>
            ))}
          </View>
        </View>
      ) : null}

      {gallery.length > 0 ? (
        <View style={styles.section}>
          <YText style={[styles.sectionTitle, { color: colors.text }]}>Photos</YText>
          <View style={styles.galleryRow}>
            {gallery.slice(0, 6).map((uri, index) => (
              <Image key={`${uri}-${index}`} source={uri} style={[styles.galleryPhoto, { backgroundColor: colors.surfaceAlt }]} contentFit="cover" />
            ))}
          </View>
        </View>
      ) : null}
    </BottomSheetScrollView>
  );
}

/**
 * Contenu scrollable de la bottom sheet commerce. Rendu en thème sombre (DarkThemeScope) pour
 * partager exactement les tokens de la mini-fiche. Aucune logique métier ici : toutes les
 * données proviennent du `merchant` déjà chargé (Discovery Engine) ; les horaires sont dérivés
 * par le helper de domaine `openingHours`.
 */
export function MerchantDetailsSheet(props: Props) {
  return (
    <DarkThemeScope>
      <DetailsInner {...props} />
    </DarkThemeScope>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingHorizontal: spacing.md, paddingBottom: spacing.xxl, gap: spacing.lg },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  infoCard: { borderRadius: radii.lg, borderWidth: 1, paddingHorizontal: spacing.md, paddingVertical: spacing.xs },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm },
  infoRowPressed: { opacity: 0.6 },
  infoIcon: { width: 34, height: 34, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  infoValue: { flex: 1, fontSize: 14.5, fontWeight: '500' },
  about: { fontSize: 14.5, lineHeight: 21 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tag: { paddingVertical: 6, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1 },
  tagText: { fontSize: 13, fontWeight: '600' },
  galleryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  galleryPhoto: { width: 96, height: 96, borderRadius: radii.md },
});
