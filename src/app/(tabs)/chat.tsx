import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { ProfileAvatarButton } from '@/components/profile/ProfileAvatarButton';
import { getMerchantCoverPhoto, useMerchants } from '@/features/merchants';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';
import {
  ActivityCard,
  ChatCardSkeleton,
  ChatCategoryBar,
  ChatSpaceSwitcher,
  ConversationCard,
  HighlightCard,
  TrendsStrip,
  highlightActivity,
  selectDiscussions,
  selectPrivateMessages,
  toConversationView,
  unreadPrivateCount,
  useChatStore,
  type ChatConversationView,
  type ChatSpace,
} from '@/features/chat';

function ChatBody() {
  const router = useRouter();
  const init = useChatStore((s) => s.init);
  const ready = useChatStore((s) => s.ready);
  const hydrateFromMerchants = useChatStore((s) => s.hydrateFromMerchants);
  const { data: realMerchants } = useMerchants();
  const conversations = useChatStore((s) => s.conversations);
  const participants = useChatStore((s) => s.participants);
  const messages = useChatStore((s) => s.messages);
  const activity = useChatStore((s) => s.activity);
  const trends = useChatStore((s) => s.trends);

  const [space, setSpace] = useState<ChatSpace>('activity');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void init();
  }, [init]);

  // Réconciliation : les acteurs pro du Chat = vrais commerces Supabase (nom, photo, fiche).
  useEffect(() => {
    if (!realMerchants) return;
    const list = realMerchants
      .map((m) => ({ m, photo: getMerchantCoverPhoto(m) }))
      .filter((x) => x.photo !== null)
      .slice(0, 8)
      .map(({ m, photo }) => ({
        id: m.id,
        name: m.name,
        category: m.category,
        photo: photo as string,
        distanceLabel: m.distanceLabel && m.distanceLabel !== '—' ? m.distanceLabel : undefined,
        isProducer: m.isProducer,
      }));
    if (list.length > 0) hydrateFromMerchants(list);
  }, [realMerchants, hydrateFromMerchants]);

  const q = query.trim().toLowerCase();
  const unread = useMemo(() => unreadPrivateCount(conversations), [conversations]);

  const matchesQuery = (v: ChatConversationView) =>
    `${v.author.name} ${v.conversation.title} ${v.lastMessage?.body ?? ''}`.toLowerCase().includes(q);

  const discussionViews = useMemo(
    () => selectDiscussions(conversations, category).map((c) => toConversationView(participants, messages, c)),
    [conversations, category, participants, messages],
  );
  const messageViews = useMemo(
    () => selectPrivateMessages(conversations).map((c) => toConversationView(participants, messages, c)),
    [conversations, participants, messages],
  );

  const shownActivity = q
    ? activity.filter((a) => `${participants[a.authorId]?.name ?? ''} ${a.title} ${a.body ?? ''}`.toLowerCase().includes(q))
    : activity;
  const highlight = highlightActivity(activity, now);

  return (
    <YScreen transparent gap="sm" padding="lg">
      {/* LIGNE 1 — titre à gauche, avatar (seul élément d'action) à droite. En-tête épuré. */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <YText style={[styles.title, { color: glass.onDark }]}>Chat</YText>
          <YText numberOfLines={1} style={[styles.subtitle, { color: glass.onDarkMuted }]}>Échangez avec votre communauté locale</YText>
        </View>
        <ProfileAvatarButton size={48} />
      </View>

      {/* BARRE DE RECHERCHE PERMANENTE — ancrage fixe, jamais masquée par un changement de catégorie. */}
      <YSearchBar
        variant="glass"
        value={query}
        onChangeText={setQuery}
        placeholder="Rechercher une discussion, un commerçant ou une personne…"
      />

      {/* LIGNE 2 — onglets principaux (compacts). */}
      <ChatSpaceSwitcher space={space} onChange={setSpace} unread={unread} dense />

      {/* LIGNE 3 — sous-catégories (denses), uniquement pour Discussions. */}
      {space === 'discussions' ? <ChatCategoryBar activeId={category} onSelect={setCategory} dense /> : null}

      {/* ZONE DE CONTENU À RÉGION FIXE (`flex: 1`) : seule la LISTE évolue à l'intérieur de son
          cadre. L'en-tête, les onglets et les sous-catégories (au-dessus) ne bougent JAMAIS —
          changer de catégorie n'est qu'un filtre, jamais une reconstruction d'écran. */}
      {!ready ? (
        <View style={[styles.list, styles.skeletonFeed]}>
          <ChatCardSkeleton />
          <ChatCardSkeleton />
          <ChatCardSkeleton />
          <ChatCardSkeleton />
        </View>
      ) : space === 'activity' ? (
        <FlatList
          style={styles.list}
          data={shownActivity}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ActivityCard item={item} author={participants[item.authorId]} now={now} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            q ? null : (
              <View style={styles.feedHead}>
                <TrendsStrip trends={trends} />
                {highlight ? <HighlightCard item={highlight} author={participants[highlight.authorId]} now={now} /> : null}
              </View>
            )
          }
          ListEmptyComponent={<Empty label="Rien de neuf autour de vous pour l’instant." />}
        />
      ) : (
        <FlatList
          style={styles.list}
          data={(space === 'discussions' ? discussionViews : messageViews).filter((v) => (q ? matchesQuery(v) : true))}
          keyExtractor={(v) => v.conversation.id}
          renderItem={({ item }) => (
            <ConversationCard view={item} now={now} onPress={() => router.push(`/chat/${item.conversation.id}`)} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Empty label={space === 'messages' ? 'Aucun message privé pour l’instant.' : 'Aucune discussion dans cette catégorie.'} />
          }
        />
      )}
    </YScreen>
  );
}

function Empty({ label }: { label: string }) {
  return (
    <YText variant="body" style={{ color: glass.onDarkMuted, textAlign: 'center', marginTop: spacing.xl }}>
      {label}
    </YText>
  );
}

export default function ChatScreen() {
  return (
    <SectionScreen section="chat">
      <ChatBody />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  titleCol: { flex: 1, gap: 1 },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.4 },
  subtitle: { fontSize: 13, lineHeight: 17 },
  // Région de contenu FIXE : la liste occupe tout l'espace sous les filtres et défile en interne
  // → l'en-tête/onglets/sous-catégories restent parfaitement immobiles quel que soit le filtre.
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  feedHead: { gap: spacing.lg, marginBottom: spacing.md },
  skeletonFeed: { gap: spacing.sm },
});
