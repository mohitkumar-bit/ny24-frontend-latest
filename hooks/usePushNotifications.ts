import { useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import { useRouter } from 'expo-router';
import { registerAndSyncPushToken } from '@/services/pushRegistration';
import {
  getExpoNotifications,
  shouldSkipExpoNotificationsModule,
} from '@/services/expoNotifications';
import {
  markNotificationShown,
  resetLocalNotificationFallbackState,
  startLocalNotificationFallback,
} from '@/services/localNotificationFallback';
import { shouldSuppressChatNotification } from '@/utils/activeChat';

const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

/** Only treat a notification tap as "open the app from this notification" if it was recent. */
const COLD_START_MAX_AGE_MS = 45_000;

function handleNotificationNavigation(
  router: ReturnType<typeof useRouter>,
  data: Record<string, unknown> | undefined
) {
  if (!data || Object.keys(data).length === 0) return;

  if (data.type === 'chat' && data.conversationId) {
    const conversationId = String(data.conversationId);
    const senderId = data.senderId ? String(data.senderId) : '';
    const query = senderId ? `?receiverId=${encodeURIComponent(senderId)}` : '';
    router.push(`/chat/${conversationId}${query}` as any);
    return;
  }

  if (data.notificationId) {
    router.push(`/notifications/${String(data.notificationId)}` as any);
    return;
  }

  if (data.type) {
    router.push('/notifications' as any);
  }
}

function isRecentTap(date: unknown) {
  if (typeof date !== 'number') return true;
  const ms = date < 1e12 ? date * 1000 : date;
  return Date.now() - ms < COLD_START_MAX_AGE_MS;
}

export function usePushNotifications() {
  const router = useRouter();
  const handledIds = useRef(new Set<string>());

  const syncToken = useCallback(async () => {
    if (!isNative) return;
    try {
      await registerAndSyncPushToken();
    } catch {
      // Push may be unavailable without FCM / google-services.json.
    }
  }, []);

  useEffect(() => {
    if (!isNative) return;
    if (shouldSkipExpoNotificationsModule()) {
      // Expo Go Android: remote push unsupported — keep app usable.
      void syncToken();
      return;
    }

    let stopFallback: (() => void) | undefined;
    let receivedSubscription: { remove: () => void } | undefined;
    let responseSubscription: { remove: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const Notifications = await getExpoNotifications();
      if (!Notifications || cancelled) return;

      try {
        Notifications.setNotificationHandler({
          handleNotification: async (notification) => {
            const data = notification.request.content.data as
              | Record<string, unknown>
              | undefined;
            const conversationId = data?.conversationId
              ? String(data.conversationId)
              : undefined;
            const notificationId = data?.notificationId
              ? String(data.notificationId)
              : undefined;
            const suppress =
              data?.type === 'chat' &&
              shouldSuppressChatNotification(conversationId);

            if (!suppress && notificationId) {
              markNotificationShown(notificationId);
            }

            return {
              shouldShowAlert: !suppress,
              shouldPlaySound: !suppress,
              shouldSetBadge: !suppress,
              shouldShowBanner: !suppress,
              shouldShowList: !suppress,
            };
          },
        });
      } catch {
        /* ignore */
      }

      try {
        stopFallback = startLocalNotificationFallback();
        void syncToken();

        receivedSubscription = Notifications.addNotificationReceivedListener(
          (notification) => {
            const data = notification.request.content.data as
              | Record<string, unknown>
              | undefined;
            const notificationId = data?.notificationId
              ? String(data.notificationId)
              : undefined;
            if (notificationId) {
              markNotificationShown(notificationId);
            }
          }
        );

        const openFromResponse = async (
          response: {
            notification: {
              date?: unknown;
              request: {
                identifier: string;
                content: { data?: Record<string, unknown> };
              };
            };
          } | null,
          options?: { requireRecent?: boolean }
        ) => {
          if (!response) return;

          const id = response.notification.request.identifier;
          if (handledIds.current.has(id)) return;

          if (options?.requireRecent && !isRecentTap(response.notification.date)) {
            try {
              await Notifications.clearLastNotificationResponseAsync();
            } catch {
              /* ignore */
            }
            return;
          }

          handledIds.current.add(id);
          handleNotificationNavigation(
            router,
            response.notification.request.content.data
          );

          try {
            await Notifications.clearLastNotificationResponseAsync();
          } catch {
            /* ignore */
          }
        };

        void Notifications.getLastNotificationResponseAsync().then((response) =>
          openFromResponse(response as any, { requireRecent: true })
        );

        responseSubscription =
          Notifications.addNotificationResponseReceivedListener((response) => {
            void openFromResponse(response as any);
          });
      } catch {
        // Keep app running even if notification listeners fail.
      }
    })();

    return () => {
      cancelled = true;
      receivedSubscription?.remove();
      responseSubscription?.remove();
      stopFallback?.();
      resetLocalNotificationFallbackState();
    };
  }, [router, syncToken]);
}
