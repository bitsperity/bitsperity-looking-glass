import { z } from 'zod';

// --- Common Schemas ---

const DateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be in YYYY-MM-DD format');

// --- News Schemas ---

export const ListNewsRequestSchema = z.object({
  from: DateStringSchema.describe('Start date (YYYY-MM-DD)'),
  to: DateStringSchema.describe('End date (YYYY-MM-DD)'),
  q: z.string().optional().describe('Search query'),
  tickers: z.string().optional().describe('Comma-separated ticker symbols'),
  limit: z.number().int().min(1).max(10000).default(100).describe('Maximum number of results'),
  offset: z.number().int().min(0).default(0).describe('Pagination offset'),
  include_body: z.boolean().default(false).describe('Include full article content'),
  has_body: z.boolean().default(false).describe('Filter to only articles with bodies'),
  content_format: z.enum(['text', 'html', 'both']).optional().describe('Content format: text, html, or both')
});

export const NewsItemSchema = z.object({
  id: z.string(),
  source: z.string(),
  title: z.string(),
  text: z.string(),
  url: z.string().url(),
  published_at: z.string(),
  tickers: z.array(z.string()),
  regions: z.array(z.string()).optional(),
  themes: z.array(z.string()).optional(),
  content_text: z.string().optional(),
  content_html: z.string().optional(),
  fetched_at: z.string().optional(),
  url_right: z.string().optional(),
  published_at_right: z.string().optional()
}).passthrough(); // Allow additional properties from backend joins

export const ListNewsResponseSchema = z.object({
  items: z.array(NewsItemSchema),
  from: z.string(),
  to: z.string(),
  limit: z.number(),
  offset: z.number(),
  total: z.number(),
  has_more: z.boolean(),
  include_body: z.boolean(),
  has_body: z.boolean(),
  content_format: z.string().nullable()
});

export const NewsHeatmapRequestSchema = z.object({
  topics: z.string().describe('Comma-separated search terms (e.g., "AI,Fed,Earnings")'),
  from: DateStringSchema.optional().describe('Start date (YYYY-MM-DD), defaults to 365 days ago'),
  to: DateStringSchema.optional().describe('End date (YYYY-MM-DD), defaults to today'),
  granularity: z.enum(['year', 'month']).default('month').describe('Time period granularity'),
  format: z.enum(['flat', 'matrix']).default('flat').describe('Response format')
});

export const NewsHeatmapResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  granularity: z.string(),
  topics: z.array(z.string()),
  periods: z.array(z.string()),
  data: z.array(z.object({
    period: z.string(),
    topic: z.string(),
    count: z.number()
  })).optional(),
  matrix: z.array(z.array(z.number())).optional()
});

export const TrendingTickersRequestSchema = z.object({
  hours: z.number().int().min(1).max(720).default(24).describe('Lookback window in hours'),
  limit: z.number().int().min(1).max(100).default(50).describe('Maximum results to return'),
  min_mentions: z.number().int().min(1).default(1).describe('Minimum mentions to include')
});

export const TrendingTickersResponseSchema = z.object({
  period: z.object({
    from: z.string(),
    to: z.string()
  }),
  tickers: z.array(z.object({
    ticker: z.string(),
    mentions: z.number(),
    articles: z.number(),
    sample_headlines: z.array(z.string())
  })),
  total_tickers: z.number(),
  total_articles: z.number(),
  method: z.string().optional(),
  note: z.string().optional()
});

export const DeleteNewsResponseSchema = z.object({
  success: z.boolean(),
  id: z.string(),
  message: z.string()
});

// --- Macro (FRED) Schemas ---

export const FredSearchRequestSchema = z.object({
  q: z.string().describe('Search query for FRED series'),
  limit: z.number().int().min(1).max(100).default(20).describe('Maximum number of results')
});

export const FredSeriesSchema = z.object({
  id: z.string(),
  title: z.string(),
  observation_start: z.string(),
  observation_end: z.string(),
  frequency: z.string(),
  units: z.string(),
  seasonal_adjustment: z.string(),
  last_updated: z.string(),
  popularity: z.number(),
  notes: z.string().optional()
});

export const FredSearchResponseSchema = z.object({
  query: z.string(),
  results: z.array(FredSeriesSchema),
  count: z.number()
});

export const FredObservationsRequestSchema = z.object({
  series_id: z.string().describe('FRED series ID'),
  from: DateStringSchema.optional().describe('Start date (YYYY-MM-DD)'),
  to: DateStringSchema.optional().describe('End date (YYYY-MM-DD)')
});

export const FredObservationSchema = z.object({
  date: z.string(),
  value: z.string() // Can be "." for missing data
});

export const FredObservationsResponseSchema = z.object({
  series_id: z.string(),
  from: z.string().nullable(),
  to: z.string().nullable(),
  items: z.array(FredObservationSchema)
});

export const FredCategoriesRequestSchema = z.object({
  category: z.string().optional().describe('Optional: filter by category (e.g., "inflation")')
});

export const FredSeriesMetadataSchema = z.object({
  id: z.string(),
  title: z.string(),
  available: z.boolean(),
  observations: z.number(),
  latest_value: z.number().nullable(),
  latest_date: z.string().nullable()
});

export const FredCategorySchema = z.object({
  id: z.string(),
  name: z.string(),
  series: z.array(FredSeriesMetadataSchema),
  series_count: z.number()
});

export const FredCategoriesResponseSchema = z.object({
  categories: z.array(FredCategorySchema).optional(),
  total_categories: z.number().optional(),
  category: FredCategorySchema.optional()
});

// --- Prices Schemas ---

export const ListPricesRequestSchema = z.object({
  ticker: z.string().describe('Ticker symbol'),
  from: DateStringSchema.describe('Start date (YYYY-MM-DD)'),
  to: DateStringSchema.describe('End date (YYYY-MM-DD)')
});

export const PriceDataSchema = z.object({
  date: z.string(),
  open: z.number(),
  high: z.number(),
  low: z.number(),
  close: z.number(),
  volume: z.number(),
  vwap: z.number().optional(),
  transactions: z.number().optional()
});

export const ListPricesResponseSchema = z.object({
  ticker: z.string(),
  from: z.string(),
  to: z.string(),
  data: z.array(PriceDataSchema),
  count: z.number()
});

// --- BTC Schemas ---

export const BtcOracleRequestSchema = z.object({
  from: DateStringSchema.describe('Start date (YYYY-MM-DD)'),
  to: DateStringSchema.describe('End date (YYYY-MM-DD)')
});

export const BtcPriceSchema = z.object({
  date: z.string(),
  price_usd: z.number()
});

export const BtcOracleResponseSchema = z.object({
  from: z.string(),
  to: z.string(),
  data: z.array(BtcPriceSchema),
  count: z.number()
});

export const UsdToBtcRequestSchema = z.object({
  value: z.number().describe('USD value to convert'),
  on: DateStringSchema.describe('Date for conversion (YYYY-MM-DD)')
});

export const BtcToUsdRequestSchema = z.object({
  value: z.number().describe('BTC value to convert'),
  on: DateStringSchema.describe('Date for conversion (YYYY-MM-DD)')
});

export const ConversionResponseSchema = z.object({
  input_value: z.number(),
  output_value: z.number(),
  rate: z.number(),
  date: z.string()
});

// --- Ingest Schemas ---

export const EnqueueNewsRequestSchema = z.object({
  q: z.string().describe('Search query for news'),
  hours: z.number().int().min(1).max(720).default(24).describe('Hours to look back')
});

export const EnqueueNewsBodyRequestSchema = z.object({
  from: DateStringSchema.describe('Start date (YYYY-MM-DD)'),
  to: DateStringSchema.describe('End date (YYYY-MM-DD)')
});

export const EnqueuePricesRequestSchema = z.object({
  tickers: z.array(z.string()).describe('List of ticker symbols to ingest')
});

export const EnqueueMacroRequestSchema = z.object({
  series_id: z.string().describe('FRED series ID to ingest'),
  from: DateStringSchema.describe('Start date (YYYY-MM-DD)'),
  to: DateStringSchema.describe('End date (YYYY-MM-DD)')
});

export const JobResponseSchema = z.object({
  job_id: z.string(),
  status: z.string(),
  message: z.string()
});

// --- Jobs Schemas ---

export const ListJobsRequestSchema = z.object({
  limit: z.number().int().min(1).max(1000).default(100).describe('Maximum number of jobs to return'),
  status: z.enum(['idle', 'running', 'done', 'error']).optional().describe('Filter by status')
});

export const JobSchema = z.object({
  job_id: z.string(),
  type: z.string(),
  status: z.string(),
  created_at: z.string(),
  started_at: z.string().optional(),
  finished_at: z.string().optional(),
  progress: z.number().optional(),
  error: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

export const ListJobsResponseSchema = z.object({
  jobs: z.array(JobSchema),
  count: z.number()
});

export const GetJobResponseSchema = JobSchema;

// --- Watchlist Schemas ---

export const WatchlistItemSchema = z.object({
  symbol: z.string(),
  added_at: z.string(),
  expires_at: z.string().optional()
});

export const GetWatchlistResponseSchema = z.object({
  items: z.array(WatchlistItemSchema),
  count: z.number()
});

export const AddWatchlistRequestSchema = z.object({
  symbols: z.array(z.string()).describe('Ticker symbols to add'),
  ingest: z.boolean().default(false).describe('Trigger price ingestion immediately'),
  ttl_days: z.number().int().min(1).optional().describe('Days until expiration')
});

export const AddWatchlistResponseSchema = z.object({
  added: z.array(z.string()),
  count: z.number(),
  ingestion_triggered: z.boolean()
});

export const RemoveWatchlistRequestSchema = z.object({
  symbol: z.string().describe('Ticker symbol to remove')
});

export const RemoveWatchlistResponseSchema = z.object({
  removed: z.boolean(),
  symbol: z.string()
});

// --- Topics Schemas ---

export const TopicItemSchema = z.object({
  query: z.string(),
  added_at: z.string(),
  expires_at: z.string().optional()
});

export const GetTopicsResponseSchema = z.object({
  topics: z.array(TopicItemSchema),
  count: z.number()
});

export const AddTopicsRequestSchema = z.object({
  queries: z.array(z.string()).describe('Search queries to add'),
  ingest: z.boolean().default(false).describe('Trigger news ingestion immediately'),
  hours: z.number().int().min(1).max(720).optional().describe('Hours to look back for news'),
  ttl_days: z.number().int().min(1).optional().describe('Days until expiration')
});

export const AddTopicsResponseSchema = z.object({
  added: z.array(z.string()),
  count: z.number(),
  ingestion_triggered: z.boolean()
});

// --- Health Schemas ---

export const HealthResponseSchema = z.object({
  status: z.string(),
  timestamp: z.string().optional(),
  version: z.string().optional()
});

export const DataSourceSchema = z.object({
  name: z.string(),
  type: z.string(),
  status: z.string(),
  last_updated: z.string().optional()
});

export const ListSourcesResponseSchema = z.object({
  sources: z.array(DataSourceSchema),
  count: z.number()
});

// --- Status/Coverage Schemas ---

export const CoverageResponseSchema = z.object({
  news: z.object({
    total_articles: z.number(),
    date_range: z.object({
      from: z.string().nullable(),
      to: z.string().nullable()
    }),
    sources: z.record(z.object({
      count: z.number(),
      earliest: z.string().optional().nullable(),
      latest: z.string().optional().nullable()
    })),
    tickers_mentioned: z.number(),
    articles_with_bodies: z.number()
  }),
  prices: z.object({
    tickers_available: z.array(z.string()),
    ticker_count: z.number(),
    date_ranges: z.record(z.object({
      from: z.string(),
      to: z.string(),
      days: z.number()
    }))
  }),
  macro: z.object({
    fred_series_available: z.array(z.string()),
    series_count: z.number(),
    observations: z.record(z.object({
      count: z.number(),
      from: z.string(),
      to: z.string()
    }))
  })
});
