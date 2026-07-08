import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/navigation/GlassTabBar';
import { useLocationSimulationSync } from '@/features/location';

/**
 * Onglets YOOTOO. NAVIGATION OFFICIELLE UNIQUE : la bottom nav GLASSMORPHISM (`GlassTabBar`) est
 * partagée par TOUS les écrans (Accueil, Carte, Commerçants, De saison, Profil) — même barre, mêmes
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
      <Tabs.Screen name="de-saison" options={{ title: 'De saison' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
