import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Keep in sync with the NotoSansDevanagari weights loaded in app/_layout.tsx
const DEVANAGARI_FONTS: Record<string, string> = {
  Inter_400Regular: 'NotoSansDevanagari_400Regular',
  Inter_500Medium: 'NotoSansDevanagari_500Medium',
  Inter_600SemiBold: 'NotoSansDevanagari_600SemiBold',
  Inter_700Bold: 'NotoSansDevanagari_700Bold',
  Inter_800ExtraBold: 'NotoSansDevanagari_800ExtraBold',
};

// Devanagari marks sit above and below the letter, so tight line heights clip them
const MIN_LINE_HEIGHT_RATIO = 1.45;

const cache = new WeakMap<object, object>();

function toDevanagari<T extends Record<string, any>>(styles: T): T {
  const cached = cache.get(styles);
  if (cached) return cached as T;

  const result: Record<string, any> = {};
  for (const [key, style] of Object.entries(styles)) {
    const family = style?.fontFamily;
    if (typeof family !== 'string' || !DEVANAGARI_FONTS[family]) {
      result[key] = style;
      continue;
    }
    const next = { ...style, fontFamily: DEVANAGARI_FONTS[family] };
    if (typeof style.fontSize === 'number' && typeof style.lineHeight === 'number') {
      next.lineHeight = Math.max(style.lineHeight, Math.round(style.fontSize * MIN_LINE_HEIGHT_RATIO));
    }
    result[key] = next;
  }
  cache.set(styles, result);
  return result as T;
}

/**
 * Inter has no Hindi glyphs, so Hindi text in Inter falls back to a smaller, regular-weight
 * system font. In Hindi this swaps Inter for the matching Noto Sans Devanagari weight.
 */
export function useScriptStyles<T extends Record<string, any>>(styles: T): T {
  const { i18n } = useTranslation();
  const isHindi = (i18n.resolvedLanguage ?? i18n.language) === 'hi';
  return useMemo(() => (isHindi ? toDevanagari(styles) : styles), [isHindi, styles]);
}
