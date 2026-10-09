import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en.json';
import hi from '@/locales/hi.json';
import { readStoredLanguage, writeStoredLanguage } from './languageStorage';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', nativeName: 'English' },
  { code: 'hi', nativeName: 'हिन्दी' },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const DEFAULT_LANGUAGE: AppLanguage = 'en';

export function isSupportedLanguage(value: string | null | undefined): value is AppLanguage {
  return SUPPORTED_LANGUAGES.some((lang) => lang.code === value);
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    hi: { translation: hi },
  },
  lng: DEFAULT_LANGUAGE,
  fallbackLng: DEFAULT_LANGUAGE,
  interpolation: { escapeValue: false },
  react: { useSuspense: false },
});

/** Applies the saved language before the first screen renders. */
export async function loadStoredLanguage(): Promise<void> {
  const stored = await readStoredLanguage();
  if (isSupportedLanguage(stored) && stored !== i18n.language) {
    await i18n.changeLanguage(stored);
  }
}

export async function changeAppLanguage(language: AppLanguage): Promise<void> {
  await i18n.changeLanguage(language);
  await writeStoredLanguage(language);
}

export function currentLanguage(): AppLanguage {
  return isSupportedLanguage(i18n.language) ? i18n.language : DEFAULT_LANGUAGE;
}

export default i18n;
