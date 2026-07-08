import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionScreen } from '@/components/theme/SectionScreen';
import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { ChatAvatar, MessageBubble, useChatStore, type ChatMessage } from '@/features/chat';

const EMPTY: ChatMessage[] = [];

function ConversationBody() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const section = useSectionTheme();

  const init = useChatStore((s) => s.init);
  const conversation = useChatStore((s) => s.conversations.find((c) => c.id === id));
  const messages = useChatStore((s) => (id ? s.messages[id] : undefined)) ?? EMPTY;
  const participants = useChatStore((s) => s.participants);
  const currentUserId = useChatStore((s) => s.currentUserId);
  const loadMessages = useChatStore((s) => s.loadMessages);
  const markRead = useChatStore((s) => s.markRead);
  const sendMessage = useChatStore((s) => s.sendMessage);

  const [draft, setDraft] = useState('');
  const listRef = useRef<FlatList<ChatMessage>>(null);
  const [now] = useState(() => Date.now());

  useEffect(() => {
    void init();
  }, [init]);

  useEffect(() => {
    if (!id) return;
    void loadMessages(id);
    markRead(id);
  }, [id, loadMessages, markRead]);

  const isGroup = (conversation?.participantIds.length ?? 0) > 2;
  const author = conversation ? participants[conversation.authorId] : undefined;

  const onSend = () => {
    const text = draft.trim();
    if (!text || !id) return;
    setDraft('');
    void sendMessage(id, text);
  };

  const headerTitle = conversation?.title ?? 'Discussion';
  const authorLabel = useMemo(() => {
    if (!author) return '';
    return `${author.name} · ${author.kind === 'professionnel' ? 'Professionnel' : 'Particulier'}`;
  }, [author]);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Barre supérieure : retour + auteur + sujet. */}
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Retour" style={({ pressed }) => [styles.back, glass.panel, pressed && styles.pressed]}>
          <Feather name="chevron-left" size={22} color={glass.onDark} />
        </Pressable>
        {author ? <ChatAvatar name={author.name} avatarUrl={author.avatarUrl} size={40} /> : null}
        <View style={styles.topTitleCol}>
          <YText numberOfLines={1} style={[styles.topTitle, { color: glass.onDark }]}>
            {headerTitle}
          </YText>
          {authorLabel ? (
            <YText variant="caption" numberOfLines={1} style={{ color: glass.onDarkMuted }}>
              {authorLabel}
            </YText>
          ) : null}
        </View>
      </View>

      {/* Fil des messages. */}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(m) => m.id}
        renderItem={({ item, index }) => {
          const mine = item.senderId === currentUserId;
          const prev = messages[index - 1];
          const showSender = isGroup && !mine && (!prev || prev.senderId !== item.senderId);
          return (
            <MessageBubble
              message={item}
              mine={mine}
              senderName={participants[item.senderId]?.name}
              showSender={showSender}
              now={now}
            />
          );
        }}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <YText variant="body" style={{ color: glass.onDarkMuted, textAlign: 'center', marginTop: spacing.xl }}>
            Démarrez la conversation.
          </YText>
        }
      />

      {/* Saisie + envoi. */}
      <View style={[styles.inputBar, { paddingBottom: (insets.bottom || spacing.sm) + spacing.xs, borderTopColor: colors.border }]}>
        <View style={[styles.inputWrap, glass.panel]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Votre message…"
            placeholderTextColor={glass.onDarkMuted}
            style={[styles.input, { color: glass.onDark }]}
            multiline
            onSubmitEditing={onSend}
            blurOnSubmit={false}
          />
        </View>
        <Pressable
          onPress={onSend}
          disabled={draft.trim().length === 0}
          accessibilityRole="button"
          accessibilityLabel="Envoyer"
          style={({ pressed }) => [
            styles.send,
            { backgroundColor: section.accent, opacity: draft.trim().length === 0 ? 0.45 : 1 },
            pressed && styles.pressed,
          ]}>
          <Feather name="send" size={18} color={section.onAccent} />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function ConversationScreen() {
  return (
    <SectionScreen section="chat">
      <ConversationBody />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  back: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topTitleCol: { flex: 1 },
  topTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  listContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.md, flexGrow: 1 },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  inputWrap: { flex: 1, borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: Platform.OS === 'ios' ? 10 : 4, maxHeight: 120 },
  input: { fontSize: 15, lineHeight: 20, minHeight: 24 },
  send: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
