import { z } from 'zod';
import { callAriadne } from '../api-client.js';

function wrap(path: string, name: string, title: string, description: string) {
  return {
    name,
    config: { title, description, inputSchema: z.object({}).shape },
    handler: async () => {
      const res = await callAriadne(path, {}, 8000);
      return { content: [{ type: 'text', text: JSON.stringify(res) }] };
    }
  };
}

export const suggestTickersTool = wrap('/v1/kg/suggestions/tickers', 'ar-suggest-tickers', 'Suggest tickers', 'All tickers present in graph');
export const suggestTopicsTool = wrap('/v1/kg/suggestions/topics', 'ar-suggest-topics', 'Suggest topics', 'Combined topics from sectors, events, concepts, patterns');
export const suggestEventTypesTool = wrap('/v1/kg/suggestions/event-types', 'ar-suggest-event-types', 'Suggest event types', 'All event types');
export const suggestSectorsTool = wrap('/v1/kg/suggestions/sectors', 'ar-suggest-sectors', 'Suggest sectors', 'Company sectors');
export const suggestRelationTypesTool = wrap('/v1/kg/suggestions/relation-types', 'ar-suggest-relation-types', 'Suggest relation types', 'All relationship types');
export const suggestEventNamesTool = wrap('/v1/kg/suggestions/event-names', 'ar-suggest-event-names', 'Suggest event names', 'Event titles');
export const suggestCompanyNamesTool = wrap('/v1/kg/suggestions/company-names', 'ar-suggest-company-names', 'Suggest company names', 'Company names and tickers');
export const suggestPatternCategoriesTool = wrap('/v1/kg/suggestions/pattern-categories', 'ar-suggest-pattern-categories', 'Suggest pattern categories', 'Pattern categories');
export const suggestRegimeNamesTool = wrap('/v1/kg/suggestions/regime-names', 'ar-suggest-regime-names', 'Suggest regime names', 'Regime names');


