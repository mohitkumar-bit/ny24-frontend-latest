import { AppState, AppStateStatus, Platform } from 'react-native';
import {
  resetNotificationSyncState,
  syncPendingNotifications,
} from './notificationSync';

const BACKGROUND_POLL_MS = 15_000;
const FOREGROUND_POLL_MS = 5_000;
const isNative = Platform.OS === 'ios' || Platform.OS === 'android';

let pollTimer: ReturnType<typeof setInterval> | null = null;
let started = false;

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

function startPolling(intervalMs: number) {
  stopPolling();
  void syncPendingNotifications();
  pollTimer = setInterval(() => {
    void syncPendingNotifications();
  }, intervalMs);
}

function handleAppStateChange(nextState: AppStateStatus) {
  if (nextState === 'active') {
    startPolling(FOREGROUND_POLL_MS);
    return;
  }

  if (nextState === 'background' || nextState === 'inactive') {
    startPolling(BACKGROUND_POLL_MS);
  }
}

/** Poll while the JS runtime is alive and mirror new notifications to the tray. */
export function startLocalNotificationFallback() {
  if (!isNative || started) return;
  started = true;

  startPolling(
    AppState.currentState === 'active' ? FOREGROUND_POLL_MS : BACKGROUND_POLL_MS
  );

  const subscription = AppState.addEventListener('change', handleAppStateChange);

  return () => {
    subscription.remove();
    stopPolling();
    started = false;
  };
}

export function resetLocalNotificationFallbackState() {
  resetNotificationSyncState();
}

export {
  markNotificationShown,
  hasShownNotification,
  syncPendingNotifications,
} from './notificationSync';

// Kept for compatibility with existing hook calls.
export function setLocalNotificationFallbackEnabled(_enabled: boolean) {}
