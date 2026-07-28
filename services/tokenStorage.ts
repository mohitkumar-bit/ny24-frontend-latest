import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'user_accessToken';
const REFRESH_KEY = 'user_refreshToken';
const LOGOUT_REASON_KEY = 'logout_reason';

export type LogoutReason = 'session_replaced';

export const tokenStorage = {
  async setTokens(accessToken: string, refreshToken: string) {
    if (Platform.OS === 'web') {
      localStorage.setItem(ACCESS_KEY, accessToken);
      localStorage.setItem(REFRESH_KEY, refreshToken);
    } else {
      await SecureStore.setItemAsync(ACCESS_KEY, accessToken);
      await SecureStore.setItemAsync(REFRESH_KEY, refreshToken);
    }
  },

  async getAccessToken() {
    if (Platform.OS === 'web') {
      return localStorage.getItem(ACCESS_KEY);
    }
    return SecureStore.getItemAsync(ACCESS_KEY);
  },

  async getRefreshToken() {
    if (Platform.OS === 'web') {
      return localStorage.getItem(REFRESH_KEY);
    }
    return SecureStore.getItemAsync(REFRESH_KEY);
  },

  async clear() {
    if (Platform.OS === 'web') {
      localStorage.removeItem(ACCESS_KEY);
      localStorage.removeItem(REFRESH_KEY);
    } else {
      await SecureStore.deleteItemAsync(ACCESS_KEY);
      await SecureStore.deleteItemAsync(REFRESH_KEY);
    }
  },

  async setActiveSessionData(data: string) {
    const key = 'active_session_data';
    if (Platform.OS === 'web') {
      localStorage.setItem(key, data);
    } else {
      await SecureStore.setItemAsync(key, data);
    }
  },

  async getActiveSessionData() {
    const key = 'active_session_data';
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },

  async clearActiveSessionData() {
    const key = 'active_session_data';
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },

  async setLogoutReason(reason: LogoutReason) {
    if (Platform.OS === 'web') {
      localStorage.setItem(LOGOUT_REASON_KEY, reason);
    } else {
      await SecureStore.setItemAsync(LOGOUT_REASON_KEY, reason);
    }
  },

  async getLogoutReason(): Promise<LogoutReason | null> {
    const value =
      Platform.OS === 'web'
        ? localStorage.getItem(LOGOUT_REASON_KEY)
        : await SecureStore.getItemAsync(LOGOUT_REASON_KEY);

    return value === 'session_replaced' ? value : null;
  },

  async clearLogoutReason() {
    if (Platform.OS === 'web') {
      localStorage.removeItem(LOGOUT_REASON_KEY);
    } else {
      await SecureStore.deleteItemAsync(LOGOUT_REASON_KEY);
    }
  },
};
