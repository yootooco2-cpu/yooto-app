import { Tabs } from 'expo-router';
import { type ColorValue, Image, type ImageSourcePropType, View } from 'react-native';

import { colors } from '@/design/tokens/colors';

const homeIcon = require('@/assets/images/tabIcons/home.png') as ImageSourcePropType;
const exploreIcon = require('@/assets/images/tabIcons/explore.png') as ImageSourcePropType;

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

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.mutedText,
        tabBarStyle: {
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
          title: 'Explorer',
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
        name="profile"
        options={{
          title: 'Profil',
          tabBarIcon: ({ color, size }) => <ProfileIcon color={color} size={size} />,
        }}
      />
    </Tabs>
  );
}
