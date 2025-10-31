import { z } from 'zod';

// ==================== User Endpoints ====================

// Search
export const searchInputSchema = z.object({
  query: z.string().describe('Natural language search query'),
  tickers: z.array(z.string()).optional().describe('Filter by ticker symbols'),
  from_date: z.string().optional().describe('Date range start (YYYY-MM-DD)'),
  to_date: z.string().optional().describe('Date range end (YYYY-MM-DD)'),
  topics: z.array(z.string()).optional().describe('Filter by topics'),
  language: z.string().optional().describe('Filter by language (e.g., en, de)'),
  body_available: z.boolean().optional().describe('Only results with body available'),
  vector_type: z.string().optional().describe('Vector type to search (title|summary|body)'),
  limit: z.number().default(20).describe('Max results (default: 20)'),
});

export const searchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  title: z.string(),
  text: z.string(),
  source: z.string(),
  source_name: z.string().optional(),
  url: z.string(),
  published_at: z.string(),
  tickers: z.array(z.string()),
  topics: z.array(z.string()).optional(),
  language: z.string().optional(),
  body_available: z.boolean().optional(),
  news_id: z.string().optional(),
});

export const searchOutputSchema = z.object({
  query: z.string(),
  count: z.number(),
  results: z.array(searchResultSchema),
});

// Similar
export const similarInputSchema = z.object({
  news_id: z.string().describe('UUID of the source article'),
  limit: z.number().default(10).describe('Max similar articles'),
});

// Backend returns minimal objects for similarity endpoints
const minimalSourceArticleSchema = z.object({
  id: z.string(),
  news_id: z.string().optional(),
  vector_type: z.string().optional(),
});

const minimalSimilarArticleSchema = z.object({
  id: z.string(),
  news_id: z.string().optional(),
  score: z.number(),
  text: z.string().optional(),
});

export const similarOutputSchema = z.object({
  source_article: minimalSourceArticleSchema,
  similar_articles: z.array(minimalSimilarArticleSchema),
});

// Article Similarity (internal content consistency)
export const articleSimilarityInputSchema = z.object({
  news_id: z.string().describe('UUID of the article to analyze'),
});

export const articleSimilarityOutputSchema = z.object({
  news_id: z.string(),
  available: z.object({
    title: z.boolean(),
    summary: z.boolean(),
    body: z.boolean(),
  }),
  similarity: z.object({
    title_body: z.number().nullable().optional().describe('Cosine similarity between title and body vectors (0-1, higher = more consistent)'),
    summary_body: z.number().nullable().optional().describe('Cosine similarity between summary and body vectors (0-1, higher = more consistent)'),
  }),
});

export type ArticleSimilarityInput = z.infer<typeof articleSimilarityInputSchema>;
export type ArticleSimilarityOutput = z.infer<typeof articleSimilarityOutputSchema>;

// ==================== Admin Endpoints ====================

// Init Collection
export const initCollectionOutputSchema = z.object({
  status: z.string(),
  collection: z.string(),
  alias: z.string(),
});

// Embed Batch
export const embedBatchInputSchema = z.object({
  from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date (YYYY-MM-DD)'),
  to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date (YYYY-MM-DD)'),
  topics: z.string().optional().describe('Comma-separated list of topics'),
  tickers: z.string().optional().describe('Comma-separated list of tickers'),
  language: z.string().optional().describe('Language filter'),
  body_only: z.boolean().optional().describe('Only embed articles with body (default: true)'),
  incremental: z.boolean().optional().describe('Skip already embedded articles (default: true)'),
});

export const embedBatchOutputSchema = z.object({
  status: z.string(),
  message: z.string(),
  check_progress: z.string(),
});

// Embed Status (union: JobStatus | OverallStatus)
export const jobStatusSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  processed: z.number(),
  total: z.number(),
  percent: z.number(),
  started_at: z.number().nullable().optional(),
  completed_at: z.number().nullable().optional(),
  error: z.string().nullable().optional(),
  params: z.record(z.any()).optional(),
});

export const overallStatusSchema = z.object({
  collection_name: z.string(),
  total_vectors: z.number(),
  vector_size: z.number(),
  total_embedded_articles: z.number(),
  recent_jobs: z.array(jobStatusSchema).optional(),
});

export const embedStatusOutputSchema = z.union([jobStatusSchema, overallStatusSchema]);

// For MCP tool registration: generic passthrough schema
export const embedStatusFlexibleSchema = z.object({}).passthrough();

// Collections List
export const collectionInfoSchema = z.object({
  name: z.string(),
  points_count: z.number().optional(),
  vector_size: z.number().optional(),
  distance: z.string().optional(),
  error: z.string().optional(),
});

export const collectionsListOutputSchema = z.object({
  collections: z.array(collectionInfoSchema),
  active_alias: z.string(),
  active_target: z.string(),
});

// Collection Switch
export const collectionSwitchInputSchema = z.object({
  name: z.string().describe('Collection name to switch to'),
});

export const collectionSwitchOutputSchema = z.object({
  status: z.string(),
  alias: z.string(),
  target: z.string(),
});

// Collection Delete
export const collectionDeleteInputSchema = z.object({
  collection_name: z.string().describe('Collection name to delete'),
});

export const collectionDeleteOutputSchema = z.object({
  status: z.string(),
  collection: z.string(),
});

// Type exports
export type SearchInput = z.infer<typeof searchInputSchema>;
export type SearchOutput = z.infer<typeof searchOutputSchema>;
export type SimilarInput = z.infer<typeof similarInputSchema>;
export type SimilarOutput = z.infer<typeof similarOutputSchema>;
export type EmbedBatchInput = z.infer<typeof embedBatchInputSchema>;
export type EmbedBatchOutput = z.infer<typeof embedBatchOutputSchema>;
export type EmbedStatusOutput = z.infer<typeof embedStatusOutputSchema>;
export type InitCollectionOutput = z.infer<typeof initCollectionOutputSchema>;
export type CollectionsListOutput = z.infer<typeof collectionsListOutputSchema>;
export type CollectionSwitchInput = z.infer<typeof collectionSwitchInputSchema>;
export type CollectionSwitchOutput = z.infer<typeof collectionSwitchOutputSchema>;
export type CollectionDeleteInput = z.infer<typeof collectionDeleteInputSchema>;
export type CollectionDeleteOutput = z.infer<typeof collectionDeleteOutputSchema>;

// Search History
export const searchHistoryInputSchema = z.object({
  limit: z.number().optional().default(50).describe('Maximum number of entries to return'),
  query_filter: z.string().optional().describe('Filter by query text (LIKE search)'),
  days: z.number().optional().describe('Filter by days ago (e.g., 7 for last week)'),
});

export const searchHistoryEntrySchema = z.object({
  id: z.number(),
  query: z.string(),
  filters: z.record(z.any()).nullable().optional(),
  result_count: z.number(),
  created_at: z.number(),
});

export const searchHistoryOutputSchema = z.object({
  history: z.array(searchHistoryEntrySchema),
  count: z.number(),
  filters: z.object({
    limit: z.number().optional(),
    query_filter: z.string().optional().nullable(),
    days: z.number().optional().nullable(),
  }),
});

export const searchStatsInputSchema = z.object({
  days: z.number().optional().default(30).describe('Number of days to analyze'),
});

export const searchStatsOutputSchema = z.object({
  total_searches: z.number(),
  unique_queries: z.number(),
  avg_result_count: z.number(),
  top_queries: z.array(z.object({
    query: z.string(),
    count: z.number(),
  })),
  days: z.number(),
});

export type SearchHistoryInput = z.infer<typeof searchHistoryInputSchema>;
export type SearchHistoryOutput = z.infer<typeof searchHistoryOutputSchema>;
export type SearchStatsInput = z.infer<typeof searchStatsInputSchema>;
export type SearchStatsOutput = z.infer<typeof searchStatsOutputSchema>;

