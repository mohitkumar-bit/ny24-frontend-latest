/**
 * Background notification sync is disabled for now.
 * expo-task-manager / expo-background-fetch require a matching native rebuild
 * and were crashing Expo Go / older installs on startup.
 */
export const NOTIFICATION_SYNC_TASK = 'ny24-notification-sync';

export async function registerNotificationBackgroundSync() {
  // No-op: avoid loading native background-fetch modules at runtime.
}
