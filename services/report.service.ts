import { api } from './api';

export const reportPost = async (postId: string, data: { reason: string; details?: string }) => {
  const response = await api.post(`/job/${postId}/report`, data);
  return response.data;
};

export const reportWorkerProfile = async (
  workerId: string,
  data: { reason: string; details?: string }
) => {
  const response = await api.post(`/worker/${workerId}/report`, data);
  return response.data;
};
