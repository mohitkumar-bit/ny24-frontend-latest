import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { notificationService, type AppNotification } from './notification.service';
import { tokenStorage } from './tokenStorage';
import { shouldSuppressChatNotification } from '@/utils/activeChat';
import {
  getExpoNotifications,
  shouldSkipExpoNotificationsModule,
} from './expoNotifications';

const LAST_SYNC_AT_KEY = 'ny24_notification_sync_at';
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

const shownNotificationIds = new Set<string>();
let initialized = false;

function getNotificationData(notification: AppNotification) {
  return (notification.data || {}) as Record<string, unknown>;
}

export function markNotificationShown(notificationId?: string | null) {
  if (notificationId) {
    shownNotificationIds.add(notificationId);
  }
}

export function hasShownNotification(notificationId?: string | null) {
  return Boolean(notificationId && shownNotificationIds.has(notificationId));
}

async function getLastSyncAt() {
  const value = await SecureStore.getItemAsync(LAST_SYNC_AT_KEY);
  return value ? Number(value) : 0;
}

async function setLastSyncAt(timestamp: number) {
  await SecureStore.setItemAsync(LAST_SYNC_AT_KEY, String(timestamp));
}

export async function initializeNotificationSync() {
  if (initialized) return;
  initialized = true;

  const existing = await getLastSyncAt();
  if (existing > 0) return;

  await setLastSyncAt(Date.now());
}

export function resetNotificationSyncState() {
  initialized = false;
  shownNotificationIds.clear();
}

async function showLocalNotification(notification: AppNotification) {
  if (hasShownNotification(notification._id)) return false;
  if (shouldSkipExpoNotificationsModule()) return false;

  const Notifications = await getExpoNotifications();
  if (!Notifications) return false;

  const data = getNotificationData(notification);
  const conversationId = data.conversationId ? String(data.conversationId) : undefined;

  if (notification.type === 'chat' && shouldSuppressChatNotification(conversationId)) {
    markNotificationShown(notification._id);
    return false;
  }

  markNotificationShown(notification._id);

  await Notifications.scheduleNotificationAsync({
    identifier: `ny24-${notification._id}`,
    content: {
      title: notification.title,
      body: notification.body,
      data: {
        type: notification.type,
        notificationId: notification._id,
        conversationId,
        senderId: data.senderId ? String(data.senderId) : undefined,
        messageId: data.messageId ? String(data.messageId) : undefined,
      },
      sound: true,
      ...(Platform.OS === 'android'
        ? {
            priority: Notifications.AndroidNotificationPriority.MAX,
            channelId: notification.type === 'chat' ? 'chat' : 'default',
          }
        : {}),
    },
    trigger: null,
  });

  return true;
}

/** Fetch server notifications and mirror any new ones to the system tray. */
export async function syncPendingNotifications(): Promise<boolean> {
  if (!isNative) return false;
  if (shouldSkipExpoNotificationsModule()) return false;

  try {
    const accessToken = await tokenStorage.getAccessToken();
    if (!accessToken) return false;

    await initializeNotificationSync();

    const lastSyncAt = await getLastSyncAt();
    const data = await notificationService.getNotifications(1, 30, { includeChat: true });
    let newestTimestamp = lastSyncAt;
    let showedAny = false;

    const pending = [...data.notifications]
      .filter((notification) => {
        const createdAt = new Date(notification.createdAt).getTime();
        return createdAt > lastSyncAt;
      })
      .sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

    for (const notification of pending) {
      const createdAt = new Date(notification.createdAt).getTime();
      try {
        const shown = await showLocalNotification(notification);
        if (shown) showedAny = true;
      } catch {
        // Skip individual notification failures.
      }
      if (createdAt > newestTimestamp) {
        newestTimestamp = createdAt;
      }
    }

    if (newestTimestamp > lastSyncAt) {
      await setLastSyncAt(newestTimestamp);
    }

    return showedAny;
  } catch {
    return false;
  }
}
