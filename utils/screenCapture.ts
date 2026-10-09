import { Platform } from 'react-native';
import { requireOptionalNativeModule } from 'expo';

/**
 * Blocks screenshots and screen recording app-wide (Android FLAG_SECURE; iOS 13+ hides
 * screenshots/recordings) and blurs the app in the iOS app switcher.
 * No-op on web and on builds made before expo-screen-capture was added.
 */
export async function blockScreenCapture(): Promise<void> {
  if (Platform.OS === 'web') return;
  if (!requireOptionalNativeModule('ExpoScreenCapture')) return;

  const ScreenCapture = await import('expo-screen-capture');
  await ScreenCapture.preventScreenCaptureAsync('app').catch(() => undefined);
  if (Platform.OS === 'ios') {
    await ScreenCapture.enableAppSwitcherProtectionAsync(0.9).catch(() => undefined);
  }
}
