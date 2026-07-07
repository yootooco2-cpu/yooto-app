import { Feather } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { useToast } from '@/components/ui/Toast';
import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';
import { useSession } from '@/features/auth';
import { haptics } from '@/lib/haptics';
import { ProfileService } from '@/services/ProfileService';
import { StorageService } from '@/services/StorageService';

interface FieldProps {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: 'default' | 'phone-pad' | 'url';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  multiline?: boolean;
  color: string;
  muted: string;
  border: string;
  surface: string;
}

function Field({ label, value, onChangeText, placeholder, keyboardType = 'default', autoCapitalize = 'sentences', multiline, color, muted, border, surface }: FieldProps) {
  return (
    <View style={styles.field}>
      <YText variant="caption" style={[styles.fieldLabel, { color: muted }]}>
        {label}
      </YText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={muted}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
        style={[styles.input, multiline && styles.inputMultiline, { color, borderColor: border, backgroundColor: surface }]}
      />
    </View>
  );
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const toast = useToast();
  const { status, userId } = useSession();
  const isAuth = status === 'authenticated' && !!userId;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [website, setWebsite] = useState('');

  useEffect(() => {
    if (!userId) return;
    let active = true;
    void ProfileService.get(userId).then((p) => {
      if (!active) return;
      if (p) {
        setAvatarUrl(p.avatarUrl);
        setFirstName(p.firstName ?? '');
        setLastName(p.lastName ?? '');
        setUsername(p.username ?? '');
        setBio(p.bio ?? '');
        setPhone(p.phone ?? '');
        setCity(p.city ?? '');
        setWebsite(p.website ?? '');
      }
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [userId]);

  const pickAndUpload = async (source: 'library' | 'camera') => {
    if (!userId || uploading) return;
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        toast.show('Autorisation refusée', 'error');
        return;
      }
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.9 })
          : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
      if (result.canceled || !result.assets[0]) return;

      setUploading(true);
      let uri = result.assets[0].uri;
      try {
        const m = await ImageManipulator.manipulateAsync(uri, [{ resize: { width: 512 } }], { compress: 0.72, format: ImageManipulator.SaveFormat.JPEG });
        uri = m.uri;
      } catch {
        /* recadrage/compression indisponible : on envoie l'image telle quelle. */
      }
      const bytes = new Uint8Array(await (await fetch(uri)).arrayBuffer());
      const res = await StorageService.uploadAvatar(userId, bytes, 'image/jpeg');
      if (res.ok && res.url) {
        // Persiste immédiatement l'URL → photo visible dès le retour au profil.
        await ProfileService.update(userId, { avatar_url: res.url });
        setAvatarUrl(`${res.url}?t=${Date.now()}`);
        haptics.success();
        toast.show('Photo mise à jour', 'success');
      } else {
        haptics.error();
        toast.show('Envoi de la photo impossible', 'error');
      }
    } catch {
      haptics.error();
      toast.show('Envoi de la photo impossible', 'error');
    } finally {
      setUploading(false);
    }
  };

  const onSave = async () => {
    if (!userId || saving) return;
    setSaving(true);
    const displayName = `${firstName} ${lastName}`.trim() || null;
    const res = await ProfileService.update(userId, {
      first_name: firstName.trim() || null,
      last_name: lastName.trim() || null,
      username: username.trim() || null,
      bio: bio.trim() || null,
      phone: phone.trim() || null,
      city: city.trim() || null,
      website: website.trim() || null,
      display_name: displayName,
    });
    setSaving(false);
    if (res.ok) {
      haptics.success();
      toast.show('Profil enregistré', 'success');
      router.back();
    } else {
      haptics.error();
      toast.show(res.error === 'not-configured' ? 'Connexion requise' : 'Enregistrement impossible', 'error');
    }
  };

  const initial = (firstName || username || 'Y').trim().charAt(0).toUpperCase();
  const fieldColors = { color: colors.text, muted: colors.mutedText, border: colors.border, surface: colors.surface };

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { borderBottomColor: colors.separator }]}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityRole="button" accessibilityLabel="Retour" style={styles.headerBtn}>
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <YText style={[styles.headerTitle, { color: colors.text }]}>Modifier le profil</YText>
        <Pressable onPress={() => void onSave()} disabled={saving || !isAuth} hitSlop={10} accessibilityRole="button" accessibilityLabel="Enregistrer" style={styles.headerBtn}>
          {saving ? <ActivityIndicator size="small" color={colors.primary} /> : <YText style={[styles.save, { color: isAuth ? colors.primary : colors.mutedText }]}>OK</YText>}
        </Pressable>
      </View>

      {!isAuth ? (
        <View style={styles.center}>
          <YText variant="body" color="muted" style={{ textAlign: 'center' }}>
            Connectez-vous pour modifier votre profil.
          </YText>
        </View>
      ) : loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Avatar + actions photo */}
            <View style={styles.avatarBlock}>
              <View style={styles.avatarWrap}>
                {avatarUrl ? (
                  <Image source={{ uri: avatarUrl }} style={styles.avatar} accessibilityLabel="Photo de profil" />
                ) : (
                  <View style={[styles.avatar, styles.avatarFallback, { backgroundColor: colors.primary }]}>
                    <YText style={styles.avatarInitial}>{initial}</YText>
                  </View>
                )}
                {uploading ? (
                  <View style={[styles.avatar, styles.avatarLoading]}>
                    <ActivityIndicator color="#FFFFFF" />
                  </View>
                ) : null}
              </View>
              <View style={styles.photoActions}>
                <Pressable onPress={() => void pickAndUpload('library')} accessibilityRole="button" style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Feather name="image" size={16} color={colors.text} />
                  <YText variant="caption" style={{ color: colors.text }}>Galerie</YText>
                </Pressable>
                <Pressable onPress={() => void pickAndUpload('camera')} accessibilityRole="button" style={[styles.photoBtn, { borderColor: colors.border, backgroundColor: colors.surface }]}>
                  <Feather name="camera" size={16} color={colors.text} />
                  <YText variant="caption" style={{ color: colors.text }}>Appareil photo</YText>
                </Pressable>
              </View>
            </View>

            <View style={styles.row2}>
              <View style={styles.flex}>
                <Field label="Prénom" value={firstName} onChangeText={setFirstName} placeholder="Prénom" autoCapitalize="words" {...fieldColors} />
              </View>
              <View style={styles.flex}>
                <Field label="Nom" value={lastName} onChangeText={setLastName} placeholder="Nom" autoCapitalize="words" {...fieldColors} />
              </View>
            </View>
            <Field label="Pseudo (optionnel)" value={username} onChangeText={setUsername} placeholder="@pseudo" autoCapitalize="none" {...fieldColors} />
            <Field label="Biographie" value={bio} onChangeText={setBio} placeholder="Quelques mots sur vous…" multiline {...fieldColors} />
            <Field label="Téléphone" value={phone} onChangeText={setPhone} placeholder="06 12 34 56 78" keyboardType="phone-pad" {...fieldColors} />
            <Field label="Ville" value={city} onChangeText={setCity} placeholder="Montpellier" autoCapitalize="words" {...fieldColors} />
            <Field label="Site internet (optionnel)" value={website} onChangeText={setWebsite} placeholder="https://…" keyboardType="url" autoCapitalize="none" {...fieldColors} />

            <Pressable onPress={() => void onSave()} disabled={saving} accessibilityRole="button" style={({ pressed }) => [styles.saveBtn, { backgroundColor: colors.primary }, shadows.md, pressed && { opacity: 0.9 }]}>
              {saving ? <ActivityIndicator size="small" color="#FFFFFF" /> : <YText style={styles.saveBtnText}>Enregistrer</YText>}
            </Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerBtn: { minWidth: 44, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '800', letterSpacing: -0.3 },
  save: { fontSize: 16, fontWeight: '700' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing.lg },
  content: { padding: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md },
  avatarBlock: { alignItems: 'center', gap: spacing.md, marginBottom: spacing.sm },
  avatarWrap: { width: 104, height: 104 },
  avatar: { width: 104, height: 104, borderRadius: 52 },
  avatarFallback: { alignItems: 'center', justifyContent: 'center' },
  avatarInitial: { color: '#FFFFFF', fontSize: 38, fontWeight: '800' },
  avatarLoading: { position: 'absolute', top: 0, left: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  photoActions: { flexDirection: 'row', gap: spacing.sm },
  photoBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radii.pill, borderWidth: 1 },
  row2: { flexDirection: 'row', gap: spacing.md },
  field: { gap: 5 },
  fieldLabel: { marginLeft: spacing.xs },
  input: { borderWidth: 1, borderRadius: radii.md, paddingHorizontal: spacing.md, paddingVertical: spacing.sm + 2, fontSize: 15 },
  inputMultiline: { minHeight: 84, textAlignVertical: 'top' },
  saveBtn: { height: 54, borderRadius: radii.lg, alignItems: 'center', justifyContent: 'center', marginTop: spacing.md },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },
});
