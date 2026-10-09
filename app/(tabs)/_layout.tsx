import { View } from 'react-native';
import { Tabs, usePathname } from 'expo-router';
import React, { useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { CountBadge } from '@/components/CountBadge';
import { useSessionGuard } from '@/hooks/useSessionGuard';
import { useUnreadChatCount } from '@/hooks/useUnreadChatCount';
import { useAppLocation } from '@/contexts/AppLocationContext';

export default function TabLayout() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const pathname = usePathname();
  const { refreshLocation } = useAppLocation();

  useSessionGuard();
  const { unreadCount: unreadChatCount, refresh: refreshUnreadChat } = useUnreadChatCount();

  useEffect(() => {
    void refreshUnreadChat();
  }, [pathname, refreshUnreadChat]);

  useEffect(() => {
    void refreshLocation();
  }, [refreshLocation]);

  const tabBarHeight = 60 + insets.bottom;

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#00A300',
          headerShown: false,
          lazy: true,
          tabBarStyle: {
            height: tabBarHeight,
            paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
            paddingTop: 5,
            borderTopLeftRadius: 25,
            borderTopRightRadius: 25,
            backgroundColor: '#fff',
            borderTopWidth: 0,
            elevation: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -2 },
            shadowOpacity: 0.1,
            shadowRadius: 10,
          },
          sceneStyle: {
            backgroundColor: '#FFFFFF',
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: t('tabs.home'),
            tabBarIcon: ({ color }) => <Ionicons size={28} name="home" color={color} />,
          }}
        />
        <Tabs.Screen
          name="workers"
          options={{
            title: t('tabs.workers'),
            tabBarIcon: ({ color }) => <Ionicons size={28} name="people-outline" color={color} />,
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            title: t('tabs.chat'),
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
            title: t('tabs.profile'),
            tabBarIcon: ({ color }) => <Ionicons size={28} name="person-outline" color={color} />,
          }}
        />
      </Tabs>
    </>
  );
}
