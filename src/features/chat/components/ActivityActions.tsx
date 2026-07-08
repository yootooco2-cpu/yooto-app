import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';

import { REACTIONS } from '../reactions';
import { shareService } from '../share';
import { useChatStore } from '../store';
import { formatChatTime } from '../time';
import type { ActivityComment, ActivityItem } from '../types';
import { ChatAvatar } from './ChatAvatar';

const EMPTY: ActivityComment[] = [];

function ActionBtn({ icon, label, color, onPress, accessibilityLabel }: { icon: keyof typeof Feather.glyphMap; label?: string; color: string; onPress: () => void; accessibilityLabel?: string }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel ?? label} style={({ pressed }) => [styles.actBtn, pressed && styles.pressed]}>
      <Feather name={icon} size={18} color={color} />
      {label ? <YText variant="caption" style={{ color, fontWeight: '600' }}>{label}</YText> : null}
    </Pressable>
  );
}

/**
 * Barre d'actions DISCRÈTE d'une carte d'activité : réactions utiles (repliées derrière « Réagir »),
 * réponses (repliées : « N réponses »), enregistrer (⭐) et partager (architecture prête). Jamais
 * plus visible que le contenu.
 */
export function ActivityActions({ item }: { item: ActivityItem }) {
  const { colors } = useTheme();
  const section = useSectionTheme();
  const myReaction = useChatStore((s) => s.myReactions[item.id]);
  const saved = useChatStore((s) => Boolean(s.saved[item.id]));
  const comments = useChatStore((s) => s.commentsByActivity[item.id]) ?? EMPTY;
  const participants = useChatStore((s) => s.participants);
  const toggleReaction = useChatStore((s) => s.toggleReaction);
  const toggleSave = useChatStore((s) => s.toggleSave);
  const addComment = useChatStore((s) => s.addComment);

  const [picker, setPicker] = useState(false);
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [now] = useState(() => Date.now());

  const total = (item.reactions ?? []).reduce((n, r) => n + r.count, 0);
  const topEmojis = (item.reactions ?? []).slice(0, 3).map((r) => r.emoji).join('');

  const onReact = (emoji: (typeof REACTIONS)[number]['emoji']) => {
    setPicker(false);
    void toggleReaction(item.id, emoji);
  };
  const onSend = () => {
    const t = draft.trim();
    if (!t) return;
    setDraft('');
    void addComment(item.id, t);
  };

  const reactColor = myReaction ? section.accent : colors.mutedText;

  return (
    <View style={[styles.wrap, { borderTopColor: colors.border }]}>
      <View style={styles.bar}>
        {total > 0 ? (
          <View style={styles.summary}>
            <YText style={styles.sumEmoji}>{topEmojis}</YText>
            <YText variant="caption" color="muted">{total}</YText>
          </View>
        ) : (
          <View style={styles.summary} />
        )}
        <View style={styles.actions}>
          <ActionBtn icon="smile" label="Réagir" color={reactColor} onPress={() => setPicker((p) => !p)} />
          <ActionBtn icon="message-circle" label={comments.length > 0 ? String(comments.length) : 'Répondre'} color={open ? section.accent : colors.mutedText} onPress={() => setOpen((o) => !o)} accessibilityLabel="Répondre" />
          <ActionBtn icon="star" color={saved ? colors.accent : colors.mutedText} onPress={() => void toggleSave(item.id)} accessibilityLabel={saved ? 'Enregistré' : 'Enregistrer'} />
          <ActionBtn icon="share-2" color={colors.mutedText} onPress={() => void shareService.share({ type: 'activity', id: item.id }, 'link')} accessibilityLabel="Partager" />
        </View>
      </View>

      {picker ? (
        <View style={styles.picker}>
          {REACTIONS.map((r) => (
            <Pressable
              key={r.emoji}
              onPress={() => onReact(r.emoji)}
              accessibilityRole="button"
              accessibilityLabel={r.label}
              style={({ pressed }) => [styles.reactBtn, myReaction === r.emoji && { backgroundColor: `${section.accent}22`, borderColor: section.accent }, pressed && styles.pressed]}>
              <YText style={styles.reactEmoji}>{r.emoji}</YText>
            </Pressable>
          ))}
        </View>
      ) : null}

      {open ? (
        <View style={styles.comments}>
          {comments.length > 3 ? <YText variant="caption" color="muted" style={styles.seeAll}>Voir {comments.length} réponses</YText> : null}
          {comments.map((c) => {
            const a = participants[c.authorId];
            return (
              <View key={c.id} style={styles.comment}>
                <ChatAvatar name={a?.name ?? '—'} avatarUrl={a?.avatarUrl} size={28} />
                <View style={styles.cbody}>
                  <View style={styles.chead}>
                    <YText numberOfLines={1} style={[styles.cname, { color: colors.text }]}>{a?.name ?? '—'}</YText>
                    <YText variant="caption" color="muted">{formatChatTime(c.createdAt, now)}</YText>
                  </View>
                  <YText variant="caption" style={{ color: colors.mutedText }}>{c.body}</YText>
                </View>
              </View>
            );
          })}
          <View style={[styles.inputRow, { borderColor: colors.border, backgroundColor: colors.surfaceAlt }]}>
            <TextInput value={draft} onChangeText={setDraft} placeholder="Écrire une réponse…" placeholderTextColor={colors.mutedText} style={[styles.input, { color: colors.text }]} onSubmitEditing={onSend} blurOnSubmit={false} returnKeyType="send" />
            <Pressable onPress={onSend} disabled={draft.trim().length === 0} accessibilityLabel="Envoyer" style={[styles.send, { backgroundColor: section.accent, opacity: draft.trim() ? 1 : 0.4 }]}>
              <Feather name="arrow-up" size={15} color={section.onAccent} />
            </Pressable>
          </View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: spacing.sm, paddingTop: spacing.sm, borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 24 },
  sumEmoji: { fontSize: 13 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  actBtn: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  pressed: { opacity: 0.6 },
  picker: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  reactBtn: { width: 42, height: 38, borderRadius: radii.md, borderWidth: 1, borderColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  reactEmoji: { fontSize: 20 },
  comments: { gap: spacing.sm },
  seeAll: { fontWeight: '600' },
  comment: { flexDirection: 'row', gap: spacing.sm, alignItems: 'flex-start' },
  cbody: { flex: 1, gap: 1 },
  chead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cname: { flexShrink: 1, fontSize: 13, fontWeight: '700' },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, borderRadius: radii.lg, borderWidth: 1, paddingLeft: spacing.md, paddingRight: 4, paddingVertical: 4 },
  input: { flex: 1, fontSize: 14, paddingVertical: 6 },
  send: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
