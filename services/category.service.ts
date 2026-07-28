import { api } from './api';

export type Category = {
  _id: string;
  name: string;
  icon: string;
  description?: string;
};

export const categoryService = {
  async getCategories(): Promise<Category[]> {
    const response = await api.get('/category');
    return response.data;
  },
};
