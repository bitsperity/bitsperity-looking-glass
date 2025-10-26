<script lang="ts">
  import { onMount } from 'svelte';
  import { getSeries, searchFredSeries, getSeriesStatus, getCategories, ingestSeries, type FredSeries } from '$lib/api/macro';
  import { getWatchlistItems, addWatchlistItems, deleteWatchlistItem, updateWatchlistItem } from '$lib/api/satbase';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import Card from '$lib/components/shared/Card.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  // Data state
  let selectedSeries: string = 'CPIAUCSL';
  let activeSeries: Set<string> = new Set(['CPIAUCSL']);
  let seriesData: Map<string, Array<{ date: string; value: number; series_id: string }>> = new Map();
  let seriesStatus: Map<string, any> = new Map();
  let loading: Set<string> = new Set();
  let errors: Map<string, string> = new Map();
  
  // Categories & Search
  let categories: any[] = [];
  let categoriesLoading: boolean = false;
  let searchResults: FredSeries[] = [];
  let showDropdown: boolean = false;
  let searchLoading: boolean = false;
  let searchQuery: string = '';
  let searchDebounceTimer: number | null = null;
  let selectedCategory: string = 'All'; // New state for category selection
  
  // Watchlist
  let watchlistMacro: any[] = [];
  let watchlistLoading: boolean = false;
  
  // Date range
  const today = new Date().toISOString().slice(0, 10);
  const oneYearAgo = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
  let from: string = oneYearAgo;
  let to: string = today;
  
  // Color mapping for series
  const seriesColors: Record<string, string> = {
    'CPIAUCSL': '#FF6B6B',
    'UNRATE': '#4ECDC4',
    'GDP': '#45B7D1',
    'FEDFUNDS': '#FFA07A',
    'DGS10': '#98D8C8',
    'DEXUSEU': '#F7DC6F',
    'PCEPI': '#BB8FCE',
    'CPILFESL': '#85C1E2'
  };
  
  function getSeriesColor(seriesId: string): string {
    if (seriesColors[seriesId]) return seriesColors[seriesId];
    const hash = seriesId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const colors = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E2'];
    return colors[hash % colors.length];
  }
  
  function formatDateDiff(dateStr: string | null): string {
    if (!dateStr) return 'N/A';
    const then = new Date(dateStr).getTime();
    const now = new Date().getTime();
    const days = Math.floor((now - then) / (1000 * 60 * 60 * 24));
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return `${Math.floor(days / 30)} months ago`;
  }
  
  async function loadCategories() {
    categoriesLoading = true;
    try {
      const res = await getCategories();
      categories = res.categories || [];
    } catch (e) {
      console.error('Failed to load categories:', e);
      categories = [];
    } finally {
      categoriesLoading = false;
    }
  }
  
  async function loadWatchlist() {
    watchlistLoading = true;
    try {
      const res = await getWatchlistItems({ type: 'macro', enabled: true });
      watchlistMacro = res.items || [];
    } catch (e) {
      console.error('Failed to load watchlist:', e);
      watchlistMacro = [];
    } finally {
      watchlistLoading = false;
    }
  }
  
  async function loadSeries(seriesId: string) {
    loading = new Set([...loading, seriesId]);
    errors.delete(seriesId);
    
    try {
      const result = await getSeries(seriesId, from, to);
      seriesData.set(seriesId, result.items || []);
      seriesData = new Map(seriesData);
      
      // Load status
      const status = await getSeriesStatus(seriesId);
      seriesStatus.set(seriesId, status);
      seriesStatus = new Map(seriesStatus);
    } catch (e: any) {
      errors.set(seriesId, String(e));
    } finally {
      loading.delete(seriesId);
      loading = new Set(loading);
    }
  }
  
  function selectSeries(seriesId: string) {
    selectedSeries = seriesId;
    if (!activeSeries.has(seriesId)) {
      activeSeries.add(seriesId);
      activeSeries = new Set(activeSeries);
      loadSeries(seriesId);
    }
  }
  
  function toggleSeries(seriesId: string) {
    if (activeSeries.has(seriesId)) {
      activeSeries.delete(seriesId);
      seriesData.delete(seriesId);
    } else {
      activeSeries.add(seriesId);
      loadSeries(seriesId);
    }
    activeSeries = new Set(activeSeries);
    seriesData = new Map(seriesData);
  }
  
  async function addToWatchlist() {
    if (!selectedSeries) return;
    try {
      const status = seriesStatus.get(selectedSeries);
      await addWatchlistItems({
        items: [{
          type: 'macro',
          key: selectedSeries,
          label: status?.title || selectedSeries,
          enabled: true,
          auto_ingest: true,
          ttl_days: 365
        }]
      });
      await loadWatchlist();
    } catch (e) {
      console.error('Failed to add to watchlist:', e);
    }
  }
  
  async function removeFromWatchlist(itemId: number) {
    try {
      await deleteWatchlistItem(itemId);
      await loadWatchlist();
    } catch (e) {
      console.error('Failed to remove from watchlist:', e);
    }
  }
  
  async function refetchData() {
    if (!selectedSeries) return;
    loading = new Set([...loading, selectedSeries]);
    try {
      // Always fetch ALL data (no date range)
      await ingestSeries([selectedSeries]);
      // Wait for background ingestion
      await new Promise(r => setTimeout(r, 2000));
      await loadSeries(selectedSeries);
    } catch (e) {
      console.error('Failed to refetch:', e);
    } finally {
      loading.delete(selectedSeries);
      loading = new Set(loading);
    }
  }
  
  async function handleSearchInput() {
    const query = searchQuery.trim();
    if (!query || query.length < 2) {
      searchResults = [];
      showDropdown = false;
      return;
    }
    
    if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
    searchDebounceTimer = window.setTimeout(async () => {
      searchLoading = true;
      try {
        const result = await searchFredSeries(query, 10);
        searchResults = result.results || [];
        showDropdown = searchResults.length > 0;
      } catch (e) {
        searchResults = [];
        showDropdown = false;
      } finally {
        searchLoading = false;
      }
    }, 300);
  }
  
  function selectSearchResult(series: FredSeries) {
    selectSeries(series.id);
    searchQuery = '';
    searchResults = [];
    showDropdown = false;
  }
  
  $: chartData = Array.from(activeSeries).flatMap(seriesId => {
    const items = seriesData.get(seriesId) || [];
    return items.map(item => ({
      time: item.date,
      value: item.value,
      series: seriesId
    }));
  });
  
  // Filter series by selected category
  $: filteredSeries = selectedCategory === 'All' 
    ? categories.flatMap(c => c.series)
    : categories.find(c => c.name === selectedCategory)?.series || [];

  onMount(async () => {
    await loadCategories();
    await loadWatchlist();
    if (selectedSeries) {
      await loadSeries(selectedSeries);
    }
  });
</script>

<div class="fixed inset-0 flex flex-col overflow-hidden bg-neutral-950">
  <!-- Header -->
  <div class="flex-shrink-0 p-3 border-b border-neutral-800 bg-neutral-900/50">
    <div class="flex items-center justify-between">
      <h1 class="text-xl font-bold text-neutral-100">📊 Macro (FRED)</h1>
      <div class="flex items-center gap-2">
        <Badge variant="secondary">{activeSeries.size} series</Badge>
        <Badge variant="secondary">{chartData.length} points</Badge>
      </div>
    </div>
  </div>

  <!-- Search -->
  <div class="flex-shrink-0 px-4 py-2 border-b border-neutral-800 bg-neutral-900/30 relative z-10">
    <div class="flex gap-2">
      <input
        type="text"
        placeholder="Search FRED series..."
        bind:value={searchQuery}
        on:input={handleSearchInput}
        on:blur={() => setTimeout(() => showDropdown = false, 200)}
        class="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
      />
    </div>
    
    {#if showDropdown && searchResults.length > 0}
      <div class="absolute z-50 top-full left-4 right-4 mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-48 overflow-y-auto">
        {#each searchResults as series}
          <button
            on:click={() => selectSearchResult(series)}
            class="w-full text-left px-4 py-3 hover:bg-neutral-700/50 transition-colors border-b border-neutral-700/30 last:border-b-0"
          >
            <div class="flex items-center justify-between gap-2">
              <div>
                <div class="font-semibold text-sm text-blue-400 font-mono">{series.id}</div>
                <div class="text-xs text-neutral-400 line-clamp-1">{series.title}</div>
              </div>
              <div class="text-xs text-neutral-500">★{series.popularity}</div>
            </div>
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Category selector -->
  <div class="flex-shrink-0 px-4 py-1.5 border-b border-neutral-800 bg-neutral-900/30">
    <div class="flex gap-1 flex-wrap">
      {#each categories as category}
        <button
          on:click={() => { selectedCategory = category.name; }}
          class="px-2 py-0.5 text-xs font-semibold rounded-full transition-colors whitespace-nowrap {selectedCategory === category.name ? 'bg-blue-600 text-white' : 'bg-neutral-800/50 text-neutral-400 hover:bg-neutral-800'}"
        >
          {category.name}
        </button>
      {/each}
    </div>
  </div>

  <!-- Main content (2 columns) - fixed height -->
  <div class="flex-1 flex overflow-hidden gap-3 p-3 min-h-0">
    <!-- Center: Chart -->
    <div class="flex-1 bg-neutral-900/50 border border-neutral-800 rounded-lg p-4 flex flex-col overflow-hidden min-h-0">
      {#if chartData.length > 0}
        <LineChart
          data={chartData}
          title={`${Array.from(activeSeries).join(', ')}`}
          yLabel="Value"
          height="100%"
        />
      {:else if activeSeries.size === 0}
        <div class="flex flex-col items-center justify-center h-full text-center gap-4">
          <div>
            <div class="text-neutral-600 mb-2 text-4xl">📊</div>
            <div class="text-sm text-neutral-400">Select series to display</div>
          </div>
          <div class="text-xs text-neutral-600 max-w-xs">
            Browse categories above or search for FRED series to add them to the chart
          </div>
        </div>
      {:else}
        <div class="flex items-center justify-center h-full text-center">
          <div>
            <div class="text-neutral-600 mb-2">⏳</div>
            <div class="text-sm text-neutral-400">Loading data...</div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Right: Status, Series List & Actions -->
    <div class="w-80 flex-shrink-0 flex flex-col gap-2 overflow-hidden min-h-0">
      <!-- Status Card -->
      {#if selectedSeries && seriesStatus.get(selectedSeries)}
        {@const status = seriesStatus.get(selectedSeries)}
        <div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0">
          <div class="text-xs">
            <div class="text-neutral-500 uppercase text-xs font-semibold">Selected</div>
            <div class="font-mono text-sm font-bold text-blue-400 mt-0.5">{selectedSeries}</div>
            <div class="text-xs text-neutral-500 mt-0.5 line-clamp-2">{status.title}</div>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs">
            <div class="bg-neutral-800/30 p-2 rounded">
              <div class="text-neutral-600 text-xs">Latest</div>
              <div class="font-semibold text-neutral-100 text-sm">{status.latest_value?.toFixed(2) || 'N/A'}</div>
              <div class="text-neutral-600 text-xs">{formatDateDiff(status.latest_date)}</div>
            </div>
            <div class="bg-neutral-800/30 p-2 rounded">
              <div class="text-neutral-600 text-xs">Obs</div>
              <div class="font-semibold text-neutral-100 text-sm">{status.observation_count}</div>
              <div class="text-neutral-600 text-xs">{status.frequency}</div>
            </div>
          </div>
          
          <div class="bg-neutral-800/20 p-2 rounded text-xs line-clamp-2">
            <div class="text-neutral-600 text-xs">Units</div>
            <div class="text-neutral-300 text-xs">{status.units || 'N/A'}</div>
          </div>
        </div>
      {/if}

      <!-- Series List for selected category -->
      {#if filteredSeries.length > 0}
        <div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0 overflow-hidden flex-1 min-h-0 flex flex-col">
          <div class="text-xs font-semibold text-neutral-400 uppercase">Series</div>
          <div class="space-y-1 overflow-y-auto flex-1 min-h-0">
            {#each filteredSeries as series}
              <button
                on:click={() => toggleSeries(series.id)}
                class="w-full text-left px-2 py-1.5 text-xs rounded transition-colors {activeSeries.has(series.id) ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'hover:bg-neutral-800/50 text-neutral-400 border border-transparent'}"
              >
                <div class="flex items-center justify-between gap-2">
                  <span class="font-mono truncate flex-1">{series.id}</span>
                  {#if series.available}
                    <span class="text-xs text-neutral-500 flex-shrink-0">{series.observations}</span>
                  {:else}
                    <span class="text-xs text-red-500 flex-shrink-0">—</span>
                  {/if}
                </div>
                {#if series.latest_value !== null}
                  <div class="text-xs text-neutral-500 truncate">{series.latest_value.toFixed(2)}</div>
                {/if}
              </button>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Actions -->
      <div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0">
        <button
          on:click={addToWatchlist}
          disabled={!selectedSeries || watchlistMacro.some(w => w.key === selectedSeries)}
          class="w-full text-sm font-semibold px-3 py-2 rounded transition-all disabled:opacity-50 disabled:cursor-not-allowed {watchlistMacro.some(w => w.key === selectedSeries) ? 'bg-blue-600/20 text-blue-300 border border-blue-500/30' : 'bg-blue-600 hover:bg-blue-700 text-white border border-blue-700'}"
        >
          ⭐ {watchlistMacro.some(w => w.key === selectedSeries) ? 'In List' : 'Add'}
        </button>
        
        <button
          on:click={refetchData}
          disabled={loading.has(selectedSeries)}
          class="w-full text-sm font-semibold px-3 py-2 rounded transition-all disabled:opacity-50 bg-neutral-700 hover:bg-neutral-600 text-white border border-neutral-600"
        >
          {loading.has(selectedSeries) ? '⏳ Fetch...' : '⬇️ Refetch'}
        </button>
      </div>

      <!-- Watchlist -->
      {#if watchlistMacro.length > 0}
        <div class="bg-neutral-900/50 border border-neutral-800 rounded-lg p-3 space-y-2 flex-shrink-0 flex flex-col overflow-hidden max-h-40">
          <div class="text-xs font-semibold text-neutral-400 uppercase">Watchlist</div>
          <div class="space-y-1 overflow-y-auto flex-1 min-h-0">
            {#each watchlistMacro as item}
              <div class="flex items-center justify-between gap-1 p-1.5 bg-neutral-800/30 rounded group hover:bg-neutral-800/50 transition-colors">
                <button
                  on:click={() => selectSeries(item.key)}
                  class="flex-1 text-left min-w-0"
                >
                  <div class="font-mono text-xs font-semibold text-blue-400 truncate">{item.key}</div>
                  <div class="text-xs text-neutral-500 line-clamp-1">{item.label}</div>
                </button>
                <button
                  on:click={() => removeFromWatchlist(item.id)}
                  class="text-neutral-500 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 flex-shrink-0 text-xs font-bold"
                >
                  ✕
                </button>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <!-- Errors -->
      {#if errors.size > 0}
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-3 space-y-1 flex-shrink-0 overflow-hidden max-h-32">
          <div class="overflow-y-auto flex-1 min-h-0 space-y-1">
            {#each Array.from(errors.entries()) as [seriesId, error]}
              <div class="text-xs">
                <div class="font-semibold text-red-400 truncate">{seriesId}</div>
                <div class="text-red-300/80 text-xs line-clamp-2">{error}</div>
              </div>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
