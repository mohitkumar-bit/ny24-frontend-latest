import { useEffect } from 'react';
import { authService } from '@/services/auth.service';
import { handleAuthFailure } from '@/services/authSession';
import { tokenStorage } from '@/services/tokenStorage';

/** Keep protected tab screens behind a valid session. */
export function useSessionGuard() {
  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        // Already logged out — don't bounce the login screen or set logout reasons
        return;
      }

      try {
        await authService.getProfile();
      } catch (error) {
        if (cancelled) return;
        await handleAuthFailure(error);
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, []);
}
