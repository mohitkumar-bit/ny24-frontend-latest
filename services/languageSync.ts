import { api } from './api';
import { tokenStorage } from './tokenStorage';
import { changeAppLanguage, currentLanguage, isSupportedLanguage, type AppLanguage } from '@/i18n';

let pendingUpdate: Promise<void> | null = null;

function saveLanguageToAccount(language: AppLanguage): Promise<void> {
  const request = api
    .patch('/auth/me/language', { language })
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      if (pendingUpdate === request) pendingUpdate = null;
    });
  pendingUpdate = request;
  return request;
}

/** User picked a language: apply it now and store it on their account. */
export async function setAppLanguage(language: AppLanguage): Promise<void> {
  await changeAppLanguage(language);
  if (await tokenStorage.getAccessToken()) {
    await saveLanguageToAccount(language);
  }
}

/**
 * The account's saved language wins over the phone's. Accounts created before languages
 * were stored have none yet, so they adopt the language currently used on this phone.
 */
export async function applyAccountLanguage(user: { language?: string | null } | null | undefined) {
  if (!user || pendingUpdate) return;
  if (isSupportedLanguage(user.language)) {
    if (user.language !== currentLanguage()) await changeAppLanguage(user.language);
    return;
  }
  void saveLanguageToAccount(currentLanguage());
}
