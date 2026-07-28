import { api } from './api';

export const applicationService = {
  async apply(jobPostId: string, message: string) {
    const response = await api.post('/application/apply', { jobPostId, message });
    return response.data;
  },

  async getApplications(jobId: string) {
    const response = await api.get(`/application/${jobId}`);
    return response.data;
  },
};
