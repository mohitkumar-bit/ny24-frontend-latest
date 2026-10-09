const LANGUAGE_KEY = 'gigseva.appLanguage';

type AsyncStorageLike = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
};

let storage: AsyncStorageLike | null | undefined;

/** Loaded lazily: AsyncStorage throws at import time on builds without its native module. */
function getStorage(): AsyncStorageLike | null {
  if (storage !== undefined) return storage;
  try {
    storage = require('@react-native-async-storage/async-storage').default as AsyncStorageLike;
  } catch {
    storage = null;
  }
  return storage;
}

export async function readStoredLanguage(): Promise<string | null> {
  try {
    return (await getStorage()?.getItem(LANGUAGE_KEY)) ?? null;
  } catch {
    return null;
  }
}

export async function writeStoredLanguage(language: string): Promise<void> {
  try {
    await getStorage()?.setItem(LANGUAGE_KEY, language);
  } catch {
    /* language still applies for this session */
  }
}
