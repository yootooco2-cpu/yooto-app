import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { type ComponentProps, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';

import { FullscreenGallery } from '@/components/merchants/FullscreenGallery';
import { IconAction } from '@/components/merchants/IconAction';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { ReviewsSummary } from '@/components/merchants/ReviewsSummary';
import { YCard } from '@/components/ui/YCard';
import { YText } from '@/components/ui/YText';
import { colors } from '@/design/tokens/colors';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { trackEvent } from '@/features/discovery';
import { CATEGORY_LABELS, getMerchantCoverPhoto, isRealPhotoUrl, type Merchant } from '@/features/merchants';
import { buildDirectionsUrl } from '@/features/merchants/directions';
import { formatRatingFr, starFill } from '@/features/merchants/reviews';

type FeatherName = ComponentProps<typeof Feather>['name'];

const ensureHttp = (url: string) => (/^https?:\/\//i.test(url) ? url : `https://${url}`);
const openUrl = (url?: string) => {
  if (url) void Linking.openURL(url).catch(() => {});
};
const clampPct = (n: number) => Math.max(0, Math.min(100, n));

/** Hauteur de la galerie (grande photo + colonne de miniatures alignées). */
const GALLERY_H = 288;

/** Rangée d'étoiles or (pleines/vides selon la note). */
function StarRow({ rating }: { rating: number }) {
  const { full, empty } = starFill(rating);
  return (
    <YText variant="subtitle" color="accent" style={styles.stars} accessibilityLabel={`${formatRatingFr(rating)} sur 5`}>
      {'★'.repeat(full) + '☆'.repeat(empty)}
    </YText>
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

type Props = {
  merchant: Merchant;
  /** Action du bouton retour de la galerie. Défaut : router.back() (comportement route). */
  onBack?: () => void;
};

/**
 * Corps de la fiche commerce (galerie F1 → header F3 → infos F2 → Pourquoi → Avis → Score).
 * Présentationnel et host-agnostique : monté par la route `/merchant/[id]` ET (à venir) le
 * panneau Focus Commerce desktop. Retourne un Fragment → l'hôte (YScreen ou panneau) fournit
 * la coquille scroll et l'espacement.
 */
export function MerchantDetail({ merchant, onBack }: Props) {
  const router = useRouter();
  const back = onBack ?? (() => router.back());
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

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

  // « Local » (statut) vit dans le header ; les autres attributs restent en badges.
  const badges: string[] = [];
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
  const hasHours = Boolean(openingHours && openingHours.length > 0);

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
  // Galerie type Airbnb : jusqu'à 2 miniatures empilées à droite. Hauteur répartie sur la colonne.
  const galleryThumbs = galleryImages.slice(0, 2);
  const thumbH =
    galleryThumbs.length > 0
      ? (GALLERY_H - (galleryThumbs.length - 1) * spacing.xs) / galleryThumbs.length
      : GALLERY_H;

  const onDirections = () => {
    openUrl(buildDirectionsUrl(merchant));
    trackEvent({ type: 'go_there', category: merchant.category, isProducer: merchant.isProducer });
  };

  return (
    <>
      {/* Galerie type Airbnb : grande photo à gauche + colonne de miniatures à droite. */}
      <View style={styles.gallery}>
        <Pressable
          disabled={allImages.length === 0}
          onPress={() => setGalleryIndex(0)}
          accessibilityRole="imagebutton"
          accessibilityLabel="Voir les photos en plein écran"
          style={styles.galleryMain}>
          <MerchantPhoto uri={cover} height={GALLERY_H} rounded={radii.lg} recyclingKey={merchant.id} />
          <Pressable
            onPress={back}
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

        {galleryThumbs.length > 0 ? (
          <View style={styles.galleryCol}>
            {galleryThumbs.map((photo, index) => (
              <Pressable
                key={`${photo}-${index}`}
                accessibilityRole="imagebutton"
                accessibilityLabel="Voir les photos en plein écran"
                onPress={() => setGalleryIndex(Math.max(0, allImages.indexOf(photo)))}>
                <MerchantPhoto uri={photo} height={thumbH} rounded={radii.md} />
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {/* Bloc d'intro — rythme resserré (gap sm) : header, actions, badges, description, tags. */}
      <View style={styles.intro}>
        {/* Header compact : nom → catégorie + statut local → note · avis · distance */}
        <View style={styles.identity}>
          <YText variant="title">{merchant.name}</YText>
          <View style={styles.categoryRow}>
            {categoryLine ? (
              <YText variant="caption" color="primary" style={styles.categoryLine}>
                {categoryLine}
              </YText>
            ) : null}
            <View style={styles.localPill}>
              <YText variant="caption" color="primary">
                Local
              </YText>
            </View>
          </View>
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
        </View>

        {/* Actions rapides avec icônes — juste sous le header */}
        <View style={styles.actionsRow}>
          <IconAction icon="navigation" label="Itinéraire" primary onPress={onDirections} />
          {phone ? <IconAction icon="phone" label="Appeler" onPress={() => openUrl(`tel:${phone}`)} /> : null}
          {website ? (
            <IconAction icon="globe" label="Site web" onPress={() => openUrl(ensureHttp(website))} />
          ) : null}
        </View>

        {/* Badges attributs (le statut « Local » est déjà dans le header) */}
        {badges.length > 0 ? (
          <View style={styles.chipsRow}>
            {badges.map((badge) => (
              <View key={badge} style={styles.badge}>
                <YText variant="caption" color="primary">
                  {badge}
                </YText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Description éditoriale YOOTOO */}
        {merchant.description ? (
          <YText variant="body" color="default">
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
      </View>

      {/* Pourquoi YOOTOO recommande ce commerce */}
      <YCard padding="md">
        <View style={styles.cardHeader}>
          <Feather name="heart" size={16} color={colors.primary} />
          <YText variant="subtitle" style={styles.cardHeaderText}>
            Pourquoi YOOTOO recommande ce commerce
          </YText>
        </View>
        {whyLines.map((line) => (
          <WhyLine key={line} text={line} />
        ))}
      </YCard>

      {/* Informations pratiques — adresse, horaires, contact (bloc structuré unique) */}
      {hasContact || hasHours ? (
        <YCard padding="md">
          <View style={styles.cardHeader}>
            <Feather name="info" size={16} color={colors.primary} />
            <YText variant="subtitle" style={styles.cardHeaderText}>
              Informations pratiques
            </YText>
          </View>
          {addressLines.length > 0 ? (
            <IconRow icon="map-pin" label="Adresse" value={addressLines.join(', ')} onPress={onDirections} />
          ) : null}
          {hasHours ? (
            <View style={styles.hoursRow}>
              <View style={styles.iconBadge}>
                <Feather name="clock" size={15} color={colors.primary} />
              </View>
              <View style={styles.iconRowText}>
                <YText variant="caption" color="muted">
                  Horaires
                </YText>
                {openingHours?.map((line) => (
                  <YText key={line} variant="caption">
                    {line}
                  </YText>
                ))}
              </View>
            </View>
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

      {/* Avis clients — ÉVOLUTIF */}
      <YCard padding="md">
        <View style={styles.cardHeader}>
          <Feather name="message-square" size={16} color={colors.primary} />
          <YText variant="subtitle" style={styles.cardHeaderText}>
            Avis clients
          </YText>
        </View>
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
    </>
  );
}

const styles = StyleSheet.create({
  gallery: {
    flexDirection: 'row',
    height: GALLERY_H,
    gap: spacing.xs,
  },
  galleryMain: {
    flex: 2,
    position: 'relative',
  },
  galleryCol: {
    flex: 1,
    gap: spacing.xs,
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
  intro: {
    gap: spacing.sm,
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
  categoryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  localPill: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(31,122,77,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(31,122,77,0.25)',
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
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  cardHeaderText: {
    flexShrink: 1,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xs,
  },
  hoursRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
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
  footerSpacer: {
    height: 72,
  },
});
