import { writable } from 'svelte/store';
import type { SearchResult } from '$lib/api/tesseract';

export interface GraphNode {
  id: string;
  article: SearchResult;
  x: number;
  y: number;
  level: number;
  similarity?: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  similarity: number;
}

interface KnowledgeGraphState {
  nodes: GraphNode[];
  edges: GraphEdge[];
  centerNode: GraphNode | null;
  trail: SearchResult[];
  initialArticle: SearchResult | null;
  panX: number;
  panY: number;
  zoom: number;
  similarityThreshold: number;
}

const defaultState: KnowledgeGraphState = {
  nodes: [],
  edges: [],
  centerNode: null,
  trail: [],
  initialArticle: null,
  panX: 0,
  panY: 0,
  zoom: 1,
  similarityThreshold: 0.7
};

function createKnowledgeGraphStore() {
  const { subscribe, set, update } = writable<KnowledgeGraphState>(defaultState);

  return {
    subscribe,
    set,
    update,
    reset: () => set(defaultState),
    
    // Save graph state
    saveState: (state: Partial<KnowledgeGraphState>) => {
      update(current => ({ ...current, ...state }));
    },
    
    // Initialize with an article
    initializeWithArticle: (article: SearchResult) => {
      update(current => ({
        ...current,
        initialArticle: article,
        trail: []
      }));
    }
  };
}

export const knowledgeGraphStore = createKnowledgeGraphStore();

