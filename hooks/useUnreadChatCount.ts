import { useCallback, useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getConversations } from '@/services/chat.service';
import { tokenStorage } from '@/services/tokenStorage';

const POLL_MS = 8_000;

export function useUnreadChatCount() {
  const [unreadCount, setUnreadCount] = useState(0);

  const refresh = useCallback(async () => {
    try {
      const token = await tokenStorage.getAccessToken();
      if (!token) {
        setUnreadCount(0);
        return;
      }

      const data = await getConversations();
      const conversations = data?.conversations || [];
      const total = conversations.reduce(
        (sum: number, chat: { unreadCount?: number }) => sum + (chat.unreadCount || 0),
        0
      );
      setUnreadCount(total);
    } catch {
      // Keep last known count if the request fails.
    }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, POLL_MS);

    const onAppState = (state: AppStateStatus) => {
      if (state === 'active') {
        void refresh();
      }
    };
    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [refresh]);

  return { unreadCount, refresh };
}
