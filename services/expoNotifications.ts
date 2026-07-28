import { Platform } from 'react-native';
import { isRunningInExpoGo } from 'expo';

/**
 * Expo Go on Android no longer supports remote push (SDK 53+).
 * Importing `expo-notifications` there logs a loud console.error via TokenEmitter.
 * Skip loading the module entirely in that environment.
 */
export function shouldSkipExpoNotificationsModule() {
  return isRunningInExpoGo() && Platform.OS === 'android';
}

export type ExpoNotifications = typeof import('expo-notifications');

let notificationsModule: ExpoNotifications | null | undefined;

export async function getExpoNotifications(): Promise<ExpoNotifications | null> {
  if (shouldSkipExpoNotificationsModule()) {
    return null;
  }

  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    notificationsModule = await import('expo-notifications');
    return notificationsModule;
  } catch {
    notificationsModule = null;
    return null;
  }
}
