import type { LayoutLoad } from './$types';

export const load: LayoutLoad = async ({ url }) => {
  const first = url.pathname.split('/')[1] || 'satbase';
  const section = ['satbase', 'tesseract', 'manifold', 'ariadne'].includes(first) ? first : 'satbase';
  return {
    section,
    apiBase: import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8080',
    apiBaseAriadne: import.meta.env.VITE_ARIADNE_API_BASE || 'http://127.0.0.1:8082'
  };
};


