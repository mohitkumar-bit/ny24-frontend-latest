import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Device from 'expo-device';
import { notificationService } from './notification.service';
import { tokenStorage } from './tokenStorage';
import {
  getExpoNotifications,
  shouldSkipExpoNotificationsModule,
} from './expoNotifications';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

function isFirebaseSetupError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes('FirebaseApp') ||
    message.includes('FCM') ||
    message.includes('fcm-credentials') ||
    message.includes('Firebase')
  );
}

function logPushSkipped(reason: string) {
  if (__DEV__) {
    console.warn(`[Push] ${reason}`);
  }
}

export async function setupNotificationChannels() {
  if (Platform.OS !== 'android') return;

  const Notifications = await getExpoNotifications();
  if (!Notifications) return;

  await Notifications.setNotificationChannelAsync('default', {
    name: 'General',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF9500',
    sound: 'default',
  });

  await Notifications.setNotificationChannelAsync('chat', {
    name: 'Chat Messages',
    importance: Notifications.AndroidImportance.MAX,
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#FF9500',
    sound: 'default',
    enableVibrate: true,
    showBadge: true,
  });
}

export async function registerAndSyncPushToken(): Promise<string | null> {
  if (!isNative || !Device.isDevice) return null;

  // Avoid Expo Go's loud console.error for removed Android remote push.
  if (isRunningInExpoGo() || shouldSkipExpoNotificationsModule()) {
    logPushSkipped(
      'Remote push skipped in Expo Go — use a development build for push notifications.'
    );
    return null;
  }

  const accessToken = await tokenStorage.getAccessToken();
  if (!accessToken) return null;

  try {
    await setupNotificationChannels();
  } catch (error) {
    if (isFirebaseSetupError(error)) {
      logPushSkipped(
        'Android push skipped — add google-services.json and rebuild. See https://docs.expo.dev/push-notifications/fcm-credentials/'
      );
      return null;
    }
    throw error;
  }

  const Notifications = await getExpoNotifications();
  if (!Notifications) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  try {
    const tokenResponse = await Notifications.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    const pushToken = tokenResponse.data;
    await notificationService.registerPushToken(pushToken, Platform.OS);
    return pushToken;
  } catch (error) {
    if (isFirebaseSetupError(error)) {
      logPushSkipped(
        'Android push skipped — add google-services.json, upload FCM key to EAS, then rebuild.'
      );
      return null;
    }
    logPushSkipped(
      error instanceof Error ? error.message : 'Failed to register push token'
    );
    return null;
  }
}
