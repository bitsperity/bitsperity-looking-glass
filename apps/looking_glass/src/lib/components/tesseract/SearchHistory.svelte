<script lang="ts">
  import { onMount } from 'svelte';
  import { getSearchHistory, getSearchStats, type SearchHistoryEntry, type SearchStatsResponse } from '$lib/api/tesseract';
  import Badge from '$lib/components/shared/Badge.svelte';

  let history: SearchHistoryEntry[] = [];
  let stats: SearchStatsResponse | null = null;
  let loading = false;
  let error: string | null = null;
  let showStats = false;
  let daysFilter = 7;
  let queryFilter = '';

  onMount(() => {
    loadHistory();
    loadStats();
  });

  async function loadHistory() {
    loading = true;
    error = null;
    try {
      const response = await getSearchHistory(20, queryFilter || undefined, daysFilter);
      history = response.history;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  async function loadStats() {
    try {
      stats = await getSearchStats(30);
    } catch (e) {
      console.error('Failed to load stats:', e);
    }
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' });
  }

  function formatFilters(filters: Record<string, unknown> | null | undefined): string {
    if (!filters || Object.keys(filters).length === 0) return '';
    const parts: string[] = [];
    if (filters.tickers) parts.push(`${Array.isArray(filters.tickers) ? filters.tickers.join(', ') : filters.tickers}`);
    if (filters.topics) parts.push(`${Array.isArray(filters.topics) ? filters.topics.join(', ') : filters.topics}`);
    return parts.join(' | ');
  }

  function handleQueryClick(query: string) {
    window.dispatchEvent(new CustomEvent('tesseract-history-query', { detail: { query } }));
  }

  $: if (daysFilter) loadHistory();
</script>

<div class="search-history-bar">
  <div class="history-header">
    <div class="header-left">
      <span class="history-label">Recent</span>
      {#if stats}
        <span class="stats-badge">{stats.total_searches} searches</span>
      {/if}
    </div>
    <div class="header-right">
      <select bind:value={daysFilter} class="time-filter">
        <option value={1}>24h</option>
        <option value={7}>7d</option>
        <option value={30}>30d</option>
        <option value={0}>All</option>
      </select>
    </div>
  </div>

  {#if loading}
    <div class="history-loading">Loading...</div>
  {:else if error}
    <div class="history-error">{error}</div>
  {:else if history.length === 0}
    <div class="history-empty">No searches yet</div>
  {:else}
    <div class="history-scroll">
      <div class="history-items">
        {#each history as entry (entry.id)}
          <button
            class="history-chip"
            class:has-results={entry.result_count > 0}
            class:no-results={entry.result_count === 0}
            on:click={() => handleQueryClick(entry.query)}
            title={entry.query}
          >
            <span class="chip-query">{entry.query}</span>
            {#if entry.filters && Object.keys(entry.filters).length > 0}
              <span class="chip-filters">{formatFilters(entry.filters)}</span>
            {/if}
            <div class="chip-meta">
              {#if entry.result_count > 0}
                <Badge variant="success" size="sm">{entry.result_count}</Badge>
              {:else}
                <Badge variant="warning" size="sm">0</Badge>
              {/if}
              <span class="chip-time">{formatTime(entry.created_at)}</span>
            </div>
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .search-history-bar {
    background: linear-gradient(to bottom, rgba(23, 23, 23, 0.6), rgba(10, 10, 10, 0.4));
    border-top: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    padding: 0.75rem 1rem;
  }

  .history-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .header-left {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .history-label {
    font-size: 0.7rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: rgba(255, 255, 255, 0.5);
  }

  .stats-badge {
    font-size: 0.7rem;
    color: rgba(255, 255, 255, 0.4);
    padding: 0.125rem 0.375rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
  }

  .header-right {
    display: flex;
    align-items: center;
  }

  .time-filter {
    padding: 0.25rem 0.5rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.7rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .time-filter:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(255, 255, 255, 0.15);
  }

  .time-filter:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.5);
    box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
  }

  .history-scroll {
    overflow-x: auto;
    overflow-y: hidden;
    scrollbar-width: thin;
    scrollbar-color: rgba(255, 255, 255, 0.2) transparent;
    -webkit-overflow-scrolling: touch;
  }

  .history-scroll::-webkit-scrollbar {
    height: 4px;
  }

  .history-scroll::-webkit-scrollbar-track {
    background: transparent;
  }

  .history-scroll::-webkit-scrollbar-thumb {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 2px;
  }

  .history-scroll::-webkit-scrollbar-thumb:hover {
    background: rgba(255, 255, 255, 0.3);
  }

  .history-items {
    display: flex;
    gap: 0.5rem;
    padding-bottom: 0.25rem;
  }

  .history-chip {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.5rem 0.75rem;
    background: linear-gradient(to bottom, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    white-space: nowrap;
    min-width: fit-content;
    position: relative;
    overflow: hidden;
  }

  .history-chip::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: linear-gradient(to right, transparent, rgba(59, 130, 246, 0.5), transparent);
    opacity: 0;
    transition: opacity 0.2s;
  }

  .history-chip.has-results {
    border-color: rgba(34, 197, 94, 0.3);
  }

  .history-chip.has-results:hover {
    background: linear-gradient(to bottom, rgba(34, 197, 94, 0.15), rgba(34, 197, 94, 0.08));
    border-color: rgba(34, 197, 94, 0.5);
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(34, 197, 94, 0.2);
  }

  .history-chip.has-results:hover::before {
    opacity: 1;
    background: linear-gradient(to right, transparent, rgba(34, 197, 94, 0.8), transparent);
  }

  .history-chip.no-results {
    border-color: rgba(251, 146, 60, 0.2);
    opacity: 0.7;
  }

  .history-chip.no-results:hover {
    background: linear-gradient(to bottom, rgba(251, 146, 60, 0.1), rgba(251, 146, 60, 0.05));
    border-color: rgba(251, 146, 60, 0.4);
    opacity: 1;
  }

  .chip-query {
    font-size: 0.8rem;
    font-weight: 500;
    color: rgba(255, 255, 255, 0.9);
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-filters {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.5);
    font-weight: 400;
    max-width: 200px;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .chip-meta {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.125rem;
  }

  .chip-time {
    font-size: 0.65rem;
    color: rgba(255, 255, 255, 0.4);
    font-weight: 400;
  }

  .history-loading,
  .history-error,
  .history-empty {
    text-align: center;
    padding: 0.75rem;
    font-size: 0.75rem;
    color: rgba(255, 255, 255, 0.5);
  }

  .history-error {
    color: rgba(239, 68, 68, 0.8);
  }
</style>
