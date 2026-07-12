import { useLocalSearchParams, useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { MerchantCard } from '@/components/cards/MerchantCard';
import { Cryptogram } from '@/components/merchants/Cryptogram';
import { MerchantPhoto } from '@/components/merchants/MerchantPhoto';
import { VerifiedMark } from '@/components/merchants/VerifiedMark';
import { YButton } from '@/components/ui/YButton';
import { YCard } from '@/components/ui/YCard';
import { YScreen } from '@/components/ui/YScreen';
import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import {
  completionChecklist,
  formatCityName,
  getMerchantCoverPhoto,
  isDisplayablePhoto,
  useMerchant,
} from '@/features/merchants';
import { cryptogramForMerchant } from '@/features/merchants/cryptograms';
import { isVerifiedMerchant } from '@/features/merchants/verification';

/** Or du sceau — la même teinte que le liseré des points vérifiés de la carte. */
const SEAL_GOLD = '#C9A227';

/**
 * ESPACE COMMERÇANT — DÉMONSTRATION (lecture seule).
 *
 * ⚠ Aucune authentification ni revendication de fiche n'existe encore (merchant_claims
 * et merchant_users sont vides — Étape 0). Cet écran est donc une DÉMONSTRATION assumée
 * sur fiches de test : il n'édite RIEN et ne prétend jamais être relié à un compte.
 * Le flux « authentification + revendication » est le chantier préalable à l'espace réel.
 *
 * Doctrine affichage (Constitution ch.10) : JAMAIS une note — aucun chiffre, aucune
 * fraction, aucun pourcentage, nulle part. Uniquement l'acquis (✓) et les actions (→).
 */
export default function EspaceCommercantDemo() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ id?: string | string[] }>();
  const id = Array.isArray(params.id) ? (params.id[0] ?? '') : (params.id ?? '');
  const { data: merchant, isLoading } = useMerchant(id);

  if (isLoading || !merchant) {
    return (
      <YScreen center>
        <YText variant="body" color="muted">
          {isLoading ? 'Chargement de votre fiche…' : 'Fiche de démonstration introuvable.'}
        </YText>
      </YScreen>
    );
  }

  const verified = isVerifiedMerchant(merchant);
  const actions = completionChecklist(merchant);
  const acquis: string[] = [];
  if (isDisplayablePhoto(merchant)) acquis.push('Photo principale');
  if (verified) acquis.push('Établissement vérifié (SIRET)');
  if (merchant.phone) acquis.push('Téléphone');
  if (merchant.openingHours?.length) acquis.push('Horaires');
  if (merchant.website) acquis.push('Site internet');

  // Miroir carte : la strate RÉELLE du marqueur, dérivée des mêmes règles que la carte.
  const stratum = isDisplayablePhoto(merchant)
    ? { label: 'Votre vitrine en médaillon photo sur la carte', kind: 'photo' as const }
    : verified
      ? { label: 'Votre point porte le liseré or du sceau sur la carte', kind: 'gold' as const }
      : { label: 'Votre commerce apparaît en point discret sur la carte', kind: 'dot' as const };

  return (
    <YScreen scroll gap="lg" padding="lg">
      {/* Bandeau DÉMONSTRATION — l'honnêteté avant tout : rien n'est relié à un compte. */}
      <View style={[styles.demoBanner, { borderColor: colors.border }]}>
        <YText variant="caption" color="muted">
          Démonstration — aperçu de l’espace commerçant. Aucune connexion ni modification :
          la revendication de fiche arrive bientôt.
        </YText>
      </View>

      {/* 1 · IDENTITÉ */}
      <YCard>
        <View style={styles.identityRow}>
          <View style={styles.identityPhoto}>
            <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={84} rounded={radii.lg} recyclingKey={merchant.id} />
          </View>
          <View style={styles.identityText}>
            <View style={styles.nameRow}>
              <YText variant="title" numberOfLines={2}>{merchant.name}</YText>
              <VerifiedMark merchant={merchant} />
            </View>
            <View style={styles.metaRow}>
              <Cryptogram id={cryptogramForMerchant(merchant)} size={20} />
              <YText variant="body" color="muted">{formatCityName(merchant.city) || merchant.address}</YText>
            </View>
            {verified ? (
              <YText variant="caption" style={{ color: SEAL_GOLD }}>
                Identité vérifiée par le registre officiel — votre preuve d’État est déjà votre plus bel atout.
              </YText>
            ) : null}
          </View>
        </View>
      </YCard>

      {/* 2 · COMPLÉTUDE — l'acquis puis les actions. Jamais un chiffre, nulle part. */}
      <YCard>
        <YText variant="subtitle">Votre fiche</YText>
        {acquis.map((item) => (
          <View key={item} style={styles.checkRow}>
            <YText variant="body" style={{ color: colors.primary }}>✓</YText>
            <YText variant="body">{item}</YText>
          </View>
        ))}
        {actions.length > 0 ? (
          <>
            <YText variant="caption" color="muted" style={styles.sectionGap}>
              Pour compléter votre fiche
            </YText>
            {actions.map((item: string) => (
              <View key={item} style={styles.checkRow}>
                <YText variant="body" color="muted">→</YText>
                <YText variant="body">{item}</YText>
              </View>
            ))}
          </>
        ) : (
          <YText variant="body" style={styles.sectionGap}>
            Votre fiche est complète — elle se présente sous son meilleur jour. Merci !
          </YText>
        )}
      </YCard>

      {/* 3 · POURQUOI COMPLÉTER */}
      <YCard>
        <YText variant="subtitle">Pourquoi compléter ?</YText>
        <YText variant="body" color="muted">
          Les fiches les plus complètes apparaissent plus haut lors de la découverte.
          Aucune fiche n’est jamais cachée, et la qualité de votre commerce n’est jamais
          jugée : seule la richesse des informations améliore votre présentation.
        </YText>
      </YCard>

      {/* 4 · APERÇU — MIROIR : la fiche telle qu'elle apparaît VRAIMENT, règles réelles. */}
      <YCard>
        <YText variant="subtitle">Votre fiche, telle que les habitants la voient</YText>
        <View style={styles.mirrorRow}>
          <View style={styles.mirrorCard}>
            <MerchantCard merchant={merchant} />
          </View>
          <View style={styles.mirrorMap}>
            {stratum.kind === 'photo' ? (
              <View style={[styles.markerPhoto, { borderColor: SEAL_GOLD }]}>
                <MerchantPhoto uri={getMerchantCoverPhoto(merchant)} height={44} rounded={22} recyclingKey={`m-${merchant.id}`} />
              </View>
            ) : (
              <View
                style={[
                  styles.markerDot,
                  stratum.kind === 'gold'
                    ? { width: 16, height: 16, borderColor: SEAL_GOLD, borderWidth: 2.5, backgroundColor: colors.accent }
                    : { width: 12, height: 12, borderColor: '#FFFFFF', borderWidth: 2, backgroundColor: colors.accent },
                ]}
              />
            )}
            <YText variant="caption" color="muted" style={styles.markerLabel}>
              {stratum.label}
            </YText>
          </View>
        </View>
        <YText variant="caption" color="muted">
          {actions.length > 0
            ? 'Aujourd’hui, des fiches plus complètes se présentent avant la vôtre à la découverte — chaque information ajoutée vous fait remonter.'
            : 'Votre fiche fait partie des mieux présentées de sa catégorie.'}
        </YText>
      </YCard>

      <YButton label="Voir ma fiche publique" onPress={() => router.push(`/merchant/${merchant.id}`)} />
    </YScreen>
  );
}

const styles = StyleSheet.create({
  demoBanner: {
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  identityRow: { flexDirection: 'row', gap: spacing.md },
  identityPhoto: { width: 84 },
  identityText: { flex: 1, gap: spacing.xs },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  checkRow: { flexDirection: 'row', gap: spacing.sm, alignItems: 'center', paddingVertical: 2 },
  sectionGap: { marginTop: spacing.sm },
  mirrorRow: { flexDirection: 'row', gap: spacing.md, alignItems: 'flex-start' },
  mirrorCard: { flex: 1.2 },
  mirrorMap: { flex: 1, alignItems: 'center', gap: spacing.sm, paddingTop: spacing.lg },
  markerPhoto: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, overflow: 'hidden' },
  markerDot: { borderRadius: 999 },
  markerLabel: { textAlign: 'center' },
});
