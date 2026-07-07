import { Feather } from '@expo/vector-icons';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { YText } from '@/components/ui/YText';
import { useTheme } from '@/design/theme/ThemeProvider';
import { radii } from '@/design/tokens/radii';
import { shadows } from '@/design/tokens/shadows';
import { spacing } from '@/design/tokens/spacing';

type ToastVariant = 'default' | 'success' | 'error';
interface ToastState {
  id: number;
  message: string;
  variant: ToastVariant;
}
interface ToastContextValue {
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

/**
 * Fournisseur de TOASTS — confirmation discrète en bas d'écran (sauvegardes, erreurs).
 * Auto-disparition, thémé, animation douce. À placer haut dans l'arbre (une seule instance).
 */
export function ToastProvider({ children }: { children: ReactNode }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((message: string, variant: ToastVariant = 'default') => {
    if (timer.current) clearTimeout(timer.current);
    setToast({ id: Date.now(), message, variant });
  }, []);

  useEffect(() => {
    if (!toast) return;
    timer.current = setTimeout(() => setToast(null), 2200);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [toast]);

  const icon =
    toast?.variant === 'success' ? 'check-circle' : toast?.variant === 'error' ? 'alert-triangle' : 'info';
  const accent =
    toast?.variant === 'success' ? colors.success : toast?.variant === 'error' ? colors.danger : colors.primary;

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      {toast ? (
        <Animated.View
          key={toast.id}
          entering={FadeInDown.duration(220)}
          exiting={FadeOutDown.duration(180)}
          pointerEvents="none"
          style={[styles.wrap, { bottom: insets.bottom + spacing.xxl }]}>
          <View style={[styles.toast, { backgroundColor: colors.surface, borderColor: colors.border }, shadows.lg]}>
            <Feather name={icon} size={16} color={accent} />
            <YText variant="caption" style={[styles.text, { color: colors.text }]} numberOfLines={2}>
              {toast.message}
            </YText>
          </View>
        </Animated.View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast doit être utilisé dans <ToastProvider>.');
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', paddingHorizontal: spacing.lg },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.md,
    borderRadius: radii.pill,
    borderWidth: 1,
    maxWidth: 420,
  },
  text: { flexShrink: 1 },
});
