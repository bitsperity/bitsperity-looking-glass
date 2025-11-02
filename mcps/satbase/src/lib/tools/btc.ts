import { z } from 'zod';
import { callSatbase } from '../api-client.js';
import {
  BtcOracleRequestSchema,
  BtcOracleResponseSchema,
  UsdToBtcRequestSchema,
  BtcToUsdRequestSchema,
  ConversionResponseSchema
} from '../schemas.js';
import logger from '../../logger.js';

export const btcOracleTool = {
  name: 'btc-oracle',
  config: {
    title: 'Get Bitcoin Oracle Price Data',
    description: 'Fetch Bitcoin (BTC) historical price data from oracle sources for a specified date range. Returns price points with timestamps, open, high, low, close, and volume data. Useful for crypto analysis, BTC/USD conversions, or correlation studies with traditional markets. Dates in YYYY-MM-DD format. Oracle data provides authoritative BTC pricing data.',
    inputSchema: BtcOracleRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof BtcOracleRequestSchema>) => {
    logger.info({ tool: 'btc-oracle', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        from: input.from,
        to: input.to
      });

      const result = await callSatbase<z.infer<typeof BtcOracleResponseSchema>>(
        `/v1/btc/oracle?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'btc-oracle', duration, count: result.points?.length || 0 }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'btc-oracle', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const usdToBtcTool = {
  name: 'usd-to-btc',
  config: {
    title: 'Convert USD to BTC',
    description: 'Convert USD value to Bitcoin (BTC) using historical exchange rate for a specific date. Returns BTC amount equivalent to the USD value on that date. Essential for crypto valuations, portfolio conversions, or historical price analysis. Date format: YYYY-MM-DD. Uses oracle price data for accurate historical rates.',
    inputSchema: UsdToBtcRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof UsdToBtcRequestSchema>) => {
    logger.info({ tool: 'usd-to-btc', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        value: input.value.toString(),
        on: input.on
      });

      const result = await callSatbase<z.infer<typeof ConversionResponseSchema>>(
        `/v1/convert/usd-to-btc?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'usd-to-btc', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'usd-to-btc', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};

export const btcToUsdTool = {
  name: 'btc-to-usd',
  config: {
    title: 'Convert BTC to USD',
    description: 'Convert Bitcoin (BTC) value to USD using historical exchange rate for a specific date. Returns USD amount equivalent to the BTC value on that date. Essential for crypto valuations, portfolio conversions, or understanding BTC purchasing power historically. Date format: YYYY-MM-DD. Uses oracle price data for accurate historical rates.',
    inputSchema: BtcToUsdRequestSchema.shape,
  },
  handler: async (input: z.infer<typeof BtcToUsdRequestSchema>) => {
    logger.info({ tool: 'btc-to-usd', input }, 'Tool invoked');
    const start = performance.now();

    try {
      const params = new URLSearchParams({
        value: input.value.toString(),
        on: input.on
      });

      const result = await callSatbase<z.infer<typeof ConversionResponseSchema>>(
        `/v1/convert/btc-to-usd?${params.toString()}`
      );

      const duration = performance.now() - start;
      logger.info({ tool: 'btc-to-usd', duration }, 'Tool completed');

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    } catch (error: any) {
      logger.error({ tool: 'btc-to-usd', error }, 'Tool failed');
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
        isError: true
      };
    }
  }
};
