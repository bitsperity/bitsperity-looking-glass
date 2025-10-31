import { z } from 'zod';
import { callAriadne } from '../api-client.js';
import { logger } from '../../logger.js';
import {
  ContextRequestSchema,
  ImpactRequestSchema,
  TimelineRequestSchema,
  SimilarEntitiesRequestSchema,
  PatternsSearchRequestSchema,
  PatternOccurrencesRequestSchema,
  RegimesSimilarRequestSchema,
  SearchRequestSchema,
  PathRequestSchema,
  TimeSliceRequestSchema
} from '../schemas.js';

export const contextTool = {
  name: 'ar-context',
  config: {
    title: 'Context subgraph',
    description: 'Get contextual subgraph by topic or tickers',
    inputSchema: ContextRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ContextRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.topic) params.set('topic', input.topic);
    if (input.tickers?.length) input.tickers.forEach(t => params.append('tickers', t));
    if (input.as_of) params.set('as_of', input.as_of);
    if (input.depth) params.set('depth', String(input.depth));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/context?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const impactTool = {
  name: 'ar-impact',
  config: {
    title: 'Impact ranking',
    description: 'Rank entities impacted by an event',
    inputSchema: ImpactRequestSchema.shape
  },
  handler: async (input: z.infer<typeof ImpactRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.event_id) params.set('event_id', input.event_id);
    if (input.event_query) params.set('event_query', input.event_query);
    if (input.k) params.set('k', String(input.k));
    if (input.as_of) params.set('as_of', input.as_of);
    const res = await callAriadne(`/v1/kg/impact?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const timelineTool = {
  name: 'ar-timeline',
  config: {
    title: 'Entity timeline',
    description: 'Get events/relations timeline for an entity or ticker',
    inputSchema: TimelineRequestSchema.shape
  },
  handler: async (input: z.infer<typeof TimelineRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.entity_id) params.set('entity_id', input.entity_id);
    if (input.ticker) params.set('ticker', input.ticker);
    if (input.from_date) params.set('from_date', input.from_date);
    if (input.to_date) params.set('to_date', input.to_date);
    const res = await callAriadne(`/v1/kg/timeline?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const similarEntitiesTool = {
  name: 'ar-similar-entities',
  config: {
    title: 'Similar entities',
    description: 'Find similar companies to a ticker',
    inputSchema: SimilarEntitiesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof SimilarEntitiesRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('ticker', input.ticker);
    if (input.method) params.set('method', input.method);
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/similar-entities?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const patternsSearchTool = {
  name: 'ar-patterns-search',
  config: {
    title: 'Search patterns',
    description: 'Query validated patterns',
    inputSchema: PatternsSearchRequestSchema.shape
  },
  handler: async (input: z.infer<typeof PatternsSearchRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.category) params.set('category', input.category);
    if (input.min_confidence !== undefined) params.set('min_confidence', String(input.min_confidence));
    if (input.min_occurrences !== undefined) params.set('min_occurrences', String(input.min_occurrences));
    const res = await callAriadne(`/v1/kg/patterns?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const patternOccurrencesTool = {
  name: 'ar-pattern-occurrences',
  config: {
    title: 'Pattern occurrences',
    description: 'Historical occurrences of a pattern',
    inputSchema: PatternOccurrencesRequestSchema.shape
  },
  handler: async (input: z.infer<typeof PatternOccurrencesRequestSchema>) => {
    const params = new URLSearchParams();
    if (input.from_date) params.set('from_date', input.from_date);
    if (input.to_date) params.set('to_date', input.to_date);
    const res = await callAriadne(`/v1/kg/patterns/${encodeURIComponent(input.pattern_id)}/occurrences?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const regimesCurrentTool = {
  name: 'ar-regimes-current',
  config: {
    title: 'Current regimes',
    description: 'Get current market regimes',
    inputSchema: z.object({}).shape
  },
  handler: async () => {
    const res = await callAriadne('/v1/kg/regimes/current');
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const regimesSimilarTool = {
  name: 'ar-regimes-similar',
  config: {
    title: 'Similar regimes',
    description: 'Find historical regimes with similar characteristics',
    inputSchema: RegimesSimilarRequestSchema.shape
  },
  handler: async (input: z.infer<typeof RegimesSimilarRequestSchema>) => {
    const params = new URLSearchParams();
    input.characteristics.forEach(c => params.append('characteristics', c));
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/regimes/similar?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const searchTool = {
  name: 'ar-search',
  config: {
    title: 'Fulltext search',
    description: 'Search nodes via fulltext index across all node properties',
    inputSchema: SearchRequestSchema.shape
  },
  handler: async (input: z.infer<typeof SearchRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('text', input.text);
    if (input.labels) params.set('labels', input.labels);
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/search?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const pathTool = {
  name: 'ar-path',
  config: {
    title: 'Find path between nodes',
    description: 'Find paths between two nodes using APOC path expansion',
    inputSchema: PathRequestSchema.shape
  },
  handler: async (input: z.infer<typeof PathRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('from_id', input.from_id);
    params.set('to_id', input.to_id);
    if (input.max_hops) params.set('max_hops', String(input.max_hops));
    if (input.algo) params.set('algo', input.algo);
    const res = await callAriadne(`/v1/kg/path?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};

export const timeSliceTool = {
  name: 'ar-time-slice',
  config: {
    title: 'Graph time slice',
    description: 'Get graph snapshot at a specific point in time via valid_from/valid_to',
    inputSchema: TimeSliceRequestSchema.shape
  },
  handler: async (input: z.infer<typeof TimeSliceRequestSchema>) => {
    const params = new URLSearchParams();
    params.set('as_of', input.as_of);
    if (input.topic) params.set('topic', input.topic);
    if (input.tickers) params.set('tickers', input.tickers);
    if (input.limit) params.set('limit', String(input.limit));
    const res = await callAriadne(`/v1/kg/time-slice?${params.toString()}`);
    return { content: [{ type: 'text', text: JSON.stringify(res) }] };
  }
};


