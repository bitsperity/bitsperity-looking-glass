<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    search,
    findSimilar,
    initCollection,
    embedBatch,
    getEmbedStatus,
    listCollections,
    switchCollection,
    type SearchResult,
    type JobStatus,
    type OverallStatus,
    type EmbedJobRequest
  } from '$lib/api/tesseract';
  import NewsCard from '$lib/components/news/NewsCard.svelte';
  import Button from '$lib/components/shared/Button.svelte';
  import Badge from '$lib/components/shared/Badge.svelte';
  import StatusIndicator from '$lib/components/tesseract/StatusIndicator.svelte';
  import AdminSidebar from '$lib/components/tesseract/AdminSidebar.svelte';
  import KnowledgeGraph from '$lib/components/tesseract/KnowledgeGraph.svelte';

  // Tab State
  let activeTab: 'search' | 'graph' = 'search';
  let graphArticle: SearchResult | null = null;

  // Search State
  let query = '';
  let results: SearchResult[] = [];
  let loading = false;
  let error: string | null = null;
  let searchTimeout: any = null;

  // Filters
  let showFilters = false;
  let topics = '';
  let tickers = '';
  let language = '';
  let bodyOnly: boolean = true;

  const today = new Date().toISOString().slice(0, 10);
  const monthAgo = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  let fromDate = monthAgo;
  let toDate = today;

  // Admin State
  let adminOpen = false;
  let embedStatus: JobStatus | OverallStatus | null = null;
  let collections: any = null;
  let activeAlias: string = 'news_embeddings';
  let statusPollInterval: any = null;
  let currentJobId: string | null = null;

  // Similar Modal
  let showSimilar = false;
  let similarFor: SearchResult | null = null;
  let similarLoading = false;
  let similarItems: SearchResult[] = [];

  async function performSearch() {
    if (!query.trim()) return;

    loading = true;
    error = null;

    try {
      const filters: any = {};
      
      if (topics.trim()) {
        filters.topics = topics.split(',').map(t => t.trim());
      }
      if (tickers.trim()) {
        filters.tickers = tickers.split(',').map(t => t.trim().toUpperCase());
      }
      if (language.trim()) {
        filters.language = language.trim();
      }
      // Only add body_available filter if user explicitly sets it AND it's true
      // Default behavior: show all articles regardless of body availability
      // if (bodyOnly === true || bodyOnly === 'true') {
      //   filters.body_available = true;
      // }

      const response = await search(query, filters, 50);
      results = response.results;
    } catch (e) {
      if (e instanceof Error && e.name !== 'AbortError') {
        error = e.message || String(e);
      }
    } finally {
      loading = false;
    }
  }

  function debouncedSearch() {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(performSearch, 250);
  }

  function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      clearTimeout(searchTimeout);
      performSearch();
    }
    if (e.key === 'Escape' && (showSimilar || adminOpen)) {
      showSimilar = false;
      adminOpen = false;
    }
  }

  async function loadSimilar(item: SearchResult) {
    // Switch to graph tab and set the article
    graphArticle = item;
    activeTab = 'graph';
  }

  async function refreshStatus() {
    try {
      embedStatus = await getEmbedStatus(currentJobId || undefined);
    } catch (e) {
      console.error('Failed to refresh status:', e);
    }
  }

  async function refreshCollections() {
    try {
      collections = await listCollections();
    } catch (e) {
      console.error('Failed to refresh collections:', e);
    }
  }

  async function handleInitCollection() {
    try {
      await initCollection();
      await refreshStatus();
      await refreshCollections();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleBatchStart(event: CustomEvent) {
    try {
      const request: EmbedJobRequest = {
        from_date: event.detail.from,
        to_date: event.detail.to,
        body_only: event.detail.body_only ?? true,
        incremental: event.detail.incremental ?? true
      };
      const response = await embedBatch(request);
      currentJobId = response.job_id;
      await refreshStatus();
      startStatusPolling();
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
    }
  }

  async function handleCollectionSwitch(event: CustomEvent) {
    try {
      await switchCollection(event.detail.name);
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
      // Stop polling when not running and clear job id
      if (embedStatus && 'status' in embedStatus && embedStatus.status !== 'running') {
        stopStatusPolling();
        currentJobId = null;
      }
    }, 2000);
  }

  function stopStatusPolling() {
    if (statusPollInterval) {
      clearInterval(statusPollInterval);
      statusPollInterval = null;
    }
  }

  onMount(async () => {
    await refreshStatus();
    if (embedStatus && 'status' in embedStatus && embedStatus.status === 'running') {
      startStatusPolling();
    }
  });

  onDestroy(() => {
    stopStatusPolling();
    clearTimeout(searchTimeout);
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div class="h-screen flex flex-col overflow-hidden bg-gradient-to-br from-neutral-950 via-neutral-900 to-neutral-950">
  <!-- Header -->
  <div class="flex-shrink-0 border-b border-neutral-700/20 bg-gradient-to-b from-neutral-900/80 to-neutral-950/60 backdrop-blur-lg shadow-lg">
    <div class="max-w-6xl w-full mx-auto px-6 py-5">
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div>
            <h1 class="text-2xl font-bold bg-gradient-to-r from-blue-400 via-blue-300 to-purple-400 bg-clip-text text-transparent">Tesseract</h1>
            <p class="text-xs text-neutral-400 mt-1">Semantic Intelligence Layer</p>
          </div>
          {#if embedStatus}
            {#if 'status' in embedStatus}
              <StatusIndicator 
                status={embedStatus.status} 
                device={undefined} 
                percent={embedStatus.percent}
              />
            {/if}
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
            class="transition-all duration-200 hover:shadow-lg hover:shadow-blue-500/20"
          >
            Admin
          </Button>
        </div>
      </div>
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex-shrink-0 border-b border-neutral-700/20">
    <div class="max-w-6xl w-full mx-auto px-6">
      <div class="flex gap-1">
        <button
          class="px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2 {activeTab === 'search' ? 'text-blue-400 border-blue-500' : 'text-neutral-400 border-transparent hover:text-neutral-200'}"
          on:click={() => activeTab = 'search'}
        >
          Search
        </button>
        <button
          class="px-6 py-3 text-sm font-semibold transition-all duration-200 border-b-2 {activeTab === 'graph' ? 'text-purple-400 border-purple-500' : 'text-neutral-400 border-transparent hover:text-neutral-200'}"
          on:click={() => activeTab = 'graph'}
        >
          Knowledge Graph
        </button>
      </div>
    </div>
  </div>

  <!-- Search Section -->
  {#if activeTab === 'search'}
  <div class="flex-shrink-0 bg-gradient-to-b from-neutral-900/40 to-neutral-950/40 backdrop-blur-sm border-b border-neutral-700/10">
    <div class="max-w-6xl w-full mx-auto px-6 py-6">
      <div class="space-y-4">
        <!-- Search Input -->
        <div class="flex gap-3">
          <input
            type="text"
            bind:value={query}
            on:keydown={handleKeydown}
            placeholder="What are you looking for? (e.g., 'semiconductor supply chain constraints')"
            class="flex-1 bg-gradient-to-b from-neutral-800/60 to-neutral-900/40 border border-neutral-600/30 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 backdrop-blur-sm shadow-lg shadow-neutral-950/50 hover:border-neutral-500/50"
          />
          <Button
            variant="primary"
            size="md"
            on:click={debouncedSearch}
            loading={loading}
            class="px-8 shadow-lg shadow-blue-500/20 hover:shadow-blue-500/40 transition-all duration-200"
          >
            Search
          </Button>
        </div>

        <!-- Filters Toggle -->
        <div class="flex items-center gap-2">
          <button
            class="text-xs text-neutral-400 hover:text-blue-400 transition-colors duration-200 font-medium"
            on:click={() => { showFilters = !showFilters; }}
          >
            {showFilters ? '▼' : '▶'} Filters
          </button>
        </div>

        <!-- Filters -->
        {#if showFilters}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 p-4 bg-gradient-to-br from-neutral-800/40 to-neutral-900/30 border border-neutral-600/20 rounded-xl backdrop-blur-lg shadow-lg shadow-neutral-950/50">
            <div>
              <label for="topics" class="text-xs text-neutral-300 mb-2 block font-semibold">Topics</label>
              <input
                id="topics"
                type="text"
                bind:value={topics}
                placeholder="AI, Technology"
                class="w-full bg-neutral-800/50 border border-neutral-600/30 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>
            <div>
              <label for="tickers" class="text-xs text-neutral-300 mb-2 block font-semibold">Tickers</label>
              <input
                id="tickers"
                type="text"
                bind:value={tickers}
                placeholder="NVDA, AMD"
                class="w-full bg-neutral-800/50 border border-neutral-600/30 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>
            <div>
              <label for="language" class="text-xs text-neutral-300 mb-2 block font-semibold">Language</label>
              <input
                id="language"
                type="text"
                bind:value={language}
                placeholder="en, de"
                class="w-full bg-neutral-800/50 border border-neutral-600/30 rounded-lg px-3 py-2 text-sm text-neutral-100 placeholder:text-neutral-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>
            <div>
              <label for="bodyOnly" class="text-xs text-neutral-300 mb-2 block font-semibold">Body Only</label>
              <select
                id="bodyOnly"
                bind:value={bodyOnly}
                on:change={(e) => bodyOnly = e.target.value === 'true'}
                class="w-full bg-neutral-800/50 border border-neutral-600/30 rounded-lg px-3 py-2 text-sm text-neutral-100 focus:outline-none focus:ring-1 focus:ring-blue-500/50 focus:border-blue-500/30 transition-all duration-200 backdrop-blur-sm"
              >
                <option value="true">Yes</option>
                <option value="false">No</option>
              </select>
            </div>
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Results Area -->
  <div class="flex-1 overflow-y-auto scrollbar-thin scrollbar-track-neutral-900 scrollbar-thumb-neutral-700">
    <div class="max-w-6xl w-full mx-auto px-6 py-6">
      {#if error}
        <div class="bg-gradient-to-r from-red-500/20 to-red-600/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-300 mb-4 backdrop-blur-sm shadow-lg shadow-red-950/20">
          {error}
        </div>
      {/if}

      {#if loading}
        <div class="flex flex-col items-center justify-center py-20">
          <div class="relative w-12 h-12 mb-4">
            <div class="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full animate-pulse opacity-25"></div>
            <svg class="animate-spin h-12 w-12 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p class="text-sm text-neutral-300 font-medium">Searching semantic space...</p>
        </div>
      {:else if results.length > 0}
        <div class="space-y-3">
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
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-red-500/10 to-red-600/5 flex items-center justify-center mb-6 border border-red-500/20">
            <svg class="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-neutral-200 mb-2">No results found</h3>
          <p class="text-sm text-neutral-400">Try adjusting your query or filters</p>
        </div>
      {:else}
        <div class="flex flex-col items-center justify-center py-24 text-center">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500/10 to-purple-500/5 flex items-center justify-center mb-6 border border-blue-500/20">
            <svg class="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 16l2.879-2.879m0 0a3 3 0 104.243-4.242 3 3 0 00-4.243 4.242zM21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-neutral-200 mb-1">Start your semantic search</h3>
          <p class="text-sm text-neutral-400 mb-6">Enter a natural language query to find relevant news</p>
          <div class="flex flex-wrap gap-2 justify-center">
            <button 
              class="text-xs px-4 py-2 bg-gradient-to-r from-blue-500/20 to-blue-600/10 hover:from-blue-500/30 hover:to-blue-600/20 border border-blue-500/30 rounded-lg text-blue-300 transition-all duration-200 font-medium backdrop-blur-sm hover:shadow-lg hover:shadow-blue-500/10"
              on:click={() => { query = 'semiconductor supply chain'; debouncedSearch(); }}
            >
              semiconductor supply chain
            </button>
            <button 
              class="text-xs px-4 py-2 bg-gradient-to-r from-purple-500/20 to-purple-600/10 hover:from-purple-500/30 hover:to-purple-600/20 border border-purple-500/30 rounded-lg text-purple-300 transition-all duration-200 font-medium backdrop-blur-sm hover:shadow-lg hover:shadow-purple-500/10"
              on:click={() => { query = 'NVIDIA AI chips'; debouncedSearch(); }}
            >
              NVIDIA AI chips
            </button>
            <button 
              class="text-xs px-4 py-2 bg-gradient-to-r from-amber-500/20 to-amber-600/10 hover:from-amber-500/30 hover:to-amber-600/20 border border-amber-500/30 rounded-lg text-amber-300 transition-all duration-200 font-medium backdrop-blur-sm hover:shadow-lg hover:shadow-amber-500/10"
              on:click={() => { query = 'gold prices market sentiment'; debouncedSearch(); }}
            >
              gold prices market sentiment
            </button>
          </div>
        </div>
      {/if}
    </div>
  </div>
  {:else}
  <!-- Knowledge Graph Tab -->
  <div class="flex-1 overflow-hidden">
    {#if graphArticle}
      <KnowledgeGraph initialArticle={graphArticle} />
    {:else}
      <div class="flex items-center justify-center h-full">
        <div class="text-center">
          <div class="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/10 to-purple-600/5 flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
            <svg class="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
          </div>
          <h3 class="text-lg font-semibold text-neutral-200 mb-2">No article selected</h3>
          <p class="text-sm text-neutral-400 mb-6">Click "Similar" on any search result to explore connections</p>
          <Button
            variant="primary"
            size="md"
            on:click={() => activeTab = 'search'}
          >
            Go to Search
          </Button>
        </div>
      </div>
    {/if}
  </div>
  {/if}
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
  <button
    type="button"
    class="fixed inset-0 bg-black/60 z-50"
    on:click={() => { showSimilar = false; }}
    aria-label="Close similar articles modal"
  ></button>
  <div class="fixed inset-0 flex items-center justify-center z-50" role="dialog" aria-modal="true">
    <div class="bg-neutral-900 border border-neutral-700 rounded-lg max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col" on:click|stopPropagation>
      <!-- Modal Header -->
      <div class="flex items-center justify-between p-4 border-b border-neutral-800">
        <div class="flex-1 pr-4">
          <div class="text-xs text-neutral-500 mb-1">Similar to</div>
          <div class="text-sm font-medium text-neutral-200 line-clamp-2">{similarFor?.title}</div>
        </div>
        <button 
          type="button"
          aria-label="Close similar articles"
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
