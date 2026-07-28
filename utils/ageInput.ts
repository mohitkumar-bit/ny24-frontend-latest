export const AGE_MIN = 18;
export const AGE_MAX_DIGITS = 2;

/** Digits only; once 2 digits are entered, clamp below 18 up to 18. */
export function sanitizeAgeInput(text: string): string {
  const digits = String(text ?? '')
    .replace(/[^0-9]/g, '')
    .slice(0, AGE_MAX_DIGITS);
  if (!digits) return '';
  if (digits.length < 2) return digits;
  const n = Number(digits);
  if (n < AGE_MIN) return String(AGE_MIN);
  return digits;
}

/**
 * When the field loses focus: if anything was typed and it's under 18,
 * snap to 18 (covers single-digit cases like "5" → "18").
 */
export function commitAgeInput(text: string): string {
  if (!String(text ?? '').trim()) return '';
  const digits = String(text).replace(/[^0-9]/g, '');
  if (!digits) return '';
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return '';
  return String(Math.max(AGE_MIN, n));
}

/** Final age value for save/filter — null if empty, otherwise at least 18. */
export function finalizeAge(text: string): number | null {
  const committed = commitAgeInput(text);
  if (!committed) return null;
  return Number(committed);
}
