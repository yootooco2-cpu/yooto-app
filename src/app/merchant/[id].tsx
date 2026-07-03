import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FullscreenGallery } from '@/components/merchants/FullscreenGallery';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { buildDiscoveryContext, getDiscoveryReasons, trackEvent, usePreferences } from '@/features/discovery';
import {
  CATEGORY_LABELS,
  getMerchantCoverPhoto,
  getMerchantTags,
  isRealPhotoUrl,
  useMerchant,
  useMerchantSearchStore,
} from '@/features/merchants';

const ensureHttp = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const openUrl = (url?: string) => {
  if (url) void Linking.openURL(url).catch(() => {});
};

/** Ligne d'information cliquable (téléphone, site, réseaux…). */
function InfoLink({ label, value, onPress }: { label: string; value: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="link">
      <View style={styles.infoRow}>
        <YText variant="caption" color="muted">
          {label}
        </YText>
        <YText variant="caption" color="primary" numberOfLines={1} style={styles.infoValue}>
          {value}
        </YText>
      </View>
    </Pressable>
  );
}

export default function MerchantDetailScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: merchant, isLoading, isError, refetch } = useMerchant(id);
  const userLocation = useMerchantSearchStore((s) => s.userLocation);
  const preferences = usePreferences();
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  // Apprentissage : consulter une fiche renforce l'affinité pour sa catégorie.
  useEffect(() => {
    if (merchant) {
      trackEvent({ type: 'open_merchant', category: merchant.category, isProducer: merchant.isProducer });
    }
  }, [merchant]);

  if (isLoading) {
    return (
      <YScreen center>
        <YText variant="body" color="muted">
          Chargement du commerce…
        </YText>
      </YScreen>
    );
  }

  if (isError) {
    return (
      <YScreen center>
        <YText variant="title">Une erreur est survenue</YText>
        <YText variant="body" color="muted">
          Impossible de charger ce commerce. Vérifiez votre connexion, puis réessayez.
        </YText>
        <YButton label="Réessayer" variant="secondary" onPress={() => void refetch()} />
        <YButton
          label="Retour à l’exploration"
          variant="ghost"
          onPress={() => router.replace('/explore')}
        />
      </YScreen>
    );
  }

  if (!merchant) {
    return (
      <YScreen center>
        <YText variant="title">Commerce introuvable</YText>
        <YText variant="body" color="muted">
          Ce commerce n’existe pas ou n’est plus disponible.
        </YText>
        <YButton label="Retour à l’exploration" onPress={() => router.replace('/explore')} />
      </YScreen>
    );
  }

  const tags = getMerchantTags(merchant);
  const reasons = getDiscoveryReasons(merchant, buildDiscoveryContext({ userLocation, preferences }));
  const cover = getMerchantCoverPhoto(merchant);

  const { address, postalCode, city, phone, email, website, instagram, facebook, googleMapsUrl } =
    merchant;
  const openingHours = merchant.openingHours;
  const reviewCount = merchant.reviewCount;
  const addressLines = [address, [postalCode, city].filter(Boolean).join(' ').trim()].filter(
    (line): line is string => !!line && line.length > 0,
  );
  const hasContact = Boolean(
    address || city || phone || email || website || instagram || facebook || googleMapsUrl,
  );
  // Galerie : gallery_photos → sinon fallback photo_url. Vraies photos uniquement,
  // hors cover (pas de doublon), plafonnée à 2. Section masquée si vide.
  const galleryCandidates =
    merchant.galleryPhotos && merchant.galleryPhotos.length > 0
      ? merchant.galleryPhotos
      : isRealPhotoUrl(merchant.photoUrl)
        ? [merchant.photoUrl]
        : [];
  const galleryImages = galleryCandidates
    .filter(isRealPhotoUrl)
    .filter((photo) => photo !== cover)
    .slice(0, 2);
  // Toutes les vraies images (cover + galerie), dédoublonnées → galerie plein écran.
  const allImages = Array.from(
    new Set([cover, ...galleryImages].filter((u): u is string => !!u)),
  );

  return (
    <YScreen
      scroll
      footer={
        <View style={styles.ctaRow}>
          <View style={styles.ctaItem}>
            <YButton
              label="Enregistrer"
              variant="secondary"
              fullWidth
              onPress={() =>
                trackEvent({ type: 'save', category: merchant.category, isProducer: merchant.isProducer })
              }
            />
          </View>
          <View style={styles.ctaItem}>
            <YButton
              label="Y aller"
              fullWidth
              onPress={() =>
                trackEvent({ type: 'go_there', category: merchant.category, isProducer: merchant.isProducer })
              }
            />
          </View>
        </View>
      }>
      <YButton label="← Retour" variant="ghost" onPress={() => router.back()} />

      {/* Hero cover — tap → galerie plein écran (swipe + zoom) */}
      <Pressable
        disabled={allImages.length === 0}
        onPress={() => setGalleryIndex(0)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Voir les photos en plein écran">
        <MerchantPhoto uri={cover} height={260} rounded={radii.xl} recyclingKey={merchant.id} />
        {allImages.length > 1 ? (
          <View style={styles.countBadge}>
            <YText variant="caption" color="inverse">
              1/{allImages.length}
            </YText>
          </View>
        ) : null}
      </Pressable>

      {/* Galerie (max 2 vignettes) — masquée si aucune photo */}
      {galleryImages.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.galleryScroll}
          contentContainerStyle={styles.gallery}>
          {galleryImages.map((photo, index) => (
            <Pressable
              key={`${photo}-${index}`}
              style={styles.galleryThumb}
              accessibilityRole="imagebutton"
              onPress={() => setGalleryIndex(Math.max(0, allImages.indexOf(photo)))}>
              <MerchantPhoto uri={photo} height={84} rounded={radii.md} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <YText variant="caption" color="primary">
        {CATEGORY_LABELS[merchant.category]}
      </YText>
      <YText variant="title">{merchant.name}</YText>

      <View style={styles.metaRow}>
        {merchant.distanceLabel !== '—' || merchant.city ? (
          <YText variant="caption" color="muted">
            {merchant.distanceLabel !== '—' ? merchant.distanceLabel : merchant.city}
          </YText>
        ) : null}
        {typeof merchant.rating === 'number' ? (
          <YText variant="caption" color="muted">
            · ★ {merchant.rating.toFixed(1)}
            {typeof reviewCount === 'number' ? ` (${reviewCount} avis)` : ''}
          </YText>
        ) : null}
        {typeof merchant.ecoScore === 'number' ? (
          <YText variant="caption" color="muted">
            · Éco {merchant.ecoScore}/100
          </YText>
        ) : null}
        <YText variant="caption" color={merchant.isOpenNow ? 'primary' : 'muted'}>
          · {merchant.isOpenNow ? 'Ouvert maintenant' : 'Fermé'}
        </YText>
      </View>

      {tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <YText variant="caption" color="default">
                {tag}
              </YText>
            </View>
          ))}
        </View>
      ) : null}

      {merchant.description ? (
        <YText variant="body" color="muted">
          {merchant.description}
        </YText>
      ) : null}

      {hasContact ? (
        <YCard>
          <YText variant="subtitle">Informations pratiques</YText>

          {addressLines.length > 0 ? (
            <View style={styles.infoBlock}>
              <YText variant="caption" color="muted">
                Adresse
              </YText>
              {addressLines.map((line) => (
                <YText key={line} variant="body">
                  {line}
                </YText>
              ))}
            </View>
          ) : null}

          {phone ? (
            <InfoLink label="Téléphone" value={phone} onPress={() => openUrl(`tel:${phone}`)} />
          ) : null}
          {website ? (
            <InfoLink label="Site web" value={website} onPress={() => openUrl(ensureHttp(website))} />
          ) : null}
          {email ? (
            <InfoLink label="Email" value={email} onPress={() => openUrl(`mailto:${email}`)} />
          ) : null}
          {instagram ? (
            <InfoLink
              label="Instagram"
              value={instagram}
              onPress={() => openUrl(ensureHttp(instagram))}
            />
          ) : null}
          {facebook ? (
            <InfoLink
              label="Facebook"
              value={facebook}
              onPress={() => openUrl(ensureHttp(facebook))}
            />
          ) : null}
          {googleMapsUrl ? (
            <YButton
              label="Ouvrir dans Google Maps"
              variant="secondary"
              fullWidth
              onPress={() => openUrl(googleMapsUrl)}
            />
          ) : null}
        </YCard>
      ) : null}

      {openingHours && openingHours.length > 0 ? (
        <YCard>
          <YText variant="subtitle">Horaires</YText>
          {openingHours.map((line) => (
            <YText key={line} variant="caption" color="muted">
              {line}
            </YText>
          ))}
        </YCard>
      ) : null}

      <YCard>
        <YText variant="subtitle">Pourquoi c’est recommandé</YText>
        {reasons.map((reason) => (
          <View key={reason} style={styles.reasonRow}>
            <YText variant="body" color="primary">
              •
            </YText>
            <YText variant="body" color="muted" style={styles.reasonText}>
              {reason}
            </YText>
          </View>
        ))}
      </YCard>

      {/* Espace pour ne pas masquer le contenu derrière le CTA flottant */}
      <View style={styles.footerSpacer} />

      <FullscreenGallery
        images={allImages}
        initialIndex={galleryIndex ?? 0}
        visible={galleryIndex !== null}
        onClose={() => setGalleryIndex(null)}
      />
    </YScreen>
  );
}

const styles = StyleSheet.create({
  countBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(23,32,26,0.6)',
  },
  galleryScroll: {
    flexGrow: 0,
  },
  gallery: {
    gap: spacing.sm,
    paddingRight: spacing.sm,
  },
  galleryThumb: {
    width: 120,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reasonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  reasonText: {
    flexShrink: 1,
  },
  infoBlock: {
    gap: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 2,
  },
  infoValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  ctaItem: {
    flex: 1,
  },
  footerSpacer: {
    height: 72,
  },
});
