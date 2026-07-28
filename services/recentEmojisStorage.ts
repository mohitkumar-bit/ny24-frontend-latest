import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const RECENT_EMOJIS_KEY = 'chat_recent_emojis';
const MAX_RECENT = 21;

const readRaw = async (): Promise<string | null> => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(RECENT_EMOJIS_KEY);
  }
  return SecureStore.getItemAsync(RECENT_EMOJIS_KEY);
};

const writeRaw = async (value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(RECENT_EMOJIS_KEY, value);
    return;
  }
  await SecureStore.setItemAsync(RECENT_EMOJIS_KEY, value);
};

export const recentEmojisStorage = {
  async get(): Promise<string[]> {
    try {
      const raw = await readRaw();
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [];
    } catch {
      return [];
    }
  },

  async add(emoji: string): Promise<string[]> {
    const current = await this.get();
    const next = [emoji, ...current.filter((item) => item !== emoji)].slice(0, MAX_RECENT);
    await writeRaw(JSON.stringify(next));
    return next;
  },
};
