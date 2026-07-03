import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import type { ComponentProps } from 'react';
import { useEffect, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { FullscreenGallery } from '@/components/merchants/FullscreenGallery';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { ReviewsSummary } from '@/components/merchants/ReviewsSummary';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { trackEvent } from '@/features/discovery';
import { CATEGORY_LABELS, getMerchantCoverPhoto, isRealPhotoUrl, useMerchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { formatRatingFr, starFill } from '@/features/merchants/reviews';

type FeatherName = ComponentProps<typeof Feather>['name'];

const ensureHttp = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const openUrl = (url?: string) => {
  if (url) void Linking.openURL(url).catch(() => {});
};
const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/** Rangée d'étoiles or (pleines/vides selon la note). */
function StarRow({ rating }: { rating: number }) {
  const { full, empty } = starFill(rating);
  return (
    <YText variant="subtitle" color="accent" style={styles.stars} accessibilityLabel={`${formatRatingFr(rating)} sur 5`}>
      {'★'.repeat(full) + '☆'.repeat(empty)}
    </YText>
  );
}

/** Bouton d'action avec icône (Itinéraire / Appeler / Site web / footer). */
function IconAction({
  icon,
  label,
  primary,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  primary?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.action,
        primary ? styles.actionPrimary : styles.actionSecondary,
        pressed && styles.pressed,
      ]}>
      <Feather name={icon} size={16} color={primary ? '#FFFFFF' : colors.primary} />
      <YText variant="label" color={primary ? 'inverse' : 'primary'}>
        {label}
      </YText>
    </Pressable>
  );
}

/** Rangée d'information avec icône (adresse, téléphone, site, réseaux…). */
function IconRow({
  icon,
  label,
  value,
  onPress,
}: {
  icon: FeatherName;
  label: string;
  value: string;
  onPress?: () => void;
}) {
  const body = (
    <View style={styles.iconRow}>
      <View style={styles.iconBadge}>
        <Feather name={icon} size={15} color={colors.primary} />
      </View>
      <View style={styles.iconRowText}>
        <YText variant="caption" color="muted">
          {label}
        </YText>
        <YText variant="body" color={onPress ? 'primary' : 'default'} numberOfLines={2}>
          {value}
        </YText>
      </View>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="link">
      {body}
    </Pressable>
  ) : (
    body
  );
}

/** Ligne « Pourquoi YOOTOO recommande » avec coche verte. */
function WhyLine({ text }: { text: string }) {
  return (
    <View style={styles.whyRow}>
      <Feather name="check" size={16} color={colors.primary} style={styles.whyCheck} />
      <YText variant="body" style={styles.whyText}>
        {text}
      </YText>
    </View>
  );
}

/** Statistique de score YOOTOO (grand nombre + barre de progression). */
function ScoreStat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.scoreStat}>
      <YText variant="caption" color="muted">
        {label}
      </YText>
      <View style={styles.scoreValueLine}>
        <YText variant="display">{value}</YText>
        <YText variant="caption" color="muted" style={styles.scoreOutOf}>
          /100
        </YText>
      </View>
      <View style={styles.scoreTrack}>
        <View style={[styles.scoreFill, { width: `${clampPct(value)}%` }]} />
      </View>
    </View>
  );
}

export default function MerchantDetailScreen() {
  const router = useRouter();
  // `id` peut arriver en tableau (Expo Router) → on prend la 1ʳᵉ valeur, jamais un id figé.
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');
  const { data: merchant, isLoading, isError, refetch } = useMerchant(id);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  // Favori : état visuel local (pas de persistance inventée ; branché plus tard sur un store).
  const [saved, setSaved] = useState(false);

  // Apprentissage : consulter une fiche renforce l'affinité pour sa catégorie.
  useEffect(() => {
    if (merchant) {
      trackEvent({ type: 'open_merchant', category: merchant.category, isProducer: merchant.isProducer });
    }
  }, [merchant]);

  if (!id) {
    return (
      <YScreen center>
        <YText variant="title">Commerce introuvable</YText>
        <YText variant="body" color="muted">
          Aucun commerce n’a été indiqué. Revenez à l’exploration pour en choisir un.
        </YText>
        <YButton label="Retour à l’exploration" onPress={() => router.replace('/explore')} />
      </YScreen>
    );
  }

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
        <YButton label="Retour à l’exploration" variant="ghost" onPress={() => router.replace('/explore')} />
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

  const {
    address,
    postalCode,
    city,
    phone,
    email,
    website,
    instagram,
    facebook,
    googleMapsUrl,
    openingHours,
    reviewCount,
    tags,
  } = merchant;

  const cover = getMerchantCoverPhoto(merchant);
  const metaDistance = merchant.distanceLabel !== '—' ? merchant.distanceLabel : undefined;
  const ratingMeta = [typeof reviewCount === 'number' ? `${reviewCount} avis` : null, metaDistance]
    .filter(Boolean)
    .join(' • ');
  const categoryLine = [CATEGORY_LABELS[merchant.category], city].filter(Boolean).join(' • ');

  // Badges — « Local » = positionnement YOOTOO ; le reste dérive de données réelles.
  const badges: string[] = ['Local'];
  if (merchant.isProducer) badges.push('Producteur');
  if (typeof merchant.ecoScore === 'number' && merchant.ecoScore >= 80) badges.push('Écoresponsable');
  if (merchant.isAccessible) badges.push('Accessible PMR');
  if (merchant.hasRewards) badges.push('Récompenses');

  // « Pourquoi YOOTOO recommande » — UNIQUEMENT des lignes adossées à de vraies données.
  const whyLines: string[] = [];
  if (merchant.isProducer) {
    whyLines.push('Producteur local en vente directe');
    whyLines.push('Circuit court');
  }
  if (typeof merchant.rating === 'number' && merchant.rating >= 4.3) {
    whyLines.push('Très bien noté par les habitants');
  }
  if (typeof merchant.ecoScore === 'number' && merchant.ecoScore >= 80) whyLines.push('Écoresponsable');
  if (merchant.isAccessible) whyLines.push('Accessible à tous');
  if (merchant.hasRewards) whyLines.push('Récompenses YOOTOO à chaque visite');
  // Socle véridique (le catalogue YOOTOO est une sélection locale) → bloc jamais vide.
  whyLines.push('Sélection locale YOOTOO');

  const addressLines = [address, [postalCode, city].filter(Boolean).join(' ').trim()].filter(
    (line): line is string => !!line && line.length > 0,
  );
  const hasContact = Boolean(
    addressLines.length || phone || email || website || instagram || facebook || googleMapsUrl,
  );

  const scoreStats: { label: string; value: number }[] = [];
  if (typeof merchant.localScore === 'number') scoreStats.push({ label: 'Impact local', value: merchant.localScore });
  if (typeof merchant.ecoScore === 'number') scoreStats.push({ label: 'Écoresponsabilité', value: merchant.ecoScore });

  // Galerie : gallery_photos → sinon fallback photo_url. Vraies photos, hors cover, plafonnée à 4.
  const galleryCandidates =
    merchant.galleryPhotos && merchant.galleryPhotos.length > 0
      ? merchant.galleryPhotos
      : isRealPhotoUrl(merchant.photoUrl)
        ? [merchant.photoUrl]
        : [];
  const galleryImages = galleryCandidates
    .filter(isRealPhotoUrl)
    .filter((photo) => photo !== cover)
    .slice(0, 4);
  const allImages = Array.from(new Set([cover, ...galleryImages].filter((u): u is string => !!u)));

  const onDirections = () => {
    openUrl(buildDirectionsUrl(merchant));
    trackEvent({ type: 'go_there', category: merchant.category, isProducer: merchant.isProducer });
  };
  const onSave = () => {
    setSaved((v) => !v);
    trackEvent({ type: 'save', category: merchant.category, isProducer: merchant.isProducer });
  };

  return (
    <YScreen
      scroll
      gap="md"
      footer={
        <View style={styles.ctaRow}>
          <IconAction icon="bookmark" label={saved ? 'Enregistré' : 'Enregistrer'} onPress={onSave} />
          <IconAction icon="map" label="Voir sur la carte" primary onPress={() => router.push('/explore')} />
        </View>
      }>
      {/* Grande galerie photo — tap → plein écran. Bouton retour rond flottant. */}
      <Pressable
        disabled={allImages.length === 0}
        onPress={() => setGalleryIndex(0)}
        accessibilityRole="imagebutton"
        accessibilityLabel="Voir les photos en plein écran"
        style={styles.hero}>
        <MerchantPhoto uri={cover} height={300} rounded={radii.xl} recyclingKey={merchant.id} />
        <Pressable
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Retour"
          hitSlop={8}
          style={styles.backFab}>
          <Feather name="chevron-left" size={20} color={colors.text} />
        </Pressable>
        {allImages.length > 1 ? (
          <View style={styles.countBadge}>
            <Feather name="image" size={12} color="#FFFFFF" />
            <YText variant="caption" color="inverse">
              1/{allImages.length}
            </YText>
          </View>
        ) : null}
      </Pressable>

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
              <MerchantPhoto uri={photo} height={96} rounded={radii.md} />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {/* Identité : nom d'abord, puis note, puis catégorie • ville */}
      <View style={styles.identity}>
        <YText variant="title">{merchant.name}</YText>
        <View style={styles.ratingLine}>
          {typeof merchant.rating === 'number' ? (
            <>
              <StarRow rating={merchant.rating} />
              <YText variant="caption" style={styles.ratingScore}>
                {formatRatingFr(merchant.rating)}
              </YText>
              {ratingMeta ? (
                <YText variant="caption" color="muted" style={styles.ratingText}>
                  {ratingMeta}
                </YText>
              ) : null}
            </>
          ) : metaDistance ? (
            <YText variant="caption" color="muted">
              {metaDistance}
            </YText>
          ) : null}
        </View>
        {categoryLine ? (
          <YText variant="caption" color="primary" style={styles.categoryLine}>
            {categoryLine}
          </YText>
        ) : null}
      </View>

      {/* Badges */}
      <View style={styles.chipsRow}>
        {badges.map((badge) => (
          <View key={badge} style={styles.badge}>
            <YText variant="caption" color="primary">
              {badge}
            </YText>
          </View>
        ))}
      </View>

      {/* Actions rapides avec icônes */}
      <View style={styles.actionsRow}>
        <IconAction icon="navigation" label="Itinéraire" primary onPress={onDirections} />
        {phone ? <IconAction icon="phone" label="Appeler" onPress={() => openUrl(`tel:${phone}`)} /> : null}
        {website ? (
          <IconAction icon="globe" label="Site web" onPress={() => openUrl(ensureHttp(website))} />
        ) : null}
      </View>

      {/* Description éditoriale YOOTOO */}
      {merchant.description ? (
        <YText variant="body" color="muted">
          {merchant.description}
        </YText>
      ) : null}

      {/* Tags de contenu (réels — signature_tags), masqués si absents */}
      {tags && tags.length > 0 ? (
        <View style={styles.chipsRow}>
          {tags.map((tag) => (
            <View key={tag} style={styles.tag}>
              <YText variant="caption" color="default">
                {tag}
              </YText>
            </View>
          ))}
        </View>
      ) : null}

      {/* Pourquoi YOOTOO recommande ce commerce */}
      <YCard padding="md">
        <YText variant="subtitle">Pourquoi YOOTOO recommande ce commerce</YText>
        {whyLines.map((line) => (
          <WhyLine key={line} text={line} />
        ))}
      </YCard>

      {/* Informations pratiques — carte premium à icônes */}
      {hasContact ? (
        <YCard padding="md">
          <YText variant="subtitle">Informations pratiques</YText>
          {addressLines.length > 0 ? (
            <IconRow icon="map-pin" label="Adresse" value={addressLines.join(', ')} onPress={onDirections} />
          ) : null}
          {phone ? (
            <IconRow icon="phone" label="Téléphone" value={phone} onPress={() => openUrl(`tel:${phone}`)} />
          ) : null}
          {website ? (
            <IconRow icon="globe" label="Site web" value={website} onPress={() => openUrl(ensureHttp(website))} />
          ) : null}
          {email ? (
            <IconRow icon="mail" label="Email" value={email} onPress={() => openUrl(`mailto:${email}`)} />
          ) : null}
          {instagram ? (
            <IconRow icon="instagram" label="Instagram" value={instagram} onPress={() => openUrl(ensureHttp(instagram))} />
          ) : null}
          {facebook ? (
            <IconRow icon="facebook" label="Facebook" value={facebook} onPress={() => openUrl(ensureHttp(facebook))} />
          ) : null}
          {googleMapsUrl ? (
            <IconRow icon="map" label="Google Maps" value="Ouvrir dans Google Maps" onPress={() => openUrl(googleMapsUrl)} />
          ) : null}
        </YCard>
      ) : null}

      {/* Horaires */}
      {openingHours && openingHours.length > 0 ? (
        <YCard padding="md">
          <View style={styles.cardHeader}>
            <Feather name="clock" size={16} color={colors.primary} />
            <YText variant="subtitle">Horaires</YText>
          </View>
          {openingHours.map((line) => (
            <YText key={line} variant="caption" color="muted">
              {line}
            </YText>
          ))}
        </YCard>
      ) : null}

      {/* Avis clients — ÉVOLUTIF */}
      <YCard padding="md">
        <YText variant="subtitle">Avis clients</YText>
        <ReviewsSummary
          rating={merchant.rating}
          reviewCount={reviewCount}
          distribution={merchant.ratingDistribution}
          onSeeReviews={googleMapsUrl ? () => openUrl(googleMapsUrl) : undefined}
        />
      </YCard>

      {/* Score YOOTOO — carte dédiée, mise en avant forte */}
      {scoreStats.length > 0 ? (
        <YCard padding="md" style={styles.scoreCard}>
          <View style={styles.cardHeader}>
            <Feather name="award" size={16} color={colors.primary} />
            <YText variant="subtitle">Score YOOTOO</YText>
          </View>
          <View style={styles.scoreGrid}>
            {scoreStats.map((s) => (
              <ScoreStat key={s.label} label={s.label} value={s.value} />
            ))}
          </View>
        </YCard>
      ) : null}

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
  hero: {
    position: 'relative',
    borderRadius: radii.xl,
    overflow: 'hidden',
    ...shadows.sm,
  },
  backFab: {
    position: 'absolute',
    top: spacing.sm,
    left: spacing.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.92)',
    ...shadows.sm,
  },
  countBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: 3,
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
    borderRadius: radii.md,
    ...shadows.sm,
  },
  identity: {
    gap: spacing.xs,
  },
  ratingLine: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  stars: {
    letterSpacing: 2,
  },
  ratingScore: {
    color: colors.text,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  ratingText: {
    fontVariant: ['tabular-nums'],
  },
  categoryLine: {
    letterSpacing: 0.4,
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31,122,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.25)',
  },
  tag: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  action: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.lg,
  },
  actionPrimary: {
    backgroundColor: colors.primary,
  },
  actionSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pressed: {
    opacity: 0.85,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  iconBadge: {
    width: 34,
    height: 34,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(31,122,77,0.08)',
  },
  iconRowText: {
    flex: 1,
    gap: 1,
  },
  whyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  whyCheck: {
    marginTop: 1,
  },
  whyText: {
    flexShrink: 1,
  },
  scoreCard: {
    backgroundColor: 'rgba(31,122,77,0.05)',
    borderColor: 'rgba(31,122,77,0.20)',
  },
  scoreGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.lg,
  },
  scoreStat: {
    flex: 1,
    minWidth: 130,
    gap: spacing.xs,
  },
  scoreValueLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.xs,
  },
  scoreOutOf: {
    marginBottom: spacing.xs,
  },
  scoreTrack: {
    height: 8,
    borderRadius: radii.pill,
    backgroundColor: colors.border,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: radii.pill,
    backgroundColor: colors.primary,
  },
  ctaRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  footerSpacer: {
    height: 72,
  },
});
