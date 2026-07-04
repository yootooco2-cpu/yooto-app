import { Tabs } from 'expo-router';
import { type ColorValue, Image, type ImageSourcePropType, View } from 'react-native';

import { colors } from '@/design/tokens/colors';
import { useFocusStore } from '@/features/layout';

const homeIcon = require('@/assets/images/tabIcons/home.png') as ImageSourcePropType;
const exploreIcon = require('@/assets/images/tabIcons/explore.png') as ImageSourcePropType;

/** Icône « liste de commerces » composée de Views (aucun asset requis, web-safe). */
function MerchantsIcon({ color, size }: { color: ColorValue; size: number }) {
  const bar = (width: number) => ({
    width,
    height: size * 0.12,
    borderRadius: size * 0.06,
    marginVertical: size * 0.05,
    backgroundColor: color,
  });
  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'flex-start',
        paddingLeft: size * 0.14,
      }}>
      <View style={bar(size * 0.72)} />
      <View style={bar(size * 0.56)} />
      <View style={bar(size * 0.64)} />
    </View>
  );
}

/** Icône « personne » composée de Views (aucun asset/package requis, web-safe). */
function ProfileIcon({ color, size }: { color: ColorValue; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.4,
          height: size * 0.4,
          borderRadius: size * 0.2,
          backgroundColor: color,
        }}
      />
      <View
        style={{
          width: size * 0.72,
          height: size * 0.34,
          marginTop: size * 0.06,
          borderTopLeftRadius: size * 0.36,
          borderTopRightRadius: size * 0.36,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

/** Icône « feuille » composée de Views (aucun asset/package requis, web-safe). */
function DeSaisonIcon({ color, size }: { color: ColorValue; size: number }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View
        style={{
          width: size * 0.5,
          height: size * 0.5,
          borderTopLeftRadius: size * 0.5,
          borderBottomRightRadius: size * 0.5,
          backgroundColor: color,
        }}
      />
    </View>
  );
}

export default function TabsLayout() {
  // Source unique : en mode Focus Commerce (desktop), la tab bar est masquée — ICI et nulle part ailleurs.
  const isFocus = useFocusStore((s) => s.isFocus);
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: isFocus
          ? { display: 'none' }
          : {
              backgroundColor: colors.surface,
              borderTopColor: colors.border,
            },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Accueil',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={homeIcon}
              style={{ width: size, height: size, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Carte',
          tabBarIcon: ({ color, size }) => (
            <Image
              source={exploreIcon}
              style={{ width: size, height: size, tintColor: color }}
              resizeMode="contain"
            />
          ),
        }}
      />
      <Tabs.Screen
        name="merchants"
        options={{
          title: 'Commerçants',
          tabBarIcon: ({ color, size }) => <MerchantsIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="de-saison"
        options={{
          title: 'De saison',
          tabBarIcon: ({ color, size }) => <DeSaisonIcon color={color} size={size} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
