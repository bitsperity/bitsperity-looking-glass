import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async () => {
  return {
    section: 'satbase',
    apiBase: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080'
  };
};


