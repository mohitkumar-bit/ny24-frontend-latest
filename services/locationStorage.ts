import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const LOCATION_KEY = 'app_selected_location';
const SETUP_KEY = 'app_location_setup_complete';

export type StoredAppLocation = {
  display: string;
  city: string;
  state?: string;
  coordinates?: [number, number];
};

export const locationStorage = {
  async get(): Promise<StoredAppLocation | null> {
    try {
      const raw =
        Platform.OS === 'web'
          ? localStorage.getItem(LOCATION_KEY)
          : await SecureStore.getItemAsync(LOCATION_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as StoredAppLocation;
    } catch {
      return null;
    }
  },

  async set(location: StoredAppLocation) {
    const raw = JSON.stringify(location);
    if (Platform.OS === 'web') {
      localStorage.setItem(LOCATION_KEY, raw);
    } else {
      await SecureStore.setItemAsync(LOCATION_KEY, raw);
    }
  },

  async clear() {
    if (Platform.OS === 'web') {
      localStorage.removeItem(LOCATION_KEY);
      localStorage.removeItem(SETUP_KEY);
    } else {
      await SecureStore.deleteItemAsync(LOCATION_KEY);
      await SecureStore.deleteItemAsync(SETUP_KEY);
    }
  },

  async isSetupComplete(): Promise<boolean> {
    try {
      const value =
        Platform.OS === 'web'
          ? localStorage.getItem(SETUP_KEY)
          : await SecureStore.getItemAsync(SETUP_KEY);
      return value === 'true';
    } catch {
      return false;
    }
  },

  async markSetupComplete() {
    if (Platform.OS === 'web') {
      localStorage.setItem(SETUP_KEY, 'true');
    } else {
      await SecureStore.setItemAsync(SETUP_KEY, 'true');
    }
  },
};
