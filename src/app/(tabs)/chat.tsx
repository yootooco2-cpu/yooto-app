import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { ProfileAvatarButton } from '@/components/profile/ProfileAvatarButton';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { SupportContactFooter } from '@/components/ui/SupportContactFooter';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { ChatCategoryBar } from '@/features/chat';

/**
 * Onglet CHAT — l'espace d'échange local de YOOTOO (particuliers ↔ commerçants). Pour l'instant,
 * uniquement la STRUCTURE de page (recherche · catégories · fil de discussions) posée sur l'univers
 * « chat » (bleu-sarcelle). Les fonctionnalités (publier, répondre, notifications, messagerie
 * privée) seront branchées progressivement — voir `@/features/chat`.
 */
function ChatBody() {
  const section = useSectionTheme();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('all');

  return (
    <YScreen transparent scroll gap="lg" padding="lg">
      {/* En-tête : identité de l'espace + avatar profil (chrome partagé). */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <YText style={[styles.title, { color: glass.onDark }]}>Chat</YText>
          <YText style={[styles.subtitle, { color: glass.onDarkMuted }]}>
            La communauté locale de YOOTOO — échangez avec les commerçants et les habitants près de chez vous.
          </YText>
        </View>
        <ProfileAvatarButton />
      </View>

      {/* Recherche dans les discussions (structure). */}
      <YSearchBar
        variant="glass"
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une discussion, un sujet…"
      />

      {/* Catégories de discussion (architecture évolutive). */}
      <ChatCategoryBar activeId={category} onSelect={setCategory} />

      {/* Action principale à venir : lancer une discussion. */}
      <View style={[styles.compose, { backgroundColor: section.accent }, shadows.md]}>
        <Feather name="edit-3" size={18} color={section.onAccent} />
        <YText style={[styles.composeLabel, { color: section.onAccent }]}>Lancer une discussion</YText>
        <View style={styles.soon}>
          <YText style={styles.soonText}>Bientôt</YText>
        </View>
      </View>

      {/* Fil de discussions — état d'attente premium (aucune donnée pour l'instant). */}
      <View style={[styles.empty, glass.panel]}>
        <View style={[styles.emptyIcon, { backgroundColor: section.accent }]}>
          <Feather name="message-circle" size={24} color={section.onAccent} />
        </View>
        <YText style={[styles.emptyTitle, { color: glass.onDark }]}>Les premières discussions arrivent bientôt</YText>
        <YText style={[styles.emptyText, { color: glass.onDarkMuted }]}>
          Le Chat réunira habitants et commerçants autour de la vie locale : bons plans, questions, événements,
          recommandations, nouveautés, entraide… Un espace bienveillant, utile et 100 % local.
        </YText>
      </View>

      <SupportContactFooter />
    </YScreen>
  );
}

export default function ChatTab() {
  return (
    <SectionScreen section="chat">
      <ChatBody />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  titleCol: { flex: 1, gap: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  compose: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  composeLabel: { flex: 1, fontSize: 16, fontWeight: '700' },
  soon: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: radii.pill,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  soonText: { fontSize: 11, fontWeight: '700', color: '#FFFFFF', letterSpacing: 0.3 },
  empty: {
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    borderRadius: radii.lg,
  },
  emptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  emptyTitle: { fontSize: 17, fontWeight: '800', textAlign: 'center', letterSpacing: -0.2 },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
});
