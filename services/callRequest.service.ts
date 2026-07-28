import { api } from './api';

export interface CallRequestItem {
  _id: string;
  requester: { _id: string; name: string };
  sourceType: 'worker' | 'job';
  sourceTitle?: string;
  createdAt: string;
}

export const callRequestService = {
  async sendRequest(params: {
    receiverId: string;
    sourceType: 'worker' | 'job';
    sourceId: string;
    sourceTitle?: string;
    conversationId?: string;
  }) {
    const response = await api.post('/call-request', params);
    return response.data as {
      success: boolean;
      message: string;
      conversationId: string;
      chatMessage?: { _id: string; text: string };
    };
  },

  async getIncoming() {
    const response = await api.get('/call-request/incoming');
    return response.data.requests as CallRequestItem[];
  },

  async accept(requestId: string) {
    const response = await api.post(`/call-request/${requestId}/accept`);
    return response.data as { phone: string; requesterName: string };
  },

  async decline(requestId: string) {
    const response = await api.post(`/call-request/${requestId}/decline`);
    return response.data;
  },
};
