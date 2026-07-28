import { api } from './api';
import { categoryService } from './category.service';

const mergeById = <T extends { _id: string }>(lists: T[][]): T[] => {
  const byId = new Map<string, T>();
  for (const list of lists) {
    for (const item of list) {
      if (item?._id) byId.set(item._id, item);
    }
  }
  return Array.from(byId.values());
};

const workerMatchesQuery = (
  worker: any,
  q: string,
  matchedCategoryIds: Set<string>
): boolean => {
  const skills = Array.isArray(worker?.skills) ? worker.skills : [];
  const skillIds = skills.map((s: any) => String(s?._id || s));
  if (matchedCategoryIds.size > 0 && skillIds.some((id: string) => matchedCategoryIds.has(id))) {
    return true;
  }

  const loc = worker?.location || {};
  const skillNames = skills.map((s: any) => s?.name || '').join(' ');
  const haystack = [
    worker?.title,
    worker?.description,
    worker?.user?.name,
    skillNames,
    loc.city,
    loc.state,
    loc.country,
    loc.district,
    loc.address,
    loc.pincode,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return haystack.includes(q);
};

export const workerService = {
  async createProfile(data: any) {
    const response = await api.post('/worker/create-profile', data);
    return response.data;
  },

  async searchWorkers(params?: any) {
    const { search, ...filters } = params || {};
    const query = typeof search === 'string' ? search.trim() : '';

    if (!query) {
      const response = await api.get('/worker/search', { params: filters });
      return response.data;
    }

    const q = query.toLowerCase();
    let matchedCategoryIds = new Set<string>();

    const requests: Promise<any[]>[] = [
      // Broad list for client-side text/location matching
      api
        .get('/worker/search', { params: { ...filters } })
        .then((r) => r.data)
        .catch(() => []),
    ];

    if (!filters.category) {
      try {
        const categories = await categoryService.getCategories();
        const matched = categories.filter((c) =>
          c.name.toLowerCase().includes(q)
        );
        matchedCategoryIds = new Set(matched.map((c) => String(c._id)));
        for (const cat of matched.slice(0, 5)) {
          requests.push(
            api
              .get('/worker/search', {
                params: { ...filters, category: cat._id },
              })
              .then((r) => r.data)
              .catch(() => [])
          );
        }
      } catch {
        /* ignore */
      }
    }

    // Treat query as a city name as well
    if (!filters.city) {
      requests.push(
        api
          .get('/worker/search', { params: { ...filters, city: query } })
          .then((r) => r.data)
          .catch(() => [])
      );
    }

    // Newer backends may support `search`
    requests.push(
      api
        .get('/worker/search', { params: { ...filters, search: query } })
        .then((r) => r.data)
        .catch(() => [])
    );

    const lists = await Promise.all(requests);
    const merged = mergeById(lists);

    // Always filter client-side — production may ignore `search` and return everyone
    return merged.filter((w) => workerMatchesQuery(w, q, matchedCategoryIds));
  },

  async getMyProfile() {
    const response = await api.get('/worker/my-profile');
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await api.put('/worker/update-profile', data);
    return response.data;
  },

  async getWorkerById(id: string) {
    const response = await api.get(`/worker/${id}`);
    return response.data;
  },
};
