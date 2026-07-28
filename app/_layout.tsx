import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useScreenshotProtection } from '@/hooks/useScreenshotProtection';
import { AppLocationProvider } from '@/contexts/AppLocationContext';
import { usePushNotifications } from '@/hooks/usePushNotifications';

export const unstable_settings = {
  anchor: '(tabs)',
};

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const colorScheme = useColorScheme();
  useScreenshotProtection();
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
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [loaded]);

  // Wait for Great Vibes (and Inter) so splash tagline is always cursive
  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <AppLocationProvider>
          <Stack initialRouteName="splash/index">
            <Stack.Screen name="splash/index" options={{ headerShown: false }} />
            <Stack.Screen name="auth/login" options={{ headerShown: false }} />
            <Stack.Screen name="auth/signup" options={{ headerShown: false }} />
            <Stack.Screen name="location-setup" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
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
          </Stack>
          <StatusBar style="auto" />
        </AppLocationProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
