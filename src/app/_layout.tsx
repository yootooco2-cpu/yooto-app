import { QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider, useTheme } from '@/design/theme/ThemeProvider';
import { SettingsProvider } from '@/features/settings/SettingsProvider';
import { queryClient } from '@/lib/queryClient';

/** Barre de statut synchronisée avec le thème courant (clair → icônes sombres, et inversement). */
function ThemedStatusBar() {
  const { scheme } = useTheme();
  return <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />;
}

export default function RootLayout() {
  return (
    // Racine des gestures (prérequis @gorhom/bottom-sheet). ThemeProvider + SettingsProvider
    // GLOBAUX : le thème (clair/sombre/auto) et les réglages sont disponibles partout et
    // s'appliquent immédiatement, sans rechargement.
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <SettingsProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <ThemedStatusBar />
              <Stack screenOptions={{ headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="merchant/[id]" />
                <Stack.Screen name="auth" />
                <Stack.Screen name="settings" />
              </Stack>
            </ToastProvider>
          </QueryClientProvider>
        </SettingsProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
