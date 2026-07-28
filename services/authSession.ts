import axios from 'axios';
import { router } from 'expo-router';
import { tokenStorage, type LogoutReason } from './tokenStorage';

let isLoggingOut = false;

const AUTH_SKIP_REFRESH = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout'];

export function shouldSkipTokenRefresh(url?: string): boolean {
  if (!url) return false;
  return AUTH_SKIP_REFRESH.some((path) => url.includes(path));
}

export function isAuthFailure(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;
  return error.response?.status === 401;
}

/** Clear tokens and send user to login. Safe to call multiple times. */
export async function forceLogout(reason?: LogoutReason): Promise<void> {
  if (isLoggingOut) return;
  isLoggingOut = true;

  try {
    if (reason) {
      await tokenStorage.setLogoutReason(reason);
    }
    await tokenStorage.clear();
    // Defer navigation so it works from axios interceptors and outside React screens.
    setTimeout(() => {
      router.replace('/auth/login' as any);
    }, 0);
  } finally {
    isLoggingOut = false;
  }
}

/** Redirect to login when the session is invalid. Returns true if handled. */
export async function handleAuthFailure(error: unknown): Promise<boolean> {
  if (!isAuthFailure(error)) return false;
  await forceLogout();
  return true;
}
