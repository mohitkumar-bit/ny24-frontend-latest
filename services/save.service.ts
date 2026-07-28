import { api } from './api';

export const saveService = {
  getSavedJobs: async () => {
    const response = await api.get('/saved');
    return response.data;
  },

  toggleSave: async (jobId: string) => {
    const response = await api.post(`/saved/toggle/${jobId}`);
    return response.data;
  }
};
