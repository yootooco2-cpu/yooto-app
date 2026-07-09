import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { FavoritesButton } from '@/components/favorites/FavoritesButton';
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
  NotificationsStrip,
  buildFeedNotifications,
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
  const following = useChatStore((s) => s.following);

  const [space, setSpace] = useState<ChatSpace>('activity');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const listRef = useRef<FlatList>(null);

  useEffect(() => {
    void init();
  }, [init]);

  // Réconciliation : les acteurs pro du Chat = vrais commerces Supabase (nom, photo, fiche).
  // On attend que le store soit `ready` (init a peuplé les participants) AVANT de superposer les
  // vrais commerces — sinon la fin d'init (asynchrone) écrase l'hydratation et rétablit les mock,
  // laissant des merchantId invalides → clic vers une fiche « introuvable ».
  useEffect(() => {
    if (!ready || !realMerchants) return;
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
  }, [ready, realMerchants, hydrateFromMerchants]);

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

  // Notifications sociales (tri intelligent) dérivées des vraies publications.
  const notifications = useMemo(() => buildFeedNotifications(activity, following, now), [activity, following, now]);

  // Clic sur une notification → scroll fluide vers la publication + surbrillance temporaire.
  const handleOpenNotification = (id: string) => {
    const idx = shownActivity.findIndex((a) => a.id === id);
    if (idx < 0) return;
    setHighlightedId(id);
    requestAnimationFrame(() => listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.25 }));
    setTimeout(() => setHighlightedId((cur) => (cur === id ? null : cur)), 2200);
  };

  return (
    <YScreen transparent gap="sm" padding="lg">
      {/* En-tête volontairement SANS titre « Chat » : on est déjà dans l'onglet Chat → l'écran
          démarre directement sur la barre de recherche premium, comme la Carte (plus immersif). */}
      {/* BARRE DE RECHERCHE PARTAGÉE AVEC LA CARTE — même YSearchBar (variant glass) + même bouton
          Favoris circulaire à droite, même agencement (searchRow flex + gap) que le SearchMenu de la
          Carte. Seul le placeholder change. Ancrage fixe, jamais masqué par un changement de catégorie. */}
      <View style={styles.searchRow}>
        <View style={styles.searchFlex}>
          <YSearchBar
            variant="glass"
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une discussion, un commerçant ou une personne…"
          />
        </View>
        <FavoritesButton onPress={() => router.push('/explore')} />
      </View>

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
          ref={listRef}
          style={styles.list}
          data={shownActivity}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <ActivityCard item={item} author={participants[item.authorId]} now={now} highlighted={highlightedId === item.id} />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          onScrollToIndexFailed={(info) => {
            listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: true });
            setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.25 }), 350);
          }}
          ListHeaderComponent={
            q ? null : (
              <View style={styles.feedHead}>
                <NotificationsStrip notifications={notifications} participants={participants} now={now} onOpen={handleOpenNotification} />
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
  // Ligne de recherche IDENTIQUE au SearchMenu de la Carte (flex + gap + Favoris à droite).
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  searchFlex: { flex: 1 },
  // Région de contenu FIXE : la liste occupe tout l'espace sous les filtres et défile en interne
  // → l'en-tête/onglets/sous-catégories restent parfaitement immobiles quel que soit le filtre.
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  feedHead: { gap: spacing.lg, marginBottom: spacing.md },
  skeletonFeed: { gap: spacing.sm },
});
