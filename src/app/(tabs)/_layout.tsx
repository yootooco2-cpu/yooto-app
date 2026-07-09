import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/navigation/GlassTabBar';
import { useLocationSimulationSync } from '@/features/location';

/**
 * Onglets YOOTOO. NAVIGATION OFFICIELLE UNIQUE : la bottom nav GLASSMORPHISM (`GlassTabBar`) est
 * partagée par TOUS les écrans (Accueil, Carte, Commerçants, Chat, Profil) — même barre, mêmes
 * icônes/espacements/couleurs/effets. Elle prend l'identité de l'univers actif, mais son style ne
 * change jamais d'un écran à l'autre → continuité parfaite. (Plus de menu vertical sur la carte.)
 */
export default function TabsLayout() {
  // Simulation GPS (DEV) : injecte la position simulée dans l'état app-wide, tous onglets confondus.
  useLocationSimulationSync();
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => <GlassTabBar {...props} />}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="explore" options={{ title: 'Carte' }} />
      <Tabs.Screen name="merchants" options={{ title: 'Commerçants' }} />
      <Tabs.Screen name="chat" options={{ title: 'Chat' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
      {/* Carnet « De saison » : sorti de la bottom nav (href: null) mais route conservée —
          toujours accessible depuis le Profil, sans casser le lien existant. */}
      <Tabs.Screen name="de-saison" options={{ href: null, title: 'De saison' }} />
    </Tabs>
  );
}
