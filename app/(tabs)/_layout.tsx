import { View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CountBadge } from '@/components/CountBadge';
import { HapticTab } from '@/components/haptic-tab';
import { LocationPickerModal } from '@/components/home/LocationPickerModal';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { useUnreadChatCount } from '@/hooks/useUnreadChatCount';
import { useAppLocation } from '@/contexts/AppLocationContext';
import { needsLocationSetup } from '@/utils/locationNavigation';
import { tokenStorage } from '@/services/tokenStorage';

function isAuthPath(pathname: string) {
  return (
    pathname.startsWith('/auth') ||
    pathname.startsWith('/splash') ||
    pathname === '/location-setup'
  );
}

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { loading, location, refreshLocation } = useAppLocation();
  const [showRequiredLocation, setShowRequiredLocation] = useState(false);

  useSessionGuard();
  const { unreadCount: unreadChatCount, refresh: refreshUnreadChat } = useUnreadChatCount();

  useEffect(() => {
    // Refresh badge when switching tabs or returning from a chat screen.
    void refreshUnreadChat();
  }, [pathname, refreshUnreadChat]);

  useEffect(() => {
    if (loading || isAuthPath(pathname)) {
      setShowRequiredLocation(false);
      return;
    }

    let cancelled = false;
    (async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        if (!cancelled) setShowRequiredLocation(false);
        return;
      }

      // If city already loaded in context, no forced prompt.
      if (location?.city?.trim()) {
        if (!cancelled) setShowRequiredLocation(false);
        return;
      }

      // Try syncing from profile / storage first.
      const needs = await needsLocationSetup();
      if (cancelled) return;

      if (!needs) {
        await refreshLocation();
        if (!cancelled) setShowRequiredLocation(false);
        return;
      }

      // Location still missing — show required picker as first action.
      setShowRequiredLocation(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, location?.city, pathname, refreshLocation]);

  const tabBarHeight = 60 + insets.bottom;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#00A300',
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 5,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            position: 'absolute',
            backgroundColor: '#fff',
            borderTopWidth: 0,
            elevation: 10,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color }) => <Ionicons size={28} name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="workers"
          options={{
            title: 'Workers',
            tabBarIcon: ({ color }) => <Ionicons size={28} name="people-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Chat',
            tabBarIcon: ({ color }) => (
              <View style={{ width: 34, height: 30, alignItems: 'center', justifyContent: 'center' }}>
                <Ionicons size={28} name="chatbubbles-outline" color={color} />
                <CountBadge count={unreadChatCount} style={{ top: -1, right: -2 }} />
              </View>
            ),
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color }) => <Ionicons size={28} name="person-outline" color={color} />,
          }}
        />
      </Tabs>

      <LocationPickerModal
        visible={showRequiredLocation}
        required
        isFirstTime
        onClose={() => {
          // Required: only dismiss after a real location is set.
          if (location?.city?.trim()) {
            setShowRequiredLocation(false);
          }
        }}
        onLocationSet={() => setShowRequiredLocation(false)}
      />
    </>
  );
}
