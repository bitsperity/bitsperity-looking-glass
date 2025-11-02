import { z } from 'zod';
import { logger } from '../../logger.js';

// yfinance will be installed as dependency
// For now, we'll use dynamic import to handle optional dependency
let yf: any = null;

async function getYFinance() {
  if (!yf) {
    try {
      const yfModule = await import('yahoo-finance2');
      // yahoo-finance2 default export is a constructor class - need to instantiate
      const YahooFinance = yfModule.default;
      yf = new YahooFinance();
    } catch (e) {
      throw new Error('yahoo-finance2 package not installed. Run: npm install yahoo-finance2');
    }
  }
  return yf;
}

const SearchCompanyRequestSchema = z.object({
  query: z.string().describe('Company name or ticker symbol to search for'),
  region: z.enum(['US', 'DE', 'UK', 'FR', 'JP', 'CN']).optional().describe('Region filter (optional)'),
  exchange: z.string().optional().describe('Exchange filter (e.g., NASDAQ, NYSE, XETR)'),
  limit: z.number().int().min(1).max(20).default(10).describe('Maximum number of results (1-20, default 10)')
});

const GetCompanyProfileRequestSchema = z.object({
  ticker: z.string().describe('Ticker symbol (e.g., NVDA, AAPL, TSLA)')
});

const GetCompanyQuoteRequestSchema = z.object({
  ticker: z.string().describe('Ticker symbol (e.g., NVDA, AAPL, TSLA)')
});

const GetCompanyPricesRequestSchema = z.object({
  ticker: z.string().describe('Ticker symbol (e.g., NVDA, AAPL, TSLA)'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('Start date in YYYY-MM-DD format'),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).describe('End date in YYYY-MM-DD format'),
  interval: z.enum(['1d', '1wk', '1mo']).default('1d').describe('Interval: 1d (daily), 1wk (weekly), 1mo (monthly)')
});

export const searchCompanyTool = {
  name: 'explore-search-company',
  config: {
    title: 'Search Company/Ticker',
    description: 'Search for companies and tickers using Yahoo Finance. Returns name, ticker, exchange, country, currency. Use this for discovery before adding to watchlist. Token-efficient: returns only essential metadata (no full profiles).',
    inputSchema: SearchCompanyRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof SearchCompanyRequestSchema>) => {
    logger.info({ tool: 'explore-search-company', input }, 'Tool invoked');
    const start = performance.now();

    try {
      // Yahoo Finance Search API (public endpoint)
      const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(input.query)}&quotesCount=${input.limit}&newsCount=0`;
      const response = await fetch(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exploration-MCP/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();
      const results = data.quotes || [];

      const candidates = results.map((q: any) => ({
        ticker: q.symbol,
        name: q.longname || q.shortname,
        exchange: q.exchange,
        quoteType: q.quoteType,
        country: q.country,
        currency: q.currency,
        market: q.market,
      }));

      // Apply filters if provided
      let filtered = candidates;
      if (input.region) {
        filtered = filtered.filter((c: any) => c.country === input.region);
      }
      if (input.exchange) {
        filtered = filtered.filter((c: any) => 
          c.exchange?.toUpperCase().includes(input.exchange!.toUpperCase())
        );
      }

      const duration = performance.now() - start;
      logger.info({ tool: 'explore-search-company', duration, count: filtered.length }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify({ query: input.query, results: filtered.slice(0, input.limit) }, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-search-company', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getCompanyProfileTool = {
  name: 'explore-get-profile',
  config: {
    title: 'Get Company Profile',
    description: 'Get company profile: sector, industry, market cap, website, description. Lightweight snapshot for decision-making. No historical data. Token-efficient: returns only essential fields.',
    inputSchema: GetCompanyProfileRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof GetCompanyProfileRequestSchema>) => {
    logger.info({ tool: 'explore-get-profile', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const yf = await getYFinance();
      const quote = await yf.quote(input.ticker);

      const profile = {
        ticker: quote.symbol,
        name: quote.longName || quote.shortName,
        sector: quote.sector,
        industry: quote.industry,
        marketCap: quote.marketCap,
        website: quote.website,
        description: quote.longBusinessSummary?.substring(0, 500) || quote.description?.substring(0, 500), // Truncate for token efficiency
        currency: quote.currency,
        exchange: quote.fullExchangeName,
        country: quote.country,
      };

      const duration = performance.now() - start;
      logger.info({ tool: 'explore-get-profile', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-get-profile', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getCompanyQuoteTool = {
  name: 'explore-get-quote',
  config: {
    title: 'Get Current Quote',
    description: 'Get current price snapshot: price, change, volume, currency. Lightweight for quick checks. No historical data.',
    inputSchema: GetCompanyQuoteRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof GetCompanyQuoteRequestSchema>) => {
    logger.info({ tool: 'explore-get-quote', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const yf = await getYFinance();
      const quote = await yf.quote(input.ticker);

      const snapshot = {
        ticker: quote.symbol,
        price: quote.regularMarketPrice,
        change: quote.regularMarketChange,
        changePercent: quote.regularMarketChangePercent,
        volume: quote.regularMarketVolume,
        currency: quote.currency,
        marketState: quote.marketState,
        timestamp: quote.regularMarketTime,
      };

      const duration = performance.now() - start;
      logger.info({ tool: 'explore-get-quote', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(snapshot, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-get-quote', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const getCompanyPricesTool = {
  name: 'explore-get-prices',
  config: {
    title: 'Get Historical Prices (Short Range)',
    description: 'Get historical OHLCV data for short time ranges (max 90 days recommended). Token-efficient: returns only essential OHLCV fields. Use for quick trend checks before onboarding. For full historical data after onboarding, use satbase list-prices.',
    inputSchema: GetCompanyPricesRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof GetCompanyPricesRequestSchema>) => {
    logger.info({ tool: 'explore-get-prices', input }, 'Tool invoked');
    const start = performance.now();

    try {
      // Warn if range is too large (token cost)
      const fromDate = new Date(input.from);
      const toDate = new Date(input.to);
      const daysDiff = Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff > 90) {
        logger.warn({ daysDiff }, 'Large date range requested - consider using satbase list-prices after onboarding');
      }

      // Yahoo Finance Historical API (public endpoint)
      const fromTimestamp = Math.floor(new Date(input.from).getTime() / 1000);
      const toTimestamp = Math.floor(new Date(input.to).getTime() / 1000);
      const intervalMap: Record<string, string> = { '1d': '1d', '1wk': '1wk', '1mo': '1mo' };
      const interval = intervalMap[input.interval] || '1d';
      
      const historyUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${input.ticker}?period1=${fromTimestamp}&period2=${toTimestamp}&interval=${interval}`;
      const response = await fetch(historyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; Exploration-MCP/1.0)',
        },
      });

      if (!response.ok) {
        throw new Error(`Yahoo Finance API error: ${response.status}`);
      }

      const data = await response.json();
      const chartResult = data.chart?.result?.[0];
      if (!chartResult) {
        throw new Error('No chart data available');
      }

      const timestamps = chartResult.timestamp || [];
      const quotes = chartResult.indicators?.quote?.[0] || {};
      const opens = quotes.open || [];
      const highs = quotes.high || [];
      const lows = quotes.low || [];
      const closes = quotes.close || [];
      const volumes = quotes.volume || [];

      const history = timestamps.map((ts: number, i: number) => ({
        date: new Date(ts * 1000).toISOString().split('T')[0],
        open: opens[i] || null,
        high: highs[i] || null,
        low: lows[i] || null,
        close: closes[i] || null,
        volume: volumes[i] || null,
      })).filter((h: any) => h.close !== null); // Filter out incomplete bars

      const bars = history;

      const duration = performance.now() - start;
      logger.info({ tool: 'explore-get-prices', duration, count: bars.length }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify({ ticker: input.ticker, bars, count: bars.length }, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'explore-get-prices', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

