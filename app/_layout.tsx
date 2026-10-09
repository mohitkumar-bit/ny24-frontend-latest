import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { KeyboardProvider } from '@/utils/keyboardController';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Inter_100Thin,
  Inter_200ExtraLight,
  Inter_300Light,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_800ExtraBold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { GreatVibes_400Regular } from '@expo-google-fonts/great-vibes';
import {
  NotoSansDevanagari_400Regular,
  NotoSansDevanagari_500Medium,
  NotoSansDevanagari_600SemiBold,
  NotoSansDevanagari_700Bold,
  NotoSansDevanagari_800ExtraBold,
} from '@expo-google-fonts/noto-sans-devanagari';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AppLocationProvider } from '@/contexts/AppLocationContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';
import { loadStoredLanguage } from '@/i18n';
import { blockScreenCapture } from '@/utils/screenCapture';

SplashScreen.preventAutoHideAsync().catch(() => {});
blockScreenCapture().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  usePushNotifications();

  const [loaded] = useFonts({
    Inter_100Thin,
    Inter_200ExtraLight,
    Inter_300Light,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Inter_800ExtraBold,
    Inter_900Black,
    GreatVibes_400Regular,
    NotoSansDevanagari_400Regular,
    NotoSansDevanagari_500Medium,
    NotoSansDevanagari_600SemiBold,
    NotoSansDevanagari_700Bold,
    NotoSansDevanagari_800ExtraBold,
  });
  const [languageReady, setLanguageReady] = useState(false);

  useEffect(() => {
    loadStoredLanguage().finally(() => setLanguageReady(true));
  }, []);

  useEffect(() => {
    if (loaded && languageReady) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded, languageReady]);

  // Wait for Great Vibes (and Inter) so splash tagline is always cursive
  if (!loaded || !languageReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <SafeAreaProvider>
      <KeyboardProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AppLocationProvider>
            <Stack
              initialRouteName="splash/index"
              screenOptions={{
                headerShown: false,
                gestureEnabled: false,
                animation: 'fade',
              }}
            >
              <Stack.Screen name="splash/index" />
              <Stack.Screen name="auth/login" />
              <Stack.Screen name="auth/signup" />
              <Stack.Screen name="location-setup" />
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="details/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="worker-details/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="worker-register" options={{ headerShown: false }} />
              <Stack.Screen name="worker-profile" options={{ headerShown: false }} />
              <Stack.Screen name="create-post" options={{ headerShown: false }} />
              <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
              <Stack.Screen name="change-password" options={{ headerShown: false }} />
              <Stack.Screen name="subscription" options={{ headerShown: false }} />
              <Stack.Screen name="my-ads" options={{ headerShown: false }} />
              <Stack.Screen name="edit-job/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
              <Stack.Screen name="about" options={{ headerShown: false }} />
              <Stack.Screen name="terms" options={{ headerShown: false }} />
              <Stack.Screen name="privacy" options={{ headerShown: false }} />
              <Stack.Screen name="support" options={{ headerShown: false }} />
              <Stack.Screen name="payment" options={{ headerShown: false }} />
              <Stack.Screen name="saved" options={{ headerShown: false }} />
              <Stack.Screen name="notifications/index" options={{ headerShown: false }} />
              <Stack.Screen name="notifications/[id]" options={{ headerShown: false }} />
              <Stack.Screen name="verify" options={{ headerShown: false }} />
              <Stack.Screen name="admin-verification" options={{ headerShown: false }} />
              <Stack.Screen name="language" options={{ headerShown: false }} />
            </Stack>
            <StatusBar style="auto" />
          </AppLocationProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
