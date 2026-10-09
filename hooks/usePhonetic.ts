import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { hasLatinLetters, toPhoneticDevanagari } from '@/utils/phonetic/transliterate';

/**
 * Display helper for user-written text. In Hindi it returns the Hindi-script
 * pronunciation ("read" -> "रीड"); otherwise the text is returned unchanged.
 * Only for display — never send the result back to the server.
 */
export function usePhonetic() {
  const { i18n } = useTranslation();
  const isHindi = (i18n.resolvedLanguage ?? i18n.language) === 'hi';

  return useCallback(
    <T extends string | null | undefined>(text: T): T => {
      if (!isHindi || !text || !hasLatinLetters(text)) return text;
      return toPhoneticDevanagari(text) as T;
    },
    [isHindi]
  );
}
