<script lang="ts">
  import { onMount } from 'svelte';
  import { getSeries, searchFredSeries, type FredSeries } from '$lib/api/macro';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import Card from '$lib/components/shared/Card.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Input from '$lib/components/shared/Input.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  // Preset series IDs with descriptions
  const PRESETS = [
    { id: 'CPIAUCSL', name: 'CPI (Inflation)', description: 'Consumer Price Index' },
    { id: 'UNRATE', name: 'Unemployment', description: 'Unemployment Rate %' },
    { id: 'GDP', name: 'GDP', description: 'Gross Domestic Product' },
    { id: 'FEDFUNDS', name: 'Fed Funds Rate', description: 'Federal Funds Rate %' },
    { id: 'DGS10', name: '10Y Treasury', description: '10-Year Treasury Yield %' },
    { id: 'DEXUSEU', name: 'USD/EUR', description: 'US Dollar to Euro Exchange Rate' },
  ];
  
  let activeSeries: Set<string> = new Set(['CPIAUCSL']);
  let customSeriesId: string = '';
  let seriesData: Map<string, Array<{ date: string; value: number; series_id: string }>> = new Map();
  let loading: Set<string> = new Set();
  let errors: Map<string, string> = new Map();
  
  // Autocomplete state
  let searchResults: FredSeries[] = [];
  let showDropdown: boolean = false;
  let searchLoading: boolean = false;
  let searchDebounceTimer: number | null = null;
  
  const today = new Date().toISOString().slice(0, 10);
  const fiveYearsAgo = new Date(Date.now() - 5 * 365 * 86400000).toISOString().slice(0, 10);
  let from: string = fiveYearsAgo;
  let to: string = today;
  
  async function loadSeries(seriesId: string) {
    loading = new Set([...loading, seriesId]);
    errors.delete(seriesId);
    errors = new Map(errors);
    
    try {
      const result = await getSeries(seriesId, from, to);
      seriesData.set(seriesId, result.items);
      seriesData = new Map(seriesData);
    } catch (e: any) {
      errors.set(seriesId, String(e));
      errors = new Map(errors);
      seriesData.delete(seriesId);
      seriesData = new Map(seriesData);
    } finally {
      loading.delete(seriesId);
      loading = new Set(loading);
    }
  }
  
  function toggleSeries(seriesId: string) {
    if (activeSeries.has(seriesId)) {
      activeSeries.delete(seriesId);
      activeSeries = new Set(activeSeries);
      seriesData.delete(seriesId);
      seriesData = new Map(seriesData);
    } else {
      activeSeries.add(seriesId);
      activeSeries = new Set(activeSeries);
      loadSeries(seriesId);
    }
  }
  
  async function handleSearchInput() {
    const query = customSeriesId.trim();
    
    if (!query || query.length < 2) {
      searchResults = [];
      showDropdown = false;
      return;
    }
    
    // Debounce search
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    searchDebounceTimer = window.setTimeout(async () => {
      searchLoading = true;
      try {
        const result = await searchFredSeries(query, 10);
        if (result.error) {
          searchResults = [];
        } else {
          searchResults = result.results;
        }
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
    customSeriesId = series.id;
    searchResults = [];
    showDropdown = false;
    addCustomSeries();
  }
  
  function addCustomSeries() {
    const id = customSeriesId.trim().toUpperCase();
    if (!id || activeSeries.has(id)) return;
    activeSeries.add(id);
    activeSeries = new Set(activeSeries);
    loadSeries(id);
    customSeriesId = '';
    searchResults = [];
    showDropdown = false;
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !showDropdown) {
      addCustomSeries();
    } else if (e.key === 'Escape') {
      showDropdown = false;
      searchResults = [];
    }
  }
  
  function handleBlur() {
    // Delay to allow click on dropdown item
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }
  
  function refreshAll() {
    for (const id of activeSeries) {
      loadSeries(id);
    }
  }
  
  // Convert to chart format
  $: chartData = Array.from(seriesData.entries()).flatMap(([seriesId, items]) =>
    items.map(item => ({
      time: item.date,
      value: item.value,
      series: PRESETS.find(p => p.id === seriesId)?.name || seriesId
    }))
  );
  
  $: totalDataPoints = Array.from(seriesData.values()).reduce((sum, items) => sum + items.length, 0);
  
  onMount(() => {
    for (const id of activeSeries) {
      loadSeries(id);
    }
  });
</script>

<div class="max-w-7xl mx-auto space-y-6">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-neutral-100">Macroeconomic Indicators</h1>
      <p class="text-sm text-neutral-400 mt-1">FRED Economic Data Series</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant={activeSeries.size > 0 ? 'success' : 'secondary'}>
        {activeSeries.size} series
      </Badge>
      <Badge variant="secondary">{totalDataPoints} points</Badge>
    </div>
  </div>
  
  <!-- Filters & Controls -->
  <Card classes="relative z-20 overflow-visible">
    <div class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Input label="From" type="date" bind:value={from} max={today} />
        <Input label="To" type="date" bind:value={to} max={today} />
        <div class="flex items-end">
          <Button variant="primary" size="md" on:click={refreshAll} loading={loading.size > 0} disabled={activeSeries.size === 0}>
            {loading.size > 0 ? 'Loading...' : 'Refresh All'}
          </Button>
        </div>
      </div>
      
      <div class="pt-4 border-t border-neutral-700/50">
        <label class="text-xs font-medium text-neutral-400 uppercase tracking-wide mb-2 block">
          Search & Add Series
        </label>
        <div class="relative">
          <div class="flex gap-2">
            <input
              type="text"
              placeholder="Search FRED series (e.g., inflation, GDP, unemployment)"
              bind:value={customSeriesId}
              on:input={handleSearchInput}
              on:keydown={handleKeydown}
              on:blur={handleBlur}
              class="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
            <button
              on:click={addCustomSeries}
              disabled={!customSeriesId.trim() || searchLoading}
              class="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-white font-semibold text-lg transition-all"
            >
              {#if searchLoading}
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else}
                +
              {/if}
            </button>
          </div>
          
          <!-- Autocomplete Dropdown -->
          {#if showDropdown && searchResults.length > 0}
            <div class="absolute z-50 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
              {#each searchResults as series}
                <button
                  on:click={() => selectSearchResult(series)}
                  class="w-full text-left px-4 py-3 hover:bg-neutral-700/50 transition-colors border-b border-neutral-700/30 last:border-b-0"
                >
                  <div class="flex items-start justify-between gap-3">
                    <div class="flex-1 min-w-0">
                      <div class="flex items-center gap-2">
                        <span class="font-semibold text-sm text-blue-400 font-mono">{series.id}</span>
                        <Badge variant="secondary" size="sm">{series.frequency}</Badge>
                      </div>
                      <div class="text-xs text-neutral-300 mt-1 line-clamp-2">{series.title}</div>
                      {#if series.units}
                        <div class="text-xs text-neutral-500 mt-0.5">{series.units}</div>
                      {/if}
                    </div>
                    <div class="text-xs text-neutral-500 flex-shrink-0">
                      ★ {series.popularity}
                    </div>
                  </div>
                </button>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  </Card>
  
  <!-- Preset Series Selection -->
  <Card>
    <div class="space-y-3">
      <h3 class="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Popular Series</h3>
      <div class="grid grid-cols-2 md:grid-cols-3 gap-3">
        {#each PRESETS as preset}
          <button
            on:click={() => toggleSeries(preset.id)}
            class="text-left p-3 rounded-lg border transition-all {activeSeries.has(preset.id)
              ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
              : 'bg-neutral-800/30 border-neutral-700/30 text-neutral-300 hover:bg-neutral-800/50 hover:border-neutral-600/50'}"
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate">{preset.name}</div>
                <div class="text-xs text-neutral-500 mt-0.5 truncate">{preset.description}</div>
              </div>
              {#if loading.has(preset.id)}
                <svg class="animate-spin h-4 w-4 ml-2 flex-shrink-0" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              {:else if activeSeries.has(preset.id)}
                <svg class="h-5 w-5 ml-2 flex-shrink-0 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                </svg>
              {/if}
            </div>
          </button>
        {/each}
      </div>
    </div>
  </Card>
  
  <!-- Active Custom Series -->
  {#if Array.from(activeSeries).some(id => !PRESETS.find(p => p.id === id))}
    <Card>
      <div class="space-y-3">
        <h3 class="text-sm font-semibold text-neutral-300 uppercase tracking-wide">Custom Series</h3>
        <div class="flex flex-wrap gap-2">
          {#each Array.from(activeSeries).filter(id => !PRESETS.find(p => p.id === id)) as seriesId}
            <div class="flex items-center gap-2 px-3 py-1.5 bg-neutral-800/50 border border-neutral-700/50 rounded-lg">
              <span class="text-sm font-mono text-neutral-300">{seriesId}</span>
              <button
                on:click={() => toggleSeries(seriesId)}
                class="text-neutral-500 hover:text-red-400 transition-colors"
                title="Remove {seriesId}"
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      </div>
    </Card>
  {/if}
  
  <!-- Errors -->
  {#if errors.size > 0}
    <Card>
      <div class="space-y-2">
        {#each Array.from(errors.entries()) as [seriesId, error]}
          <div class="flex items-start gap-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <svg class="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <div class="flex-1 min-w-0">
              <div class="text-sm font-semibold text-red-300">{seriesId}</div>
              <div class="text-xs text-red-400/80 mt-0.5">{error}</div>
            </div>
          </div>
        {/each}
      </div>
    </Card>
  {/if}
  
  <!-- Chart -->
  {#if chartData.length > 0}
    <Card padding="p-6">
      <LineChart
        data={chartData}
        title="Economic Indicators Time Series"
        yLabel="Value"
        height="500px"
      />
    </Card>
  {:else if activeSeries.size === 0}
    <Card>
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <svg class="w-16 h-16 text-neutral-600 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <h3 class="text-lg font-semibold text-neutral-300 mb-1">No series selected</h3>
        <p class="text-sm text-neutral-500">Select a series from the popular list or add a custom FRED series ID</p>
      </div>
    </Card>
  {:else if loading.size > 0}
    <Card>
      <div class="flex items-center justify-center py-12">
        <div class="flex flex-col items-center gap-3">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-neutral-400">Loading economic data...</p>
        </div>
      </div>
    </Card>
  {/if}
</div>
