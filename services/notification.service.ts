import { api } from './api';

export interface AppNotification {
  _id: string;
  title: string;
  body: string;
  type: 'general' | 'promo' | 'alert' | 'update' | 'chat';
  isRead: boolean;
  createdAt: string;
  data?: {
    type?: string;
    conversationId?: string;
    senderId?: string;
    messageId?: string;
    notificationId?: string;
  };
}

export const notificationService = {
  async getNotifications(page = 1, limit = 30, options?: { includeChat?: boolean }) {
    const response = await api.get('/notifications', {
      params: {
        page,
        limit,
        ...(options?.includeChat ? { includeChat: '1' } : {}),
      },
    });
    return response.data as {
      notifications: AppNotification[];
      unreadCount: number;
      total: number;
    };
  },

  async getUnreadCount() {
    const response = await api.get('/notifications/unread-count');
    return response.data.unreadCount as number;
  },

  async markAsRead(id: string) {
    const response = await api.patch(`/notifications/${id}/read`);
    return response.data.notification as AppNotification;
  },

  async markAllAsRead() {
    await api.post('/notifications/read-all');
  },

  async registerPushToken(token: string, device = 'unknown') {
    await api.post('/notifications/register-token', { token, device });
  },
};
