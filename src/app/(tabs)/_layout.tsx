import { Tabs } from 'expo-router';

import { GlassTabBar } from '@/components/navigation/GlassTabBar';
import { useFocusStore } from '@/features/layout';

/**
 * Onglets YOOTOO. La barre native est remplacée par une bottom nav GLASSMORPHISM (`GlassTabBar`)
 * qui prend l'IDENTITÉ de l'univers actif (couleur, halo, verre teinté). En mode Focus Commerce
 * (desktop), la barre est masquée — ICI et nulle part ailleurs.
 */
export default function TabsLayout() {
  const isFocus = useFocusStore((s) => s.isFocus);
  return (
    <Tabs
      screenOptions={{ headerShown: false }}
      tabBar={(props) => {
        // Sur l'écran Carte, la Bottom Tab Bar disparaît : la carte devient l'élément principal
        // et la navigation passe par la barre verticale flottante (FloatingMapNavigation).
        const active = props.state.routes[props.state.index]?.name;
        if (isFocus || active === 'explore') return null;
        return <GlassTabBar {...props} />;
      }}>
      <Tabs.Screen name="index" options={{ title: 'Accueil' }} />
      <Tabs.Screen name="explore" options={{ title: 'Carte' }} />
      <Tabs.Screen name="merchants" options={{ title: 'Commerçants' }} />
      <Tabs.Screen name="de-saison" options={{ title: 'De saison' }} />
      <Tabs.Screen name="profile" options={{ title: 'Profil' }} />
    </Tabs>
  );
}
