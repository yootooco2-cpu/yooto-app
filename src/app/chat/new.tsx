import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SectionScreen } from '@/components/theme/SectionScreen';
import { YText } from '@/components/ui/YText';
import { useSectionTheme } from '@/design/theme/SectionThemeProvider';
import { useTheme } from '@/design/theme/ThemeProvider';
import { glass } from '@/design/tokens/glass';
import { radii } from '@/design/tokens/radii';
import { spacing } from '@/design/tokens/spacing';
import { PublicationTypePicker, useChatStore, type CryptoId } from '@/features/chat';

function NewDiscussionBody() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const section = useSectionTheme();
  const createConversation = useChatStore((s) => s.createConversation);
  const init = useChatStore((s) => s.init);

  const [type, setType] = useState<CryptoId | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [publishing, setPublishing] = useState(false);
  const canPublish = title.trim().length > 1 && body.trim().length > 0 && !publishing;

  const onPublish = async () => {
    if (!canPublish) return;
    setPublishing(true);
    await init();
    const id = await createConversation({ title, body, publicationKind: type ?? undefined });
    router.replace(`/chat/${id}`);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={[styles.topbar, { paddingTop: insets.top + spacing.sm, borderBottomColor: colors.border }]}>
        <Pressable onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="Fermer" style={({ pressed }) => [styles.close, glass.panel, pressed && styles.pressed]}>
          <Feather name="x" size={22} color={glass.onDark} />
        </Pressable>
        <YText style={[styles.topTitle, { color: glass.onDark }]}>Nouvelle discussion</YText>
        <View style={styles.close} />
      </View>

      <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* PIÈCE MAÎTRESSE — choix du type de publication via les 18 cryptogrammes officiels. */}
        <View style={styles.field}>
          <YText variant="label" style={{ color: glass.onDarkMuted }}>TYPE DE PUBLICATION</YText>
          <PublicationTypePicker value={type} onChange={setType} />
        </View>

        <View style={styles.field}>
          <YText variant="label" style={{ color: glass.onDarkMuted }}>SUJET</YText>
          <View style={[styles.inputWrap, glass.panel]}>
            <TextInput
              value={title}
              onChangeText={setTitle}
              placeholder="Ex. Recommandation resto pour ce soir ?"
              placeholderTextColor={glass.onDarkMuted}
              style={[styles.input, { color: glass.onDark }]}
              maxLength={90}
            />
          </View>
        </View>

        <View style={styles.field}>
          <YText variant="label" style={{ color: glass.onDarkMuted }}>VOTRE MESSAGE</YText>
          <View style={[styles.inputWrap, styles.inputWrapMultiline, glass.panel]}>
            <TextInput
              value={body}
              onChangeText={setBody}
              placeholder="Partagez votre question, votre bon plan, votre événement…"
              placeholderTextColor={glass.onDarkMuted}
              style={[styles.input, styles.inputMultiline, { color: glass.onDark }]}
              multiline
              textAlignVertical="top"
            />
          </View>
        </View>

        <YText variant="caption" style={{ color: glass.onDarkMuted }}>
          Votre discussion sera visible par la communauté locale. Restez bienveillant et utile 🌱
        </YText>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: (insets.bottom || spacing.sm) + spacing.xs }]}>
        <Pressable
          onPress={onPublish}
          disabled={!canPublish}
          accessibilityRole="button"
          accessibilityLabel="Publier la discussion"
          style={({ pressed }) => [styles.publish, { backgroundColor: section.accent, opacity: canPublish ? 1 : 0.45 }, pressed && styles.pressed]}>
          <Feather name="send" size={18} color={section.onAccent} />
          <YText style={[styles.publishLabel, { color: section.onAccent }]}>Publier</YText>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

export default function NewDiscussionScreen() {
  return (
    <SectionScreen section="chat">
      <NewDiscussionBody />
    </SectionScreen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  topTitle: { fontSize: 17, fontWeight: '800', letterSpacing: -0.2 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  form: { padding: spacing.lg, gap: spacing.lg },
  field: { gap: spacing.sm },
  inputWrap: { borderRadius: radii.lg, paddingHorizontal: spacing.md, paddingVertical: 12 },
  inputWrapMultiline: { minHeight: 160 },
  input: { fontSize: 16, lineHeight: 22 },
  inputMultiline: { minHeight: 136 },
  footer: { paddingHorizontal: spacing.lg, paddingTop: spacing.sm },
  publish: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: 15,
    borderRadius: radii.lg,
  },
  publishLabel: { fontSize: 16, fontWeight: '800' },
});
