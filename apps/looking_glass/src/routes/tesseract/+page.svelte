<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    semanticSearch,
    findSimilar,
    adminInitCollection,
    adminEmbedBatch,
    adminEmbedStatus,
    adminListCollections,
    adminSwitchCollection,
    type SearchResult,
    type EmbedStatus
  } from '$lib/api/tesseract';
  import NewsCard from '$lib/components/news/NewsCard.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  import StatusIndicator from '$lib/components/tesseract/StatusIndicator.svelte';
  import AdminSidebar from '$lib/components/tesseract/AdminSidebar.svelte';

  // Search State
  let query = '';
  let results: SearchResult[] = [];
  let loading = false;
  let error: string | null = null;

  // Filters
  let showFilters = false;
  let tickers = '';
  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let from = monthAgo;
  let to = today;

  // Admin State
  let adminOpen = false;
  let embedStatus: EmbedStatus | null = null;
  let collections: any = null;
  let statusPollInterval: any = null;

  // Similar Modal
  let showSimilar = false;
  let similarFor: SearchResult | null = null;
  let similarLoading = false;
  let similarItems: SearchResult[] = [];

  async function search() {
    if (!query.trim()) return;

    loading = true;
    error = null;

    try {
      const filters: any = {};
      if (tickers.trim()) {
        filters.tickers = tickers.split(',').map(t => t.trim().toUpperCase());
      }
      if (from) filters.from = from;
      if (to) filters.to = to;

      const response = await semanticSearch(query, filters, 50);
      results = response.results;
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      loading = false;
    }
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') search();
    if (e.key === 'Escape' && (showSimilar || adminOpen)) {
      showSimilar = false;
      adminOpen = false;
    }
  }

  async function loadSimilar(item: SearchResult) {
    showSimilar = true;
    similarFor = item;
    similarLoading = true;
    try {
      const data = await findSimilar(item.id, 5);
      similarItems = data.similar_articles || [];
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    } finally {
      similarLoading = false;
    }
  }

  async function refreshStatus() {
    try {
      embedStatus = await adminEmbedStatus();
    } catch (e) {
      console.error('Failed to refresh status:', e);
    }
  }

  async function refreshCollections() {
    try {
      collections = await adminListCollections();
    } catch (e) {
      console.error('Failed to refresh collections:', e);
    }
  }

  async function handleInitCollection() {
    try {
      await adminInitCollection();
      await refreshStatus();
      await refreshCollections();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleBatchStart(event: CustomEvent) {
    try {
      await adminEmbedBatch(event.detail.from, event.detail.to);
      await refreshStatus();
      // Start polling
      startStatusPolling();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleCollectionSwitch(event: CustomEvent) {
    try {
      await adminSwitchCollection(event.detail.name);
      await refreshStatus();
      await refreshCollections();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  function startStatusPolling() {
    if (statusPollInterval) return;
    statusPollInterval = setInterval(async () => {
      await refreshStatus();
      // Stop polling wenn nicht mehr running
      if (embedStatus && embedStatus.status !== 'running') {
        stopStatusPolling();
      }
    }, 5000);
  }

  function stopStatusPolling() {
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
      statusPollInterval = null;
    }
  }

  onMount(async () => {
    await refreshStatus();
    // Start polling wenn already running
    if (embedStatus && embedStatus.status === 'running') {
      startStatusPolling();
    }
  });

  onDestroy(() => {
    stopStatusPolling();
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-screen flex flex-col overflow-hidden bg-neutral-950">
  <!-- Header -->
  <div class="flex-shrink-0 border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-sm">
    <div class="max-w-6xl w-full mx-auto px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-4">
          <div>
            <h1 class="text-xl font-semibold text-neutral-100">Tesseract</h1>
            <p class="text-xs text-neutral-500 mt-0.5">Semantic Intelligence Layer</p>
          </div>
          {#if embedStatus}
            <StatusIndicator 
              status={embedStatus.status} 
              device={embedStatus.device} 
              percent={embedStatus.percent ?? 0}
            />
          {/if}
        </div>
        <div class="flex items-center gap-3">
          {#if results.length > 0}
            <Badge variant="success">{results.length} results</Badge>
          {/if}
          <Button
            variant="secondary"
            size="sm"
            on:click={() => { adminOpen = true; refreshStatus(); refreshCollections(); }}
          >
            Admin
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Search Section -->
  <div class="flex-shrink-0 bg-neutral-900/30">
    <div class="max-w-6xl w-full mx-auto px-6 py-6">
      <div class="space-y-4">
        <!-- Search Input -->
        <div class="flex gap-2">
          <input
            type="text"
            bind:value={query}
            on:keydown={handleKeydown}
            placeholder="What are you looking for? (e.g., 'semiconductor supply chain constraints')"
            class="flex-1 bg-neutral-800/50 border border-neutral-700/50 rounded-lg px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-transparent transition-all"
          />
          <Button
            variant="primary"
            size="md"
            on:click={search}
            loading={loading}
            classes="px-6"
          >
            Search
          </Button>
        </div>

        <!-- Filters Toggle -->
        <div class="flex items-center gap-2">
          <button
            class="text-xs text-neutral-400 hover:text-neutral-300 transition-colors"
            on:click={() => { showFilters = !showFilters; }}
          >
            {showFilters ? '▼' : '▶'} Filters
          </button>
        </div>

        <!-- Filters -->
        {#if showFilters}
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-neutral-800/30 border border-neutral-700/50 rounded-lg">
            <div>
              <label class="text-xs text-neutral-400 mb-1.5 block">Tickers (optional)</label>
              <input
                type="text"
                bind:value={tickers}
                placeholder="NVDA, AMD, TSM"
                class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label class="text-xs text-neutral-400 mb-1.5 block">From</label>
              <input
                type="date"
                bind:value={from}
                max={today}
                class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
            <div>
              <label class="text-xs text-neutral-400 mb-1.5 block">To</label>
              <input
                type="date"
                bind:value={to}
                max={today}
                class="w-full bg-neutral-800/50 border border-neutral-700/50 rounded px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
              />
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Results Area -->
  <div class="flex-1 overflow-y-auto">
    <div class="max-w-6xl w-full mx-auto px-6 py-6">
      {#if error}
        <div class="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-sm text-red-400 mb-4">
          {error}
        </div>
      {/if}

      {#if loading}
        <div class="flex flex-col items-center justify-center py-16">
          <svg class="animate-spin h-10 w-10 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p class="text-sm text-neutral-400">Searching semantic space...</p>
        </div>
      {:else if results.length > 0}
        <div class="space-y-4">
          {#each results as result}
            <div class="relative group">
              <div class="absolute -top-2 -left-2 z-10">
                <Badge variant="primary" size="sm">
                  {(result.score * 100).toFixed(0)}%
                </Badge>
              </div>
              <div class="transition-all duration-200 hover:-translate-y-0.5">
                <NewsCard item={result} />
              </div>
              <div class="absolute bottom-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="secondary"
                  size="sm"
                  on:click={() => loadSimilar(result)}
                >
                  Similar
                </Button>
              </div>
            </div>
          {/each}
        </div>
      {:else if query}
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <svg class="w-16 h-16 text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-neutral-300 mb-1">No results found</h3>
          <p class="text-sm text-neutral-500">Try adjusting your query or filters</p>
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center py-20 text-center">
          <svg class="w-16 h-16 text-neutral-700 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-lg font-semibold text-neutral-300 mb-1">Start your semantic search</h3>
          <p class="text-sm text-neutral-500 mb-4">Enter a natural language query to find relevant news</p>
          <div class="flex flex-wrap gap-2 justify-center">
            <button 
              class="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors"
              on:click={() => { query = 'semiconductor supply chain'; search(); }}
            >
              semiconductor supply chain
            </button>
            <button 
              class="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors"
              on:click={() => { query = 'NVIDIA AI chips'; search(); }}
            >
              NVIDIA AI chips
            </button>
            <button 
              class="text-xs px-3 py-1.5 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded text-neutral-300 transition-colors"
              on:click={() => { query = 'gold prices market sentiment'; search(); }}
            >
              gold prices market sentiment
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
</div>

<!-- Admin Sidebar -->
<AdminSidebar 
  bind:open={adminOpen}
  {embedStatus}
  {collections}
  activeAlias="news_embeddings"
  on:refreshStatus={refreshStatus}
  on:refreshCollections={refreshCollections}
  on:initCollection={handleInitCollection}
  on:batchStart={handleBatchStart}
  on:collectionSwitch={handleCollectionSwitch}
/>

<!-- Similar Articles Modal -->
{#if showSimilar}
  <div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50" on:click={() => { showSimilar = false; }}>
    <div class="bg-neutral-900 border border-neutral-700 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col" on:click|stopPropagation>
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-800">
        <div class="flex-1 pr-4">
          <div class="text-xs text-neutral-500 mb-1">Similar to</div>
          <div class="text-sm font-medium text-neutral-200 line-clamp-2">{similarFor?.title}</div>
        </div>
        <button 
          class="text-neutral-400 hover:text-neutral-200 text-2xl leading-none flex-shrink-0"
          on:click={() => { showSimilar = false; }}
        >
          ×
        </button>
      </div>
      
      <!-- Modal Content -->
      <div class="flex-1 overflow-y-auto p-4">
        {#if similarLoading}
          <div class="flex items-center justify-center py-8">
            <svg class="animate-spin h-8 w-8 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        {:else if similarItems.length > 0}
          <div class="space-y-3">
            {#each similarItems as item}
              <div class="bg-neutral-800/30 border border-neutral-700/50 rounded-lg p-4 hover:bg-neutral-800/50 transition-colors">
                <div class="flex items-start gap-3">
                  <div class="flex-shrink-0">
                    <Badge variant="primary" size="sm">
                      {(item.score * 100).toFixed(0)}%
                    </Badge>
                  </div>
                  <div class="flex-1 min-w-0">
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      class="text-sm text-neutral-200 hover:text-blue-400 font-medium line-clamp-2 transition-colors"
                    >
                      {item.title}
                    </a>
                    <div class="flex items-center gap-2 mt-2 text-xs text-neutral-500">
                      <span>{item.source}</span>
                      <span>•</span>
                      <span>{new Date(item.published_at).toLocaleDateString()}</span>
                      {#if item.tickers && item.tickers.length > 0}
                        <span>•</span>
                        <span class="font-mono">{item.tickers.join(', ')}</span>
                      {/if}
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <div class="text-center py-8 text-sm text-neutral-500">
            No similar articles found
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}
