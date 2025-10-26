import { writable, type Writable } from 'svelte/store';
import * as satbaseApi from '$lib/api/satbase';
import type { CoverageData } from '$lib/api/satbase';

// Cache interface
interface CacheEntry<T> {
  data: T | null;
  timestamp: number;
  ttl: number; // milliseconds
}

// In-memory cache stores
export const coverageCache: Writable<CacheEntry<CoverageData>> = writable({
  data: null,
  timestamp: 0,
  ttl: 5 * 60 * 1000 // 5 minutes
});

/**
 * Check if cache entry is stale
 */
export function isCacheStale<T>(cache: CacheEntry<T>): boolean {
  if (cache.data === null) return true;
  return Date.now() - cache.timestamp > cache.ttl;
}

/**
 * Get cached coverage data with TTL validation
 * 
 * If cache is fresh: returns instantly from memory
 * If cache is stale: returns fresh data from backend
 * If forceRefresh: bypasses cache entirely
 */
export async function getCachedCoverage(
  forceRefresh = false
): Promise<CoverageData> {
  let currentCache: CacheEntry<CoverageData> | undefined;
  const unsubscribe = coverageCache.subscribe(c => {
    currentCache = c;
  });
  unsubscribe();

  // Return fresh data if force refresh
  if (forceRefresh) {
    const data = await satbaseApi.getCoverageCached(true);
    coverageCache.set({
      data,
      timestamp: Date.now(),
      ttl: 5 * 60 * 1000
    });
    return data;
  }

  // Check cache
  if (
    currentCache?.data &&
    !isCacheStale(currentCache)
  ) {
    return currentCache.data;
  }

  // Fetch fresh data
  const data = await satbaseApi.getCoverageCached();
  coverageCache.set({
    data,
    timestamp: Date.now(),
    ttl: 5 * 60 * 1000
  });

  return data;
}

/**
 * Get cache refresh time (seconds until stale)
 */
export function getCacheRefreshTimeRemaining(): number {
  let cache: CacheEntry<CoverageData> | undefined;
  const unsubscribe = coverageCache.subscribe(c => {
    cache = c;
  });
  unsubscribe();

  if (!cache?.data) return 0;

  const remaining = cache.ttl - (Date.now() - cache.timestamp);
  return Math.max(0, Math.ceil(remaining / 1000));
}

/**
 * Invalidate cache (force next fetch to be fresh)
 */
export function invalidateCache() {
  coverageCache.set({
    data: null,
    timestamp: 0,
    ttl: 5 * 60 * 1000
  });
}
