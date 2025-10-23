import { getStats, getTickerSuggestions, getTopicSuggestions, getSectorSuggestions, getRelationTypeSuggestions, getEventNameSuggestions, getCompanyNameSuggestions, getPatternCategorySuggestions, getRegimeNameSuggestions } from '$lib/api/ariadne';

// Cache für Suggestions
let tickersCache: string[] | null = null;
let topicsCache: string[] | null = null;
let labelsCache: string[] | null = null;
let relTypesCache: string[] | null = null;
let eventNamesCache: Array<{ name: string; type: string }> | null = null;
let companyNamesCache: Array<{ name: string; ticker: string; sector: string }> | null = null;
let patternCategoriesCache: string[] | null = null;
let regimeNamesCache: string[] | null = null;

/**
 * Lädt alle verfügbaren Tickers aus dem Graph
 */
export async function fetchTickerSuggestions(): Promise<string[]> {
  if (tickersCache) return tickersCache;

  try {
    const response = await getTickerSuggestions();
    tickersCache = response.tickers;
    return tickersCache;
  } catch (e) {
    console.error('Failed to fetch ticker suggestions:', e);
    return [];
  }
}

/**
 * Lädt alle verfügbaren Node-Labels
 */
export async function fetchLabelSuggestions(): Promise<string[]> {
  if (labelsCache) return labelsCache;

  try {
    const stats = await getStats();
    labelsCache = Object.keys(stats.nodes_by_label || {});
    return labelsCache;
  } catch (e) {
    console.error('Failed to fetch label suggestions:', e);
    return ['Company', 'Event', 'Concept', 'Pattern', 'Hypothesis', 'Observation'];
  }
}

/**
 * Lädt alle verfügbaren Relation-Types
 */
export async function fetchRelTypeSuggestions(): Promise<string[]> {
  if (relTypesCache) return relTypesCache;

  try {
    const response = await getRelationTypeSuggestions();
    relTypesCache = response.relation_types;
    return relTypesCache;
  } catch (e) {
    console.error('Failed to fetch rel type suggestions:', e);
    return [];
  }
}

/**
 * Sucht Topics basierend auf Concepts/Events im Graph
 */
export async function fetchTopicSuggestions(query: string): Promise<string[]> {
  if (!topicsCache) {
    try {
      const response = await getTopicSuggestions();
      topicsCache = response.topics;
    } catch (e) {
      console.error('Failed to fetch topic suggestions:', e);
      topicsCache = [];
    }
  }

  if (!query) return topicsCache || [];
  
  return (topicsCache || []).filter(t => 
    t.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Lädt alle Event-Namen
 */
export async function fetchEventNameSuggestions(query: string): Promise<string[]> {
  if (!eventNamesCache) {
    try {
      const response = await getEventNameSuggestions();
      eventNamesCache = response.events;
    } catch (e) {
      console.error('Failed to fetch event name suggestions:', e);
      eventNamesCache = [];
    }
  }

  if (!query) return (eventNamesCache || []).map(e => e.name);
  
  return (eventNamesCache || [])
    .filter(e => e.name.toLowerCase().includes(query.toLowerCase()))
    .map(e => e.name);
}

/**
 * Lädt alle Company-Namen
 */
export async function fetchCompanyNameSuggestions(query: string): Promise<string[]> {
  if (!companyNamesCache) {
    try {
      const response = await getCompanyNameSuggestions();
      companyNamesCache = response.companies;
    } catch (e) {
      console.error('Failed to fetch company name suggestions:', e);
      companyNamesCache = [];
    }
  }

  if (!query) return (companyNamesCache || []).map(c => c.name);
  
  return (companyNamesCache || [])
    .filter(c => 
      c.name.toLowerCase().includes(query.toLowerCase()) ||
      (c.ticker && c.ticker.toLowerCase().includes(query.toLowerCase()))
    )
    .map(c => c.name);
}

/**
 * Lädt alle Pattern-Categories
 */
export async function fetchPatternCategorySuggestions(query: string): Promise<string[]> {
  if (!patternCategoriesCache) {
    try {
      const response = await getPatternCategorySuggestions();
      patternCategoriesCache = response.categories;
    } catch (e) {
      console.error('Failed to fetch pattern category suggestions:', e);
      patternCategoriesCache = [];
    }
  }

  if (!query) return patternCategoriesCache || [];
  
  return (patternCategoriesCache || []).filter(c => 
    c.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Lädt alle Regime-Namen
 */
export async function fetchRegimeNameSuggestions(query: string): Promise<string[]> {
  if (!regimeNamesCache) {
    try {
      const response = await getRegimeNameSuggestions();
      regimeNamesCache = response.regimes;
    } catch (e) {
      console.error('Failed to fetch regime name suggestions:', e);
      regimeNamesCache = [];
    }
  }

  if (!query) return regimeNamesCache || [];
  
  return (regimeNamesCache || []).filter(r => 
    r.toLowerCase().includes(query.toLowerCase())
  );
}

/**
 * Clear all caches
 */
export function clearSuggestionsCache() {
  tickersCache = null;
  topicsCache = null;
  labelsCache = null;
  relTypesCache = null;
  eventNamesCache = null;
  companyNamesCache = null;
  patternCategoriesCache = null;
  regimeNamesCache = null;
}

