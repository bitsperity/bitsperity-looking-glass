<script lang="ts">
  import { onMount } from 'svelte';
  import { getCoverage, getBodyStats, getHeatmap, type CoverageData, type BodyStatsResponse } from '$lib/api/satbase';
  import Card from '$lib/components/shared/Card.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  
  let coverage: CoverageData | null = null;
  let bodyStats: BodyStatsResponse | null = null;
  let heatmapData: any = null;
  let loading = true;
  let error: string | null = null;
  
  // Date filters
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  
  let selectedTopics = 'AI,semiconductor,earnings,market';
  let heatmapGranularity: 'month' | 'year' = 'month';
  let showHeatmap = false;
  
  async function loadData() {
    loading = true;
    error = null;
    try {
      const [cov, stats] = await Promise.all([
        getCoverage(),
        getBodyStats({ from: thirtyDaysAgo, to: today })
      ]);
      coverage = cov;
      bodyStats = stats;
    } catch (e) {
      error = `Failed to load data: ${String(e)}`;
    } finally {
      loading = false;
    }
  }
  
  async function loadHeatmap() {
    try {
      const data = await getHeatmap({
        topics: selectedTopics,
        from: thirtyDaysAgo,
        to: today,
        granularity: heatmapGranularity,
        format: 'flat'
      });
      heatmapData = data;
    } catch (e) {
      error = `Failed to load heatmap: ${String(e)}`;
    }
  }
  
  onMount(() => {
    loadData();
  });
</script>

<div class="space-y-6 p-6 max-w-7xl mx-auto">
  <!-- Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-neutral-100">Data Overview</h1>
      <p class="text-sm text-neutral-400 mt-1">Complete coverage analysis for all data sources</p>
    </div>
    <button
      on:click={loadData}
      disabled={loading}
      class="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white rounded-lg transition-colors"
    >
      {loading ? 'Loading...' : 'Refresh'}
    </button>
  </div>

  {#if error}
    <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400">
      {error}
    </div>
  {/if}

  {#if loading}
    <div class="flex items-center justify-center py-12">
      <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
    </div>
  {:else if coverage}
    <!-- NEWS COVERAGE SECTION -->
    <div class="space-y-4">
      <h2 class="text-xl font-bold text-neutral-100">📰 News Coverage</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <!-- Total Articles -->
        <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-neutral-400">Total Articles</span>
            <span class="text-2xl">📄</span>
          </div>
          <div class="text-3xl font-bold text-neutral-100">
            {(coverage.news.total_articles || 0).toLocaleString()}
          </div>
          <p class="text-xs text-neutral-500 mt-2">across {Object.keys(coverage.news.sources).length} sources</p>
        </div>
        
        <!-- Date Range -->
        <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-neutral-400">Coverage Period</span>
            <span class="text-2xl">📅</span>
          </div>
          <div class="text-xs text-neutral-300 space-y-1 font-mono">
            <div>From: {coverage.news.date_range.from || 'N/A'}</div>
            <div>To: {coverage.news.date_range.to || 'N/A'}</div>
          </div>
        </div>
        
        <!-- Tickers Mentioned -->
        <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-neutral-400">Tickers Mentioned</span>
            <span class="text-2xl">📊</span>
          </div>
          <div class="text-3xl font-bold text-neutral-100">
            {(coverage.news.tickers_mentioned || 0).toLocaleString()}
          </div>
          <p class="text-xs text-neutral-500 mt-2">unique tickers in headlines</p>
        </div>
        
        <!-- Bodies Fetched -->
        <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
          <div class="flex items-center justify-between mb-3">
            <span class="text-sm font-medium text-neutral-400">Bodies Fetched</span>
            <span class="text-2xl">✅</span>
          </div>
          <div class="text-3xl font-bold text-neutral-100">
            {(coverage.news.articles_with_bodies || 0).toLocaleString()}
          </div>
          <p class="text-xs text-neutral-500 mt-2">{bodyStats ? `${bodyStats.coverage_percent}% coverage` : 'N/A'}</p>
        </div>
      </div>
    </div>

    <!-- NEWS SOURCES BREAKDOWN -->
    {#if Object.keys(coverage.news.sources).length > 0}
      <div class="space-y-4">
        <h3 class="text-lg font-bold text-neutral-100">Sources Breakdown</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each Object.entries(coverage.news.sources) as [source, stats]}
            <Card>
              <div class="flex items-center justify-between mb-4">
                <span class="font-semibold text-neutral-200 uppercase tracking-wide text-sm">{source}</span>
                <Badge variant="success" size="sm">{stats.count?.toLocaleString() || 0} articles</Badge>
              </div>
              <div class="text-xs space-y-2 text-neutral-400">
                <div>Earliest: {stats.earliest || 'N/A'}</div>
                <div>Latest: {stats.latest || 'N/A'}</div>
              </div>
            </Card>
          {/each}
        </div>
      </div>
    {/if}

    <!-- PRICES COVERAGE -->
    {#if coverage.prices.ticker_count > 0}
      <div class="space-y-4">
        <h2 class="text-xl font-bold text-neutral-100">💹 Prices Coverage</h2>
        <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-semibold text-neutral-200">{coverage.prices.ticker_count} Tickers</span>
            <Badge variant="success">{coverage.prices.tickers_available.length}</Badge>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {#each coverage.prices.tickers_available.slice(0, 12) as ticker}
              <div class="px-2 py-1 bg-neutral-700/50 rounded text-xs text-center text-neutral-300">
                {ticker}
              </div>
            {/each}
            {#if coverage.prices.tickers_available.length > 12}
              <div class="px-2 py-1 bg-neutral-700/50 rounded text-xs text-center text-neutral-500">
                +{coverage.prices.tickers_available.length - 12} more
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- MACRO/FRED COVERAGE -->
    {#if coverage.macro.series_count > 0}
      <div class="space-y-4">
        <h2 class="text-xl font-bold text-neutral-100">📊 Macro Data (FRED)</h2>
        <div class="bg-gradient-to-br from-neutral-800/80 to-neutral-800/40 border border-neutral-700/50 rounded-xl p-6">
          <div class="flex items-center justify-between mb-4">
            <span class="text-lg font-semibold text-neutral-200">{coverage.macro.series_count} Series</span>
            <Badge variant="success">{coverage.macro.fred_series_available.length}</Badge>
          </div>
          <div class="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {#each coverage.macro.fred_series_available.slice(0, 12) as series}
              <div class="px-2 py-1 bg-neutral-700/50 rounded text-xs text-center text-neutral-300 font-mono">
                {series}
              </div>
            {/each}
            {#if coverage.macro.fred_series_available.length > 12}
              <div class="px-2 py-1 bg-neutral-700/50 rounded text-xs text-center text-neutral-500">
                +{coverage.macro.fred_series_available.length - 12} more
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}

    <!-- HEATMAP SECTION -->
    <div class="space-y-4">
      <div class="flex items-center justify-between">
        <h2 class="text-xl font-bold text-neutral-100">🔥 Topic Coverage Heatmap</h2>
        <button
          on:click={() => {
            showHeatmap = !showHeatmap;
            if (!showHeatmap && !heatmapData) loadHeatmap();
          }}
          class="px-3 py-1 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          {showHeatmap ? 'Hide' : 'Show'}
        </button>
      </div>
      
      {#if showHeatmap}
        <Card>
          <div class="space-y-4">
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label class="block text-sm font-medium text-neutral-300 mb-2">Topics (comma-separated)</label>
                <input
                  type="text"
                  bind:value={selectedTopics}
                  placeholder="AI, semiconductor, earnings"
                  class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100 placeholder-neutral-600"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-neutral-300 mb-2">Granularity</label>
                <select
                  bind:value={heatmapGranularity}
                  class="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded text-sm text-neutral-100"
                >
                  <option value="month">Month</option>
                  <option value="year">Year</option>
                </select>
              </div>
              
              <div class="flex items-end">
                <button
                  on:click={loadHeatmap}
                  class="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors"
                >
                  Generate Heatmap
                </button>
              </div>
            </div>
            
            {#if heatmapData && heatmapData.data && heatmapData.data.length > 0}
              <div class="mt-6">
                <div class="text-xs text-neutral-400 mb-3 font-semibold uppercase tracking-wide">Article Counts by Topic & Period</div>
                <div class="space-y-2">
                  {#each heatmapData.periods as period}
                    <div class="space-y-1">
                      <div class="text-xs font-mono text-neutral-400">{period}</div>
                      <div class="flex gap-2">
                        {#each heatmapData.topics as topic}
                          {@const count = heatmapData.data.find(d => d.period === period && d.topic === topic)?.count || 0}
                          {@const maxCount = Math.max(...heatmapData.data.map(d => d.count))}
                          {@const intensity = count > 0 ? Math.min(100, (count / maxCount) * 100) : 0}
                          <div
                            class="flex-1 px-2 py-1 rounded text-xs font-medium text-center transition-colors"
                            style="background-color: rgba(59, 130, 246, {intensity / 100}); color: {intensity > 40 ? 'white' : '#d1d5db'}"
                          >
                            {count}
                          </div>
                        {/each}
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </Card>
      {/if}
    </div>
  {/if}
</div>

<style>
  :global(body) {
    background-color: #0a0a0a;
  }
</style>
