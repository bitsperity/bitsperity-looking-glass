import { z } from 'zod';

// ==================== User Endpoints ====================

// Search
export const searchInputSchema = z.object({
  query: z.string().describe('Natural language search query'),
  tickers: z.array(z.string()).optional().describe('Filter by ticker symbols'),
  from_date: z.string().optional().describe('Date range start (YYYY-MM-DD)'),
  to_date: z.string().optional().describe('Date range end (YYYY-MM-DD)'),
  limit: z.number().default(20).describe('Max results (default: 20)'),
});

export const searchResultSchema = z.object({
  id: z.string(),
  score: z.number(),
  title: z.string(),
  text: z.string(),
  source: z.string(),
  url: z.string(),
  published_at: z.string(),
  tickers: z.array(z.string()),
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

export const articleSchema = z.object({
  id: z.string(),
  title: z.string(),
  text: z.string(),
  source: z.string(),
  url: z.string(),
  published_at: z.string(),
  tickers: z.array(z.string()),
});

export const similarArticleSchema = articleSchema.extend({
  score: z.number(),
});

export const similarOutputSchema = z.object({
  source_article: articleSchema,
  similar_articles: z.array(similarArticleSchema),
});

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
});

export const embedBatchOutputSchema = z.object({
  status: z.string(),
  message: z.string(),
  check_progress: z.string(),
});

// Embed Status
export const embedStatusOutputSchema = z.object({
  collection_exists: z.boolean(),
  vector_count: z.number().optional(),
  vector_size: z.number().optional(),
  status: z.string(),
  processed: z.number(),
  total: z.number(),
  percent: z.number(),
  device: z.string().nullable(),
  started_at: z.number().nullable(),
  updated_at: z.number().nullable(),
  error: z.string().nullable(),
});

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

