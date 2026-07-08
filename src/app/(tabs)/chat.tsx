import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';

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

  const [space, setSpace] = useState<ChatSpace>('activity');
  const [category, setCategory] = useState('all');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [now] = useState(() => Date.now());

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

  return (
    <YScreen transparent gap="md" padding="lg">
      {/* En-tête : identité + recherche + nouveau message. */}
      <View style={styles.header}>
        <View style={styles.titleCol}>
          <YText style={[styles.title, { color: glass.onDark }]}>Chat</YText>
          <YText style={[styles.subtitle, { color: glass.onDarkMuted }]}>Échangez avec votre communauté locale</YText>
        </View>
        <View style={styles.actions}>
          <IconButton icon="search" label="Rechercher" active={searching} onPress={() => setSearching((s) => !s)} />
          <IconButton icon="edit" label="Nouveau message" onPress={() => router.push('/chat/new')} />
        </View>
      </View>

      <ChatSpaceSwitcher space={space} onChange={setSpace} unread={unread} />

      {searching ? (
        <YSearchBar variant="glass" value={query} onChangeText={setQuery} placeholder="Rechercher dans la place du village…" />
      ) : null}

      {space === 'discussions' ? <ChatCategoryBar activeId={category} onSelect={setCategory} /> : null}

      {space === 'activity' ? (
        <FlatList
          data={shownActivity}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => <ActivityCard item={item} author={participants[item.authorId]} now={now} />}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Empty label="Rien de neuf autour de vous pour l’instant." />}
        />
      ) : (
        <FlatList
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  titleCol: { flex: 1, gap: 4 },
  title: { fontSize: 28, fontWeight: '800', letterSpacing: -0.6 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  actions: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  iconBtnActive: { opacity: 0.9 },
  iconBtnPressed: { opacity: 0.72, transform: [{ scale: 0.95 }] },
  listContent: { gap: spacing.sm, paddingBottom: spacing.lg },
});
