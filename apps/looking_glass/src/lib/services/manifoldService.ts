import * as api from '$lib/api/manifold';
import type { ThoughtEnvelope, SearchRequest } from '$lib/types/manifold';

export async function fetchDashboard() {
  const [health, config, device, statsAll] = await Promise.all([
    api.getHealth(),
    api.getConfig(),
    api.getDevice(),
    api.stats({})
  ]);
  return { health, config, device, statsAll };
}

export async function runSearch(req: SearchRequest) {
  return api.search(req);
}

export async function loadThought(id: string) {
  return api.getThought(id);
}

export async function saveThought(input: ThoughtEnvelope) {
  if (input.id) {
    const { id, ...payload } = input as any;
    await api.patchThought(id, payload);
    return { status: 'updated', thought_id: id };
  }
  return api.createThought(input);
}

export async function softDeleteThought(id: string) {
  return api.deleteThought(id, true);
}

export async function relateThoughts(sourceId: string, relatedId: string) {
  return api.linkRelated(sourceId, relatedId);
}

export async function reembed(id: string) {
  return api.reembedThought(id, ['text', 'title']);
}


