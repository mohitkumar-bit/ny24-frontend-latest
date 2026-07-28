import { Platform } from 'react-native';
import { api, postMultipart } from './api';
import { appendImageToFormData } from './formDataUpload';
import { categoryService } from './category.service';

export interface JobPost {
  _id: string;
  title: string;
  description: string;
  categories: any[];
  price: number;
  location: {
    address: string;
    city: string;
    state: string;
  };
  author: any;
  status: string;
  createdAt: string;
  isFeatured?: boolean;
  requirements?: {
    gender?: 'Any' | 'Male' | 'Female';
    minAge?: number | null;
    maxAge?: number | null;
  };
  images?: string[];
}

const mergeJobs = (lists: JobPost[][]): JobPost[] => {
  const byId = new Map<string, JobPost>();
  for (const list of lists) {
    for (const job of list) {
      if (job?._id) byId.set(job._id, job);
    }
  }
  return Array.from(byId.values());
};

const jobMatchesQuery = (
  job: JobPost,
  q: string,
  matchedCategoryIds: Set<string>
): boolean => {
  const cats = Array.isArray(job.categories) ? job.categories : [];
  const catIds = cats.map((c: any) => String(c?._id || c));
  if (matchedCategoryIds.size > 0 && catIds.some((id) => matchedCategoryIds.has(id))) {
    return true;
  }

  const catNames = cats.map((c: any) => c?.name || '').join(' ');
  const loc = job.location || ({} as JobPost['location']);
  const haystack = [
    job.title,
    job.description,
    catNames,
    loc.city,
    loc.state,
    loc.address,
    typeof job.author === 'object' ? job.author?.name : '',
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
};

export const jobService = {
  async uploadImage(uri: string) {
    const buildFormData = async () => {
      const formData = new FormData();
      await appendImageToFormData(formData, 'image', uri, 'job-photo.jpg');
      return formData;
    };

    // Native: use fetch multipart (same as chat/profile) — axios FormData often fails on Android.
    if (Platform.OS === 'web') {
      const formData = await buildFormData();
      const response = await api.post('/job/upload-image', formData, {
        timeout: 120000,
      });
      return response.data.imageUrl as string;
    }

    const data = await postMultipart<{ imageUrl: string }>('/job/upload-image', buildFormData);
    return data.imageUrl;
  },

  async createJob(data: any) {
    const response = await api.post('/job', data);
    return response.data;
  },

  async getJobs(params?: any): Promise<JobPost[]> {
    const response = await api.get('/job', { params });
    return response.data;
  },

  /**
   * Search jobs by text. Also matches category names and city client-side
   * so "ele" finds Electrician posts even if API only searches title/description.
   */
  async searchJobs(params: Record<string, any> = {}): Promise<JobPost[]> {
    const { search, ...filters } = params;
    const query = typeof search === 'string' ? search.trim() : '';

    if (!query) {
      return this.getJobs(filters);
    }

    const q = query.toLowerCase();
    let matchedCategoryIds = new Set<string>();

    const requests: Promise<JobPost[]>[] = [
      this.getJobs({ ...filters }).catch(() => []),
      this.getJobs({ ...filters, search: query }).catch(() => []),
    ];

    if (!filters.category) {
      try {
        const categories = await categoryService.getCategories();
        const matched = categories.filter((c) =>
          c.name.toLowerCase().includes(q)
        );
        matchedCategoryIds = new Set(matched.map((c) => String(c._id)));
        for (const cat of matched.slice(0, 5)) {
          requests.push(this.getJobs({ ...filters, category: cat._id }).catch(() => []));
        }
      } catch {
        /* ignore category lookup failures */
      }
    }

    if (!filters.city) {
      requests.push(this.getJobs({ ...filters, city: query }).catch(() => []));
    }

    const lists = await Promise.all(requests);
    return mergeJobs(lists).filter((job) =>
      jobMatchesQuery(job, q, matchedCategoryIds)
    );
  },

  async getJobById(id: string): Promise<JobPost> {
    const response = await api.get(`/job/${id}`);
    return response.data;
  },

  async getMyJobs(): Promise<JobPost[]> {
    const response = await api.get('/job/me');
    return response.data;
  },

  async updateJob(id: string, data: any) {
    const response = await api.put(`/job/${id}`, data);
    return response.data;
  },

  async deleteJob(id: string) {
    const response = await api.delete(`/job/${id}`);
    return response.data;
  },
};
