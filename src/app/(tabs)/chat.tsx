import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';

import { ProfileAvatarButton } from '@/components/profile/ProfileAvatarButton';
import { SectionScreen } from '@/components/theme/SectionScreen';
import { YScreen } from '@/components/ui/YScreen';
import { YSearchBar } from '@/components/ui/YSearchBar';
import { YText } from '@/components/ui/YText';
import { glass } from '@/design/tokens/glass';
import { spacing } from '@/design/tokens/spacing';
import {
  ActivityCard,
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

/** Bouton d'action circulaire en verre (même langage que l'avatar profil). */
function IconButton({ icon, onPress, active, label }: { icon: keyof typeof Feather.glyphMap; onPress: () => void; active?: boolean; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.iconBtn, glass.panel, active && styles.iconBtnActive, pressed && styles.iconBtnPressed]}>
      <Feather name={icon} size={20} color={glass.onDark} />
    </Pressable>
  );
}

function ChatBody() {
  const router = useRouter();
  const init = useChatStore((s) => s.init);
  const conversations = useChatStore((s) => s.conversations);
  const participants = useChatStore((s) => s.participants);
  const messages = useChatStore((s) => s.messages);
  const activity = useChatStore((s) => s.activity);
  const trends = useChatStore((s) => s.trends);

  const [space, setSpace] = useState<ChatSpace>('activity');
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());
  const searchRef = useRef<TextInput>(null);

  useEffect(() => {
    void init();
  }, [init]);

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
      {/* LIGNE 1 — avatar (identité personnelle) + titre + actions. En-tête COMPACT. */}
      <View style={styles.header}>
        <ProfileAvatarButton size={48} />
        <View style={styles.titleCol}>
          <YText style={[styles.title, { color: glass.onDark }]}>Chat</YText>
          <YText numberOfLines={1} style={[styles.subtitle, { color: glass.onDarkMuted }]}>Échangez avec votre communauté locale</YText>
        </View>
        <View style={styles.actions}>
          <IconButton icon="search" label="Rechercher" onPress={() => searchRef.current?.focus()} />
          <IconButton icon="edit" label="Nouveau message" onPress={() => router.push('/chat/new')} />
        </View>
      </View>

      {/* BARRE DE RECHERCHE PERMANENTE — ancrage fixe, jamais masquée par un changement de catégorie. */}
      <YSearchBar
        ref={searchRef}
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
      {space === 'activity' ? (
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
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { opacity: 0.9 },
  iconBtnPressed: { opacity: 0.72, transform: [{ scale: 0.95 }] },
  // Région de contenu FIXE : la liste occupe tout l'espace sous les filtres et défile en interne
  // → l'en-tête/onglets/sous-catégories restent parfaitement immobiles quel que soit le filtre.
  list: { flex: 1 },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
  feedHead: { gap: spacing.lg, marginBottom: spacing.md },
});
