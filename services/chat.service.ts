import { Platform } from 'react-native';
import { api, postMultipart } from './api';
import { buildChatMediaFormData } from './formDataUpload';

export type SendMessageParams = {
  receiverId?: string;
  conversationId?: string;
  text?: string;
  mediaUrl?: string;
  messageType?: 'text' | 'image' | 'audio';
  mediaDuration?: number;
};

export const sendMessage = async (params: SendMessageParams) => {
  const response = await api.post('/chat/send', params);
  return response.data;
};

export const uploadChatMedia = async (
  uri: string,
  mimeType: string,
  filename: string
) => {
  if (Platform.OS === 'web') {
    const formData = await buildChatMediaFormData(uri, mimeType, filename);
    const response = await api.post('/chat/upload-media', formData, { timeout: 120000 });
    return response.data as { mediaUrl: string; messageType: 'image' | 'audio' };
  }

  return postMultipart<{ mediaUrl: string; messageType: 'image' | 'audio' }>(
    '/chat/upload-media',
    () => buildChatMediaFormData(uri, mimeType, filename)
  );
};

export const claimChatSlot = async (params: { conversationId?: string; receiverId?: string }) => {
  const response = await api.post('/chat/claim-slot', params);
  return response.data;
};

export const checkChatLimit = async (receiverId: string) => {
  try {
    const response = await api.get(`/chat/check-limit/${receiverId}`);
    return response.data;
  } catch (error: any) {
    throw error.response?.data || error.message || 'Failed to check chat limit';
  }
};

export const getConversations = async () => {
  const response = await api.get('/chat/conversations');
  return response.data;
};

export const getMessages = async (conversationId: string) => {
  const response = await api.get(`/chat/messages/${conversationId}`);
  return response.data;
};

export const togglePinConversation = async (conversationId: string) => {
  const response = await api.patch(`/chat/pin/${conversationId}`);
  return response.data;
};

export const getBlockStatus = async (userId: string) => {
  const response = await api.get(`/chat/block-status/${userId}`);
  return response.data as {
    isBlocked: boolean;
    blockedByMe: boolean;
    message?: string;
  };
};

export const blockUser = async (userId: string) => {
  const response = await api.post(`/chat/block/${userId}`);
  return response.data;
};

export const unblockUser = async (userId: string) => {
  const response = await api.delete(`/chat/block/${userId}`);
  return response.data;
};

export const reportUser = async (data: {
  reportedUserId: string;
  conversationId?: string;
  reason: string;
  details?: string;
}) => {
  const response = await api.post('/chat/report', data);
  return response.data;
};
