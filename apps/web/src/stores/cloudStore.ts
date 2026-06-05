import { create } from 'zustand';
import axios from 'axios';

interface Resource {
  id: string;
  name: string;
  type: string;
  provider: string;
  status: string;
}

interface CloudState {
  resources: Resource[];
  loading: boolean;
  error: string | null;
  fetchResources: () => Promise<void>;
}

export const useCloudStore = create<CloudState>((set) => ({
  resources: [],
  loading: false,
  error: null,

  fetchResources: async () => {
    set({ loading: true, error: null });
    try {
      const response = await axios.get('http://localhost:8080/api/resources');
      set({ resources: response.data, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch resources',
        loading: false,
      });
    }
  },
}));
