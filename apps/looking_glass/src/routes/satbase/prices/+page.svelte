<script lang="ts">
  import { onMount } from 'svelte';
  import { getPricesSingle } from '$lib/api/prices';
  import { getWatchlist, postWatchlist } from '$lib/api/watchlist';
  import CandlestickChart from '$lib/components/charts/CandlestickChart.svelte';
  import type { CandlestickData } from 'lightweight-charts';
  
  let watchlist: Array<{ symbol: string }> = [];
  let selectedTicker: string = '';
  let newTicker: string = '';
  let chartData: CandlestickData[] = [];
  let btcView: boolean = false;
  let loading: boolean = false;
  let err: string | null = null;
  
  const today = new Date().toISOString().slice(0, 10);
  const sixMonthsAgo = new Date(Date.now() - 180 * 86400000).toISOString().slice(0, 10);
  let from = sixMonthsAgo;
  let to = today;
  
  async function loadWatchlist() {
    try {
      const res = await getWatchlist();
      watchlist = res;
      if (watchlist.length > 0 && !selectedTicker) {
        selectedTicker = watchlist[0].symbol;
        await loadChart();
      }
    } catch (e) {
      err = String(e);
    }
  }
  
  async function loadChart() {
    if (!selectedTicker) return;
    loading = true;
    err = null;
    try {
      const res = await getPricesSingle(selectedTicker, from, to, btcView);
      
      // Convert bars to CandlestickData format
      chartData = res.bars
        .map((bar: any) => ({
          time: new Date(bar.date).getTime() / 1000,
          open: bar.open,
          high: bar.high,
          low: bar.low,
          close: bar.close,
        }))
        .sort((a: any, b: any) => a.time - b.time);
    } catch (e) {
      err = String(e);
      chartData = [];
    } finally {
      loading = false;
    }
  }
  
  async function addTicker() {
    if (!newTicker.trim()) return;
    loading = true;
    err = null;
    try {
      await postWatchlist({ symbols: [newTicker.trim().toUpperCase()], ttl_days: 365, ingest: true });
      newTicker = '';
      await loadWatchlist();
    } catch (e) {
      err = String(e);
    } finally {
      loading = false;
    }
  }
  
  function selectTicker(ticker: string) {
    selectedTicker = ticker;
    loadChart();
  }
  
  onMount(loadWatchlist);
  
  $: if (selectedTicker && (from || to || btcView !== undefined)) {
    loadChart();
  }
</script>

<div class="h-screen flex relative">
  <!-- Compact Sidebar -->
  <div class="w-56 flex-shrink-0 bg-neutral-900/50 border-r border-neutral-800 flex flex-col relative z-10">
    <div class="p-3 border-b border-neutral-800">
      <h2 class="text-sm font-semibold text-neutral-300 mb-2">WATCHLIST</h2>
      <div class="flex gap-1">
        <input
          type="text"
          placeholder="Ticker"
          bind:value={newTicker}
          on:keydown={(e) => e.key === 'Enter' && addTicker()}
          class="flex-1 bg-neutral-800 border-0 rounded px-2 py-1 text-xs text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <button
          on:click={addTicker}
          disabled={loading}
          class="px-2 py-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs font-medium"
        >
          +
        </button>
      </div>
    </div>
    
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      {#each watchlist as item}
        <button
          on:click={() => selectTicker(item.symbol)}
          class="w-full text-left px-2 py-1.5 rounded text-sm font-mono transition-colors
            {selectedTicker === item.symbol 
              ? 'bg-blue-600 text-white' 
              : 'bg-neutral-800/50 hover:bg-neutral-800 text-neutral-300'}"
        >
          {item.symbol}
        </button>
      {/each}
    </div>
    
    {#if watchlist.length === 0}
      <div class="text-center py-8 px-4 text-xs text-neutral-600">
        Add tickers above
      </div>
    {/if}
  </div>
  
  <!-- Main Area -->
  <div class="flex-1 flex flex-col p-4 overflow-hidden">
    <!-- Compact Toolbar -->
    <div class="flex items-center gap-3 mb-4 pb-3 border-b border-neutral-800">
      <div class="flex items-center gap-2">
        <span class="text-xs text-neutral-500">From</span>
        <input type="date" bind:value={from} class="bg-neutral-800 border-0 rounded px-2 py-1 text-xs text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      <div class="flex items-center gap-2">
        <span class="text-xs text-neutral-500">To</span>
        <input type="date" bind:value={to} class="bg-neutral-800 border-0 rounded px-2 py-1 text-xs text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500" />
      </div>
      
      <label class="flex items-center gap-2 text-xs cursor-pointer">
        <input type="checkbox" bind:checked={btcView} class="rounded border-neutral-600 bg-neutral-700 text-orange-600 focus:ring-1 focus:ring-orange-500/50" />
        <span class="text-neutral-300">₿ BTC View</span>
      </label>
      
      <button
        on:click={loadChart}
        disabled={loading}
        class="ml-auto px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded text-xs font-medium"
      >
        {loading ? 'Loading...' : 'Refresh'}
      </button>
    </div>
    
    <!-- Error -->
    {#if err}
      <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
        {err}
      </div>
    {/if}
    
    <!-- Chart Container -->
    <div class="flex-1 overflow-hidden">
      {#if loading}
        <div class="h-full flex items-center justify-center">
          <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      {:else if selectedTicker && chartData.length > 0}
        <CandlestickChart data={chartData} ticker={selectedTicker} {btcView} />
      {:else if selectedTicker}
        <div class="h-full flex items-center justify-center text-center">
          <div>
            <svg class="w-12 h-12 text-neutral-600 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <h3 class="text-sm font-semibold text-neutral-300 mb-1">No data available</h3>
            <p class="text-xs text-neutral-500">Adjust date range or wait for fetch</p>
          </div>
        </div>
      {:else}
        <div class="h-full flex items-center justify-center text-center">
          <div>
            <svg class="w-12 h-12 text-neutral-600 mb-3 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
            </svg>
            <h3 class="text-sm font-semibold text-neutral-300 mb-1">Select a ticker</h3>
            <p class="text-xs text-neutral-500">Choose from watchlist or add new</p>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>
