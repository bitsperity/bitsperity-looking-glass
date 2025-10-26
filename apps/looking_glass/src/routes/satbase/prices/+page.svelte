<script lang="ts">
  import { onMount } from 'svelte';
  import { getPricesSingle, searchTickers, getTickerInfo, getTickerFundamentals, type TickerSearchResult, type TickerInfo, type TickerFundamentals } from '$lib/api/prices';
  import { getWatchlistItems, addWatchlistItems, deleteWatchlistItem, updateWatchlistItem } from '$lib/api/satbase';
  import CandlestickChart from '$lib/components/charts/CandlestickChart.svelte';
  import { ApiError } from '$lib/api/client';
  import type { CandlestickData } from 'lightweight-charts';
  
  let watchlist: Array<{ id: number; key: string; type: string; enabled: boolean; added_at?: string; last_refresh_at?: string; }> = [];
  let selectedTicker: string = '';
  let newTicker: string = '';
  let chartData: CandlestickData[] = [];
  let btcView: boolean = false;
  let loading: boolean = false;
  let err: string | null = null;
  let chartScale: 'linear' | 'log' = 'linear';
  
  // Presets
  let presets: Array<{ label: string; days: number }> = [
    { label: '1M', days: 30 },
    { label: '3M', days: 90 },
    { label: '6M', days: 180 },
    { label: 'YTD', days: getYTDDays() },
    { label: '1Y', days: 365 },
    { label: 'All', days: 10000 },
  ];
  
  function getYTDDays(): number {
    const now = new Date();
    const ytd = new Date(now.getFullYear(), 0, 1);
    return Math.floor((now.getTime() - ytd.getTime()) / (1000 * 60 * 60 * 24));
  }
  
  // Search autocomplete state
  let searchResults: TickerSearchResult[] = [];
  let showDropdown: boolean = false;
  let searchLoading: boolean = false;
  let searchDebounceTimer: number | null = null;
  
  // Company info state
  let tickerInfo: TickerInfo | null = null;
  let tickerFundamentals: TickerFundamentals | null = null;
  let showCompanyInfo: boolean = false;
  let infoLoading: boolean = false;
  
  // Status info
  let tickerStatus: any = null;
  
  // Date range
  let from: string = '';
  let to: string = '';
  
  const today = new Date().toISOString().slice(0, 10);
  
  function applyPreset(days: number) {
    const toDate = new Date();
    const fromDate = new Date(toDate.getTime() - days * 24 * 60 * 60 * 1000);
    to = toDate.toISOString().slice(0, 10);
    from = fromDate.toISOString().slice(0, 10);
    loadChart();
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
  
  async function loadWatchlist() {
    try {
      const items = await getWatchlistItems({ type: 'stock', include_expired: false });
      watchlist = items.items || [];
      if (watchlist.length > 0 && !selectedTicker) {
        selectedTicker = watchlist[0].key.toUpperCase();
        await loadCompanyInfo(watchlist[0].key);
        await loadStatus();
        applyPreset(365); // Default to 1Y
      }
    } catch (e) {
      err = String(e);
    }
  }
  
  let retryCount = 0;
  const MAX_RETRIES = 10;
  let isRetrying = false;
  
  async function loadChart() {
    if (!selectedTicker) return;
    if (isRetrying) return;
    
    loading = true;
    err = null;
    
    try {
      const res = await getPricesSingle(selectedTicker, from, to, btcView);
      
      if (res.bars && res.bars.length > 0) {
        chartData = res.bars
          .map((bar: any) => ({
            time: new Date(bar.date).getTime() / 1000,
            open: bar.open,
            high: bar.high,
            low: bar.low,
            close: bar.close,
          }))
          .sort((a: any, b: any) => a.time - b.time);
        retryCount = 0;
        isRetrying = false;
      } else {
        chartData = [];
        isRetrying = false;
      }
    } catch (e: any) {
      if (e?.message?.includes('202') || e?.status === 202) {
        if (retryCount < MAX_RETRIES) {
          retryCount++;
          isRetrying = true;
          err = `Fetching data for ${selectedTicker}... (${retryCount}/${MAX_RETRIES})`;
          setTimeout(() => {
            if (selectedTicker) {
              isRetrying = false;
              loadChart();
            }
          }, 3000);
        } else {
          err = `Timeout: Data for ${selectedTicker} could not be fetched.`;
          retryCount = 0;
          isRetrying = false;
          chartData = [];
        }
      } else {
        err = String(e);
        retryCount = 0;
        isRetrying = false;
        chartData = [];
      }
    } finally {
      loading = false;
    }
  }
  
  async function loadStatus() {
    if (!selectedTicker) return;
    try {
      const res = await fetch(`http://127.0.0.1:8080/v1/prices/status/${selectedTicker}`);
      if (res.ok) {
        tickerStatus = await res.json();
      }
    } catch (e) {
      console.error('Failed to load status:', e);
    }
  }
  
  async function handleSearchInput() {
    const query = newTicker.trim();
    
    if (!query || query.length < 1) {
      searchResults = [];
      showDropdown = false;
      return;
    }
    
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    searchDebounceTimer = window.setTimeout(async () => {
      searchLoading = true;
      try {
        const result = await searchTickers(query, 10);
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
  
  function selectSearchResult(ticker: TickerSearchResult) {
    newTicker = ticker.symbol;
    searchResults = [];
    showDropdown = false;
    addTicker();
  }
  
  function handleBlur() {
    setTimeout(() => {
      showDropdown = false;
    }, 200);
  }
  
  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !showDropdown) {
      addTicker();
    } else if (e.key === 'Escape') {
      showDropdown = false;
      searchResults = [];
    }
  }
  
  async function addTicker() {
    if (!newTicker.trim()) return;
    const tickerToAdd = newTicker.trim().toUpperCase();
    loading = true;
    err = null;
    try {
      await addWatchlistItems({
        items: [{
          type: 'stock',
          key: tickerToAdd,
          enabled: true,
          auto_ingest: true,
          ttl_days: 365,
        }]
      });
      newTicker = '';
      await loadWatchlist();
      selectedTicker = tickerToAdd;
      retryCount = 0;
      await loadStatus();
      applyPreset(365);
      await loadCompanyInfo(tickerToAdd);
    } catch (e: any) {
      const errMsg = e?.body?.error || e?.message || String(e);
      err = `Error adding ${tickerToAdd}: ${errMsg}`;
    } finally {
      loading = false;
    }
  }
  
  async function loadCompanyInfo(ticker: string) {
    infoLoading = true;
    try {
      const [info, fundamentals] = await Promise.all([
        getTickerInfo(ticker),
        getTickerFundamentals(ticker)
      ]);
      
      if ('error' in info) {
        tickerInfo = null;
      } else {
        tickerInfo = info;
      }
      
      if ('error' in fundamentals) {
        tickerFundamentals = null;
      } else {
        tickerFundamentals = fundamentals;
      }
      
      showCompanyInfo = true;
    } catch (e) {
      console.error("Failed to load company info:", e);
      tickerInfo = null;
      tickerFundamentals = null;
    } finally {
      infoLoading = false;
    }
  }
  
  function selectTicker(ticker: string) {
    selectedTicker = ticker;
    retryCount = 0;
    loadCompanyInfo(ticker);
    loadStatus();
    applyPreset(365);
  }
  
  async function removeTicker(itemId: number, ticker: string) {
    if (!confirm(`Remove ${ticker} from watchlist?`)) return;
    loading = true;
    err = null;
    try {
      await deleteWatchlistItem(itemId);
      await loadWatchlist();
      if (selectedTicker === ticker) {
        selectedTicker = '';
        chartData = [];
        tickerStatus = null;
      }
    } catch (e) {
      err = `Failed to remove ${ticker}: ${String(e)}`;
    } finally {
      loading = false;
    }
  }
  
  onMount(loadWatchlist);
  
  $: {
    const _ = [selectedTicker, from, to, btcView];
    if (selectedTicker) {
      loadChart();
    }
  }
</script>

<div class="h-screen flex flex-col overflow-hidden bg-neutral-950">
  <!-- Header -->
  <div class="flex-shrink-0 p-4 border-b border-neutral-800 bg-neutral-900/50">
    <div class="flex items-center justify-between gap-4">
      <h1 class="text-2xl font-bold text-neutral-100">💹 Prices</h1>
      <div class="flex-1">
        <input
          type="text"
          placeholder="Add ticker (e.g., AAPL, MSFT)..."
          bind:value={newTicker}
          on:input={handleSearchInput}
          on:keydown={handleKeydown}
          on:blur={handleBlur}
          disabled={loading}
          class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 transition-all"
        />
        
        {#if showDropdown && searchResults.length > 0}
          <div class="absolute z-50 mt-1 w-96 bg-neutral-800 border border-neutral-700 rounded-lg shadow-xl max-h-80 overflow-y-auto">
            {#each searchResults as result}
              <button
                on:click={() => selectSearchResult(result)}
                class="w-full text-left px-4 py-2 hover:bg-neutral-700/50 transition-colors border-b border-neutral-700/30 last:border-b-0"
              >
                <div class="flex items-center justify-between">
                  <span class="font-semibold text-blue-400 font-mono">{result.symbol}</span>
                  <span class="text-xs text-neutral-500">{result.exchange}</span>
                </div>
                <div class="text-xs text-neutral-300 line-clamp-1">{result.name}</div>
              </button>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <div class="flex-1 flex overflow-hidden">
    <!-- Watchlist Sidebar -->
    <div class="w-64 flex-shrink-0 bg-neutral-900/50 border-r border-neutral-800 flex flex-col overflow-hidden">
      <div class="flex-1 overflow-y-auto p-3 space-y-1">
        <div class="px-2 py-1 text-xs font-semibold text-neutral-500 uppercase">Watchlist ({watchlist.length})</div>
        {#each watchlist as item (item.id)}
          <button
            on:click={() => selectTicker(item.key)}
            class="w-full text-left px-3 py-2 rounded-lg text-sm font-mono transition-colors group flex items-center justify-between
              {selectedTicker === item.key 
                ? 'bg-blue-600 text-white' 
                : 'bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300'}"
          >
            <span>{item.key}</span>
            <button
              on:click|stopPropagation={() => removeTicker(item.id, item.key)}
              class="opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-400 transition-all"
            >
              ✕
            </button>
          </button>
        {/each}
      </div>
      
      {#if watchlist.length === 0}
        <div class="p-4 text-center text-xs text-neutral-600">
          Add tickers to begin
        </div>
      {/if}
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="flex-shrink-0 p-4 border-b border-neutral-800 bg-neutral-900/30 space-y-3">
        <!-- Chart Presets -->
        <div class="flex items-center gap-2">
          <span class="text-xs text-neutral-500">Range:</span>
          {#each presets as preset}
            <button
              on:click={() => applyPreset(preset.days)}
              class="px-3 py-1.5 text-xs rounded-lg font-medium transition-colors
                {from && preset.label === '1M' || (preset.label === '1Y' && !from)
                  ? 'bg-blue-600 text-white'
                  : 'bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300'}"
            >
              {preset.label}
            </button>
          {/each}
        </div>

        <!-- Options -->
        <div class="flex items-center gap-4">
          <label class="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" bind:checked={btcView} class="rounded" />
            <span class="text-neutral-300">₿ BTC View</span>
          </label>

          <label class="flex items-center gap-2 cursor-pointer text-xs">
            <input type="checkbox" bind:checked={chartScale} value="log" class="rounded" />
            <span class="text-neutral-300">Log Scale</span>
          </label>

          {#if tickerStatus}
            <div class="ml-auto flex items-center gap-3 text-xs">
              <div class="flex items-center gap-1">
                <span class="text-neutral-500">Last Update:</span>
                <span class="text-neutral-300 font-mono">{formatDateDiff(tickerStatus.latest_date)}</span>
              </div>
              <div class="flex items-center gap-1">
                <span class="text-neutral-500">Source:</span>
                <span class="px-2 py-1 rounded bg-neutral-800/50 text-neutral-300">{tickerStatus.source || 'N/A'}</span>
              </div>
              {#if tickerStatus.invalid}
                <div class="px-2 py-1 rounded bg-red-500/20 text-red-400">Invalid</div>
              {/if}
            </div>
          {/if}

          <button
            on:click={() => loadChart()}
            disabled={loading}
            class="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs font-medium"
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      <!-- Error Message -->
      {#if err}
        <div class="mx-4 mt-2 bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-sm text-blue-300 flex items-center gap-2 flex-shrink-0">
          {#if err.includes('Fetching')}
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          {/if}
          <span>{err}</span>
        </div>
      {/if}

      <!-- Chart Container -->
      <div class="flex-1 min-h-0 overflow-hidden p-4">
        {#if loading}
          <div class="h-full flex items-center justify-center">
            <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {:else if selectedTicker && chartData.length > 0}
          <div class="h-full bg-neutral-900/50 rounded-lg border border-neutral-800/50">
            <CandlestickChart data={chartData} ticker={selectedTicker} {btcView} />
          </div>
        {:else if selectedTicker}
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <svg class="w-12 h-12 text-neutral-600 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <h3 class="text-sm font-semibold text-neutral-300 mb-1">No data available</h3>
              <p class="text-xs text-neutral-500">Adjust date range or wait for fetch</p>
            </div>
          </div>
        {:else}
          <div class="h-full flex items-center justify-center">
            <div class="text-center">
              <svg class="w-12 h-12 text-neutral-600 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <h3 class="text-sm font-semibold text-neutral-300 mb-1">Select a ticker</h3>
              <p class="text-xs text-neutral-500">Choose from watchlist or add new</p>
            </div>
          </div>
        {/if}
      </div>

      <!-- Company Info Card -->
      {#if selectedTicker && (tickerInfo || tickerFundamentals)}
        <div class="flex-shrink-0 p-4 border-t border-neutral-800">
          <button
            on:click={() => showCompanyInfo = !showCompanyInfo}
            class="w-full p-3 flex items-center justify-between hover:bg-neutral-800/50 transition-colors rounded-lg"
          >
            <div class="flex items-center gap-3">
              <svg class="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div class="text-left">
                <h3 class="text-sm font-semibold text-neutral-100">{tickerInfo?.name || selectedTicker}</h3>
                {#if tickerInfo?.sector}
                  <p class="text-xs text-neutral-400">{tickerInfo.sector}</p>
                {/if}
              </div>
            </div>
            <svg class="w-5 h-5 text-neutral-500 transition-transform {showCompanyInfo ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {#if showCompanyInfo && (tickerInfo || tickerFundamentals)}
            <div class="mt-4 p-4 bg-neutral-800/30 rounded-lg space-y-4 max-h-60 overflow-y-auto">
              {#if tickerInfo?.description}
                <div>
                  <h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">About</h4>
                  <p class="text-xs text-neutral-300 leading-relaxed line-clamp-3">{tickerInfo.description}</p>
                </div>
              {/if}
              
              {#if tickerFundamentals}
                <div>
                  <h4 class="text-xs font-semibold text-neutral-400 uppercase tracking-wide mb-2">Key Metrics</h4>
                  <div class="grid grid-cols-2 md:grid-cols-4 gap-2">
                    {#if tickerFundamentals.market_cap}
                      <div class="bg-neutral-900/50 rounded p-2">
                        <div class="text-xs text-neutral-500">Market Cap</div>
                        <div class="text-sm font-semibold text-neutral-100">${(tickerFundamentals.market_cap / 1e9).toFixed(2)}B</div>
                      </div>
                    {/if}
                    {#if tickerFundamentals.pe_ratio}
                      <div class="bg-neutral-900/50 rounded p-2">
                        <div class="text-xs text-neutral-500">P/E</div>
                        <div class="text-sm font-semibold text-neutral-100">{tickerFundamentals.pe_ratio.toFixed(2)}</div>
                      </div>
                    {/if}
                    {#if tickerFundamentals.dividend_yield}
                      <div class="bg-neutral-900/50 rounded p-2">
                        <div class="text-xs text-neutral-500">Div Yield</div>
                        <div class="text-sm font-semibold text-neutral-100">{(tickerFundamentals.dividend_yield * 100).toFixed(2)}%</div>
                      </div>
                    {/if}
                    {#if tickerFundamentals.beta}
                      <div class="bg-neutral-900/50 rounded p-2">
                        <div class="text-xs text-neutral-500">Beta</div>
                        <div class="text-sm font-semibold text-neutral-100">{tickerFundamentals.beta.toFixed(2)}</div>
                      </div>
                    {/if}
                  </div>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
    </div>
  </div>
</div>

<style lang="postcss">
  :global(body) {
    @apply bg-neutral-950 text-neutral-100;
  }
</style>
